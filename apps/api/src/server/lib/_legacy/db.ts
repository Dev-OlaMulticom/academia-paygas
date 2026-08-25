/**
 * Data Access Layer (DAL) — Multi-Database with Failover
 *
 * Architecture:
 *   Reads:  Primary PG → fallback to any healthy PG
 *   Writes: Primary PG first (authoritative). If primary is unreachable,
 *           promotes the next healthy backup to primary and retries there.
 *           Fire-and-forget to remaining backups after a successful write.
 *
 * KEY RULE: No backup write ever blocks the main operation.
 * If a backup is down, data is saved to primary and synced later.
 *
 * Failover on writes:
 *   When the primary throws a connection error (ENETUNREACH, ECONNREFUSED,
 *   timeout, etc.), the DAL marks it as disconnected in the registry,
 *   invalidates the delegate cache, and retries the write on the next
 *   healthy backup. This provides automatic failover without waiting for
 *   the health-check worker (which may take up to 60s).
 *
 * Backup availability alerts:
 *   When MYSQL_URL / NHOST_URL are not configured, the DAL silently skips that
 *   tier. We surface a startup warning so we don't end up with a "working"
 *   stack that quietly has no third-tier redundancy.
 *
 * Usage:
 *   import { db } from '../lib/db'
 *   const user = await db.findUnique('user', { id: '123' })
 *   await db.create('user', { email, nome, senha })
 */

import { dbRegistry } from "../config/databases";
import { getModelDelegates, invalidateDelegateCache } from "./db-models";
import logger from "./logger";
import { prisma } from "./prisma";

/**
 * One-time startup banner that warns when optional multi-database tiers are not
 * configured. We never throw — these are optional — but operators get a clear
 * signal instead of silent degradation.
 */
let warnedStartup = false;
function warnAboutMissingBackups(): void {
	if (warnedStartup) return;
	warnedStartup = true;

	const pgCount = dbRegistry.getAll().length;
	if (pgCount === 1) {
		logger.warn("[DAL] Only ONE PostgreSQL registered. Set PG_URL_2 (or higher) to enable read failover.");
	}

	if (!process.env.MYSQL_URL) {
		logger.warn(
			"[DAL] MYSQL_URL is not set. MySQL tier is skipped — every third-tier dual-write is silently dropped. " +
				"Set MYSQL_URL to enable MySQL backup writes.",
		);
	}

	if (!process.env.NHOST_URL && pgCount === 0) {
		logger.warn("[DAL] NHOST_URL is not set and no PG_URL_* are configured. Legacy Nhost fallback is unavailable.");
	}
}

// Run once when the module is first loaded; cheap and idempotent.
warnAboutMissingBackups();

function getModel(name: string) {
	try {
		return getModelDelegates(name);
	} catch (error: any) {
		throw new Error(`[DB] Unknown model: "${name}". ${error.message}`);
	}
}

/**
 * Fire-and-forget write to a backup database.
 * Never blocks the main operation. Errors are logged only.
 */
function fireAndForget(backupName: string, operation: string, modelName: string, promise: Promise<any>): void {
	promise.catch((error) => {
		logger.warn(`[DUAL-WRITE] ${backupName} ${operation} failed on ${modelName}:`, error?.message || error);
	});
}

/**
 * Detect if an error is a connection-level failure (not a Prisma validation
 * error). Used to decide whether to failover to a backup or surface the error
 * to the caller.
 */
function isConnectionError(error: any): boolean {
	const msg = String(error?.message || error?.code || error || "");
	// Network-level: ENETUNREACH, ECONNREFUSED, ECONNRESET, ETIMEDOUT, EHOSTUNREACH
	// Prisma-level: P1001 (can't reach), P1002 (timed out), P1003 (not found)
	return (
		msg.includes("ENETUNREACH") ||
		msg.includes("ECONNREFUSED") ||
		msg.includes("ECONNRESET") ||
		msg.includes("ETIMEDOUT") ||
		msg.includes("EHOSTUNREACH") ||
		msg.includes("P1001") ||
		msg.includes("P1002") ||
		msg.includes("Can't reach database server") ||
		msg.includes("connect ENOTFOUND") ||
		msg.includes("pool timeout")
	);
}

/**
 * Mark a database as disconnected in the registry and invalidate the delegate
 * cache so subsequent operations route to a healthy backup. Called when the
 * DAL detects a connection error on the primary.
 *
 * IMPORTANT: Only mark the DB that actually failed. Do NOT blindly mark
 * "whatever getPrimary() returns" because after a cache invalidation the
 * primary may have already changed to a healthy backup.
 */
function markPrimaryDown(error: any): void {
	const primary = dbRegistry.getPrimary();
	if (!primary) return;

	// Only mark as disconnected if it's still "unknown" or "connected".
	// If it's already "disconnected", another operation already flagged it.
	if (primary.status === "disconnected") return;

	logger.warn(`[DAL-FAILOVER] Primary ${primary.name} unreachable: ${error?.message || error?.code || "unknown"}`);
	dbRegistry.setStatus(primary.name, "disconnected", String(error?.message || error?.code || "connection error"));
	invalidateDelegateCache();
}

export const db = {
	// ==================== CREATE ====================

	async create(modelName: string, data: Record<string, any>) {
		let model = getModel(modelName);

		// Authoritative write — must succeed. If primary is unreachable,
		// mark it down, invalidate cache, and retry on the next healthy backup.
		let result: any;
		try {
			result = await model.primary.create({ data });
		} catch (error: any) {
			if (isConnectionError(error) && model.backups.length > 0) {
				markPrimaryDown(error);
				// Re-resolve delegates — cache was invalidated, so the new
				// primary is the first healthy backup.
				model = getModel(modelName);
				result = await model.primary.create({ data });
			} else {
				throw error;
			}
		}

		// Fire-and-forget to all PG backups — never block
		for (let i = 0; i < model.backups.length; i++) {
			fireAndForget(`PG_${i + 2}`, "create", modelName, model.backups[i].create({ data }));
		}

		// Fire-and-forget to MySQL — never block
		if (model.mysql) {
			fireAndForget("MySQL", "create", modelName, model.mysql.create({ data }));
		}

		return result;
	},

	async createMany(modelName: string, data: Record<string, any>[]) {
		let model = getModel(modelName);

		let result: any;
		try {
			result = await model.primary.createMany({ data });
		} catch (error: any) {
			if (isConnectionError(error) && model.backups.length > 0) {
				markPrimaryDown(error);
				model = getModel(modelName);
				result = await model.primary.createMany({ data });
			} else {
				throw error;
			}
		}

		for (let i = 0; i < model.backups.length; i++) {
			fireAndForget(`PG_${i + 2}`, "createMany", modelName, model.backups[i].createMany({ data }));
		}

		if (model.mysql) {
			fireAndForget("MySQL", "createMany", modelName, model.mysql.createMany({ data }));
		}

		return result;
	},

	// ==================== READ (with failover) ====================

	async findUnique(
		modelName: string,
		where: Record<string, any>,
		opts?: { include?: Record<string, any>; select?: Record<string, any> },
	) {
		const model = getModel(modelName);
		const prismaOpts: Record<string, any> = { where };
		if (opts?.include) prismaOpts.include = opts.include;
		if (opts?.select) prismaOpts.select = opts.select;

		try {
			return await model.primary.findUnique(prismaOpts);
		} catch (error) {
			// Failover to backup PGs — don't mark primary down here to avoid
			// race conditions with concurrent reads (markPrimaryDown is only
			// called from write paths where we need to re-resolve the primary).
			for (const backup of model.backups) {
				try {
					return await backup.findUnique(prismaOpts);
				} catch {
					/* try next */
				}
			}
			throw error;
		}
	},

	async findFirst(
		modelName: string,
		where: Record<string, any>,
		opts?: { include?: Record<string, any>; select?: Record<string, any>; orderBy?: Record<string, any> },
	) {
		const model = getModel(modelName);
		const prismaOpts: Record<string, any> = { where };
		if (opts?.include) prismaOpts.include = opts.include;
		if (opts?.select) prismaOpts.select = opts.select;
		if (opts?.orderBy) prismaOpts.orderBy = opts.orderBy;

		try {
			return await model.primary.findFirst(prismaOpts);
		} catch (error) {
			for (const backup of model.backups) {
				try {
					return await backup.findFirst(prismaOpts);
				} catch {
					/* try next */
				}
			}
			throw error;
		}
	},

	async findMany(
		modelName: string,
		options: {
			where?: Record<string, any>;
			include?: Record<string, any>;
			select?: Record<string, any>;
			orderBy?: Record<string, any>;
			skip?: number;
			take?: number;
		} = {},
	) {
		const model = getModel(modelName);

		try {
			return await model.primary.findMany(options);
		} catch (error) {
			for (const backup of model.backups) {
				try {
					return await backup.findMany(options);
				} catch {
					/* try next */
				}
			}
			throw error;
		}
	},

	async count(modelName: string, where?: Record<string, any>) {
		const model = getModel(modelName);

		try {
			return await model.primary.count({ ...(where ? { where } : {}) });
		} catch (error) {
			for (const backup of model.backups) {
				try {
					return await backup.count({ ...(where ? { where } : {}) });
				} catch {
					/* try next */
				}
			}
			throw error;
		}
	},

	async groupBy(
		modelName: string,
		options: {
			by: string[];
			where?: Record<string, any>;
			_sum?: Record<string, boolean>;
			_avg?: Record<string, boolean>;
			_count?: Record<string, boolean> | Record<string, Record<string, boolean>> | boolean;
			orderBy?: Record<string, any>;
			take?: number;
		},
	) {
		const model = getModel(modelName);

		try {
			return await model.primary.groupBy(options as any);
		} catch (error) {
			for (const backup of model.backups) {
				try {
					return await backup.groupBy(options as any);
				} catch {
					/* try next */
				}
			}
			throw error;
		}
	},

	// ==================== AGGREGATE ====================

	async aggregate(
		modelName: string,
		options: {
			where?: Record<string, any>;
			_sum?: Record<string, boolean>;
			_avg?: Record<string, boolean>;
			_count?: Record<string, boolean> | boolean;
			_max?: Record<string, boolean>;
			_min?: Record<string, boolean>;
		},
	) {
		const model = getModel(modelName);

		try {
			return await model.primary.aggregate(options as any);
		} catch (error) {
			for (const backup of model.backups) {
				try {
					return await backup.aggregate(options as any);
				} catch {
					/* try next */
				}
			}
			throw error;
		}
	},

	// ==================== UPDATE ====================

	async update(modelName: string, where: Record<string, any>, data: Record<string, any>) {
		let model = getModel(modelName);

		let result: any;
		try {
			result = await model.primary.update({ where, data });
		} catch (error: any) {
			if (isConnectionError(error) && model.backups.length > 0) {
				markPrimaryDown(error);
				model = getModel(modelName);
				result = await model.primary.update({ where, data });
			} else {
				throw error;
			}
		}

		for (let i = 0; i < model.backups.length; i++) {
			fireAndForget(`PG_${i + 2}`, "update", modelName, model.backups[i].update({ where, data }));
		}

		if (model.mysql) {
			fireAndForget("MySQL", "update", modelName, model.mysql.update({ where, data }));
		}

		return result;
	},

	async updateMany(modelName: string, where: Record<string, any>, data: Record<string, any>) {
		let model = getModel(modelName);

		let result: any;
		try {
			result = await model.primary.updateMany({ where, data });
		} catch (error: any) {
			if (isConnectionError(error) && model.backups.length > 0) {
				markPrimaryDown(error);
				model = getModel(modelName);
				result = await model.primary.updateMany({ where, data });
			} else {
				throw error;
			}
		}

		for (let i = 0; i < model.backups.length; i++) {
			fireAndForget(`PG_${i + 2}`, "updateMany", modelName, model.backups[i].updateMany({ where, data }));
		}

		if (model.mysql) {
			fireAndForget("MySQL", "updateMany", modelName, model.mysql.updateMany({ where, data }));
		}

		return result;
	},

	// ==================== UPSERT ====================

	async upsert(
		modelName: string,
		where: Record<string, any>,
		createData: Record<string, any>,
		updateData: Record<string, any>,
	) {
		let model = getModel(modelName);

		let result: any;
		try {
			result = await model.primary.upsert({ where, create: createData, update: updateData });
		} catch (error: any) {
			if (isConnectionError(error) && model.backups.length > 0) {
				markPrimaryDown(error);
				model = getModel(modelName);
				result = await model.primary.upsert({ where, create: createData, update: updateData });
			} else {
				throw error;
			}
		}

		for (let i = 0; i < model.backups.length; i++) {
			fireAndForget(
				`PG_${i + 2}`,
				"upsert",
				modelName,
				model.backups[i].upsert({ where, create: createData, update: updateData }),
			);
		}

		if (model.mysql) {
			fireAndForget(
				"MySQL",
				"upsert",
				modelName,
				model.mysql.upsert({ where, create: createData, update: updateData }),
			);
		}

		return result;
	},

	// ==================== DELETE ====================

	async delete(modelName: string, where: Record<string, any>) {
		let model = getModel(modelName);

		let result: any;
		try {
			result = await model.primary.delete({ where });
		} catch (error: any) {
			if (isConnectionError(error) && model.backups.length > 0) {
				markPrimaryDown(error);
				model = getModel(modelName);
				result = await model.primary.delete({ where });
			} else {
				throw error;
			}
		}

		for (let i = 0; i < model.backups.length; i++) {
			fireAndForget(`PG_${i + 2}`, "delete", modelName, model.backups[i].delete({ where }));
		}

		if (model.mysql) {
			fireAndForget("MySQL", "delete", modelName, model.mysql.delete({ where }));
		}

		return result;
	},

	async deleteMany(modelName: string, where: Record<string, any>) {
		let model = getModel(modelName);

		let result: any;
		try {
			result = await model.primary.deleteMany({ where });
		} catch (error: any) {
			if (isConnectionError(error) && model.backups.length > 0) {
				markPrimaryDown(error);
				model = getModel(modelName);
				result = await model.primary.deleteMany({ where });
			} else {
				throw error;
			}
		}

		for (let i = 0; i < model.backups.length; i++) {
			fireAndForget(`PG_${i + 2}`, "deleteMany", modelName, model.backups[i].deleteMany({ where }));
		}

		if (model.mysql) {
			fireAndForget("MySQL", "deleteMany", modelName, model.mysql.deleteMany({ where }));
		}

		return result;
	},

	// ==================== TRANSACTION ====================

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
		// `prisma` resolves through `getPrimaryPrisma()` so transactions run
		// against the same health-aware primary that the DAL uses. If the
		// primary is unreachable, mark it down and retry on the new primary.
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return await (prisma as any).$transaction(fn as any);
		} catch (error: any) {
			if (isConnectionError(error)) {
				markPrimaryDown(error);
				// Retry once on the new primary (cache was invalidated).
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				return await (prisma as any).$transaction(fn as any);
			}
			throw error;
		}
	},

	// ==================== RAW QUERIES ====================

	async queryRaw(query: TemplateStringsArray, ...values: any[]) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (prisma as any).$queryRaw(query, ...values);
	},

	// ==================== HEALTH CHECK ====================

	async healthCheck(): Promise<Record<string, string>> {
		const result: Record<string, string> = {};
		const entries = dbRegistry.getAll();

		for (const entry of entries) {
			if (!entry.client) {
				result[entry.name] = "no_client";
				continue;
			}
			try {
				await entry.client.$queryRaw`SELECT 1`;
				result[entry.name] = "connected";
			} catch {
				result[entry.name] = "disconnected";
			}
		}

		return result;
	},

	// ==================== CACHE MANAGEMENT ====================

	/**
	 * Drop the model-delegate cache. The health-check service calls this after
	 * the registry reports a status change, so subsequent reads route through
	 * the new primary instead of a stale one.
	 */
	invalidateDelegateCache,

	/**
	 * Returns the name of the currently resolved primary database. Useful for
	 * the /api/health endpoint and for diagnostic logging.
	 */
	getPrimaryName(): string | null {
		return dbRegistry.getPrimary()?.name || null;
	},
};
