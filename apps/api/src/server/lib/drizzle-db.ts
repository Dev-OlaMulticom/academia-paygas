import { randomUUID } from "crypto";
import { and, asc, desc, eq, gt, gte, ilike, inArray, isNull, like, lt, lte, ne, notIlike, notInArray, notLike, sql } from "drizzle-orm";
import { dbRegistry } from "../config/databases";
import { getDrizzleModelDelegates, invalidateDrizzleDelegateCache } from "./drizzle-models";
import logger from "./logger";

function ensureId<T extends Record<string, any>>(data: T): T {
	if (data.id === undefined || data.id === null) {
		return { ...data, id: randomUUID() };
	}
	return data;
}

function isConnectionError(error: any): boolean {
	const messages = [
		String(error?.message || ""),
		String(error?.code || ""),
		String(error?.cause?.message || ""),
		String(error?.cause?.code || ""),
		String(error || ""),
	];
	const combined = messages.join(" ");
	return (
		combined.includes("ENETUNREACH") ||
		combined.includes("ECONNREFUSED") ||
		combined.includes("ECONNRESET") ||
		combined.includes("ETIMEDOUT") ||
		combined.includes("EHOSTUNREACH") ||
		combined.includes("P1001") ||
		combined.includes("P1002") ||
		combined.includes("Can't reach database server") ||
		combined.includes("connect ENOTFOUND") ||
		combined.includes("pool timeout") ||
		combined.includes("has ended") ||
		combined.includes("after calling end") ||
		combined.includes("Cannot use") ||
		combined.includes("Connection terminated") ||
		combined.includes("server closed the connection") ||
		combined.includes("Connection refused") ||
		combined.includes("Connection timed out")
	);
}

function markPrimaryDown(error: any): void {
	const primary = dbRegistry.getPrimary();
	if (!primary || primary.status === "disconnected") return;
	logger.warn(`[DRIZZLE-FAILOVER] Primary ${primary.name} unreachable: ${error?.message || error?.code || "unknown"}`);
	dbRegistry.setStatus(primary.name, "disconnected", String(error?.message || error?.code || "connection error"));
	invalidateDrizzleDelegateCache();
}

function fireAndForget(backupName: string, operation: string, modelName: string, promise: Promise<any>): void {
	promise.catch((error) => {
		logger.warn(`[DUAL-WRITE] ${backupName} ${operation} failed on ${modelName}:`, error?.message || error);
	});
}

const ALLOWED_OPS = [
	"eq", "ne", "gt", "gte", "lt", "lte", "in", "nin", "contains", "icontains",
	"startsWith", "istartsWith", "endsWith", "iendsWith",
];

function buildCondition(table: any, key: string, value: any): any {
	if (value === null) return isNull(table[key]);
	if (value !== null && typeof value === "object" && !Array.isArray(value)) {
		const opEntries = Object.entries(value).filter(([op]) => op.startsWith("$") || ALLOWED_OPS.includes(op));
		if (opEntries.length === 0) {
			// Plain object without operators is treated as equality (JSON/JSONB etc)
			return eq(table[key], value);
		}
		const conditions: any[] = [];
		for (const [op, operand] of opEntries) {
			const col = table[key];
			const opKey = op.replace(/^\$/, "");
			switch (opKey) {
				case "eq":
					conditions.push(eq(col, operand));
					break;
				case "ne":
					conditions.push(ne(col, operand));
					break;
				case "gt":
					conditions.push(gt(col, operand));
					break;
				case "gte":
					conditions.push(gte(col, operand));
					break;
				case "lt":
					conditions.push(lt(col, operand));
					break;
				case "lte":
					conditions.push(lte(col, operand));
					break;
				case "in":
					conditions.push(inArray(col, Array.isArray(operand) ? operand : [operand]));
					break;
				case "nin":
					conditions.push(notInArray(col, Array.isArray(operand) ? operand : [operand]));
					break;
				case "contains":
					conditions.push(like(col, `%${operand}%`));
					break;
				case "icontains":
					conditions.push(ilike(col, `%${operand}%`));
					break;
				case "startsWith":
					conditions.push(like(col, `${operand}%`));
					break;
				case "istartsWith":
					conditions.push(ilike(col, `${operand}%`));
					break;
				case "endsWith":
					conditions.push(like(col, `%${operand}`));
					break;
				case "iendsWith":
					conditions.push(ilike(col, `%${operand}`));
					break;
				default:
					conditions.push(eq(col, operand));
					break;
			}
		}
		if (conditions.length === 1) return conditions[0];
		return and(...conditions);
	}
	return eq(table[key], value);
}

function buildWhere(table: any, where: Record<string, any> | undefined): any {
	if (!where) return undefined;
	const conditions: any[] = [];
	for (const [key, value] of Object.entries(where)) {
		if (value === undefined) continue;
		conditions.push(buildCondition(table, key, value));
	}
	if (conditions.length === 0) return undefined;
	if (conditions.length === 1) return conditions[0];
	return and(...conditions);
}

function buildOrderBy(table: any, orderBy: Record<string, any> | undefined): any[] | undefined {
	if (!orderBy) return undefined;
	const out: any[] = [];
	for (const [key, value] of Object.entries(orderBy)) {
		if (value === "asc") out.push(asc(table[key]));
		else if (value === "desc") out.push(desc(table[key]));
	}
	return out.length ? out : undefined;
}

function buildSelect(table: any, select: Record<string, any> | undefined): Record<string, any> | undefined {
	if (!select) return undefined;
	const columns: Record<string, any> = {};
	for (const [key, value] of Object.entries(select)) {
		if (value === true && table[key] !== undefined) {
			columns[key] = table[key];
		}
	}
	return Object.keys(columns).length > 0 ? columns : undefined;
}

export const drizzleDb = {
	async create(modelName: string, data: Record<string, any>) {
		let { primary, backups } = getDrizzleModelDelegates(modelName);
		const table: any = primary.table;
		const db: any = primary.db;
		const payload = ensureId(data);
		let result: any;
		try {
			const rows = (await db.insert(table).values(payload).returning()) as any[];
			result = rows[0];
		} catch (error: any) {
			if (isConnectionError(error) && backups.length > 0) {
				markPrimaryDown(error);
				({ primary, backups } = getDrizzleModelDelegates(modelName));
				const rows = (await primary.db.insert(primary.table as any).values(payload).returning()) as any[];
				result = rows[0];
			} else {
				throw error;
			}
		}

		for (let i = 0; i < backups.length; i++) {
			fireAndForget(`${backups[i].dbName}`, "create", modelName, backups[i].db.insert(backups[i].table as any).values(payload).returning());
		}

		return result;
	},

	async createMany(modelName: string, data: Record<string, any>[]) {
		let { primary, backups } = getDrizzleModelDelegates(modelName);
		const table: any = primary.table;
		const db: any = primary.db;
		const payload = data.map(ensureId);
		let result: any;
		try {
			result = await db.insert(table).values(payload).returning();
		} catch (error: any) {
			if (isConnectionError(error) && backups.length > 0) {
				markPrimaryDown(error);
				({ primary, backups } = getDrizzleModelDelegates(modelName));
				result = await primary.db.insert(primary.table as any).values(payload).returning();
			} else {
				throw error;
			}
		}

		for (let i = 0; i < backups.length; i++) {
			fireAndForget(`${backups[i].dbName}`, "createMany", modelName, backups[i].db.insert(backups[i].table as any).values(payload).returning());
		}

		return result;
	},

	async findUnique(modelName: string, where: Record<string, any>, opts?: { select?: Record<string, any> }) {
		const { primary, backups } = getDrizzleModelDelegates(modelName);
		const table: any = primary.table;
		const db: any = primary.db;
		const conds = buildWhere(table, where);
		const columns = buildSelect(table, opts?.select);
		try {
			let q: any = columns ? db.select(columns).from(table) : db.select().from(table);
			if (conds) q = q.where(conds);
			const rows = (await q.limit(1)) as any[];
			return rows[0] || null;
		} catch (error) {
			for (const backup of backups) {
				try {
					const bTable: any = backup.table;
					const bDb: any = backup.db;
					let q: any = columns ? bDb.select(columns).from(bTable) : bDb.select().from(bTable);
					if (conds) q = q.where(conds);
					const rows = (await q.limit(1)) as any[];
					return rows[0] || null;
				} catch {
					/* next */
				}
			}
			throw error;
		}
	},

	async findFirst(
		modelName: string,
		where?: Record<string, any>,
		opts?: { orderBy?: Record<string, any>; select?: Record<string, any> },
	) {
		const { primary, backups } = getDrizzleModelDelegates(modelName);
		const table: any = primary.table;
		const db: any = primary.db;
		const conds = buildWhere(table, where);
		const orderBy = buildOrderBy(table, opts?.orderBy);
		const columns = buildSelect(table, opts?.select);
		try {
			let q: any = columns ? db.select(columns).from(table) : db.select().from(table);
			if (conds) q = q.where(conds);
			if (orderBy) q = q.orderBy(...orderBy);
			const rows = (await q.limit(1)) as any[];
			return rows[0] || null;
		} catch (error) {
			for (const backup of backups) {
				try {
					const bTable: any = backup.table;
					const bDb: any = backup.db;
					let q: any = columns ? bDb.select(columns).from(bTable) : bDb.select().from(bTable);
					if (conds) q = q.where(conds);
					if (orderBy) q = q.orderBy(...orderBy);
					const rows = (await q.limit(1)) as any[];
					return rows[0] || null;
				} catch {
					/* next */
				}
			}
			throw error;
		}
	},

	async findMany(
		modelName: string,
		options: {
			where?: Record<string, any>;
			orderBy?: Record<string, any>;
			select?: Record<string, any>;
			skip?: number;
			take?: number;
		} = {},
	) {
		const { primary, backups } = getDrizzleModelDelegates(modelName);
		const table: any = primary.table;
		const db: any = primary.db;
		const conds = buildWhere(table, options.where);
		const orderBy = buildOrderBy(table, options.orderBy);
		const columns = buildSelect(table, options.select);
		try {
			let q: any = columns ? db.select(columns).from(table) : db.select().from(table);
			if (conds) q = q.where(conds);
			if (orderBy) q = q.orderBy(...orderBy);
			if (options.skip) q = q.offset(options.skip);
			if (options.take) q = q.limit(options.take);
			return (await q) as any[];
		} catch (error) {
			for (const backup of backups) {
				try {
					const bTable: any = backup.table;
					const bDb: any = backup.db;
					let q: any = columns ? bDb.select(columns).from(bTable) : bDb.select().from(bTable);
					if (conds) q = q.where(conds);
					if (orderBy) q = q.orderBy(...orderBy);
					if (options.skip) q = q.offset(options.skip);
					if (options.take) q = q.limit(options.take);
					return (await q) as any[];
				} catch {
					/* next */
				}
			}
			throw error;
		}
	},

	async count(modelName: string, where?: Record<string, any>) {
		const { primary, backups } = getDrizzleModelDelegates(modelName);
		const table: any = primary.table;
		const db: any = primary.db;
		const conds = buildWhere(table, where);
		try {
			return conds ? Number(await db.$count(table, conds)) : Number(await db.$count(table));
		} catch (error) {
			for (const backup of backups) {
				try {
					const bTable: any = backup.table;
					const bDb: any = backup.db;
					return conds ? Number(await bDb.$count(bTable, conds)) : Number(await bDb.$count(bTable));
				} catch {
					/* next */
				}
			}
			throw error;
		}
	},

	async update(modelName: string, where: Record<string, any>, data: Record<string, any>) {
		let { primary, backups } = getDrizzleModelDelegates(modelName);
		const table: any = primary.table;
		const db: any = primary.db;
		const conds = buildWhere(table, where);
		let result: any;
		try {
			const rows = (await db.update(table).set(data).where(conds).returning()) as any[];
			result = rows[0];
		} catch (error: any) {
			if (isConnectionError(error) && backups.length > 0) {
				markPrimaryDown(error);
				({ primary, backups } = getDrizzleModelDelegates(modelName));
				const pTable: any = primary.table;
				const pDb: any = primary.db;
				const pConds = buildWhere(pTable, where);
				const rows = (await pDb.update(pTable).set(data).where(pConds).returning()) as any[];
				result = rows[0];
			} else {
				throw error;
			}
		}

		for (let i = 0; i < backups.length; i++) {
			const bTable: any = backups[i].table;
			const bConds = buildWhere(bTable, where);
			fireAndForget(`${backups[i].dbName}`, "update", modelName, backups[i].db.update(bTable).set(data).where(bConds).returning());
		}

		return result;
	},

	async updateMany(modelName: string, where: Record<string, any>, data: Record<string, any>) {
		let { primary, backups } = getDrizzleModelDelegates(modelName);
		const table: any = primary.table;
		const db: any = primary.db;
		const conds = buildWhere(table, where);
		let result: any;
		try {
			const rows = (await db.update(table).set(data).where(conds).returning()) as any[];
			result = rows;
		} catch (error: any) {
			if (isConnectionError(error) && backups.length > 0) {
				markPrimaryDown(error);
				({ primary, backups } = getDrizzleModelDelegates(modelName));
				const pTable: any = primary.table;
				const pDb: any = primary.db;
				const pConds = buildWhere(pTable, where);
				const rows = (await pDb.update(pTable).set(data).where(pConds).returning()) as any[];
				result = rows;
			} else {
				throw error;
			}
		}

		for (let i = 0; i < backups.length; i++) {
			const bTable: any = backups[i].table;
			const bConds = buildWhere(bTable, where);
			fireAndForget(`${backups[i].dbName}`, "updateMany", modelName, backups[i].db.update(bTable).set(data).where(bConds).returning());
		}

		return result;
	},

	async upsert(modelName: string, where: Record<string, any>, createData: Record<string, any>, updateData: Record<string, any>) {
		let { primary, backups } = getDrizzleModelDelegates(modelName);
		const table: any = primary.table;
		const db: any = primary.db;
		const payload = ensureId(createData);
		const conflictCols = Object.keys(where)
			.filter((k) => where[k] !== undefined)
			.map((k) => table[k]);
		if (conflictCols.length === 0) {
			throw new Error(`[DRIZZLE] upsert requires a non-empty where clause`);
		}

		let result: any;
		try {
			const rows = (await db
				.insert(table)
				.values(payload)
				.onConflictDoUpdate({ target: conflictCols, set: updateData })
				.returning()) as any[];
			result = rows[0];
		} catch (error: any) {
			if (isConnectionError(error) && backups.length > 0) {
				markPrimaryDown(error);
				({ primary, backups } = getDrizzleModelDelegates(modelName));
				const pTable: any = primary.table;
				const pDb: any = primary.db;
				const pConflictCols = Object.keys(where)
					.filter((k) => where[k] !== undefined)
					.map((k) => pTable[k]);
				const rows = (await pDb
					.insert(pTable)
					.values(payload)
					.onConflictDoUpdate({ target: pConflictCols, set: updateData })
					.returning()) as any[];
				result = rows[0];
			} else {
				throw error;
			}
		}

		for (let i = 0; i < backups.length; i++) {
			const bTable: any = backups[i].table;
			const bConds = Object.keys(where)
				.filter((k) => where[k] !== undefined)
				.map((k) => bTable[k]);
			fireAndForget(
				`${backups[i].dbName}`,
				"upsert",
				modelName,
				backups[i].db.insert(bTable).values(payload).onConflictDoUpdate({ target: bConds, set: updateData }).returning(),
			);
		}

		return result;
	},

	async delete(modelName: string, where: Record<string, any>) {
		let { primary, backups } = getDrizzleModelDelegates(modelName);
		const table: any = primary.table;
		const db: any = primary.db;
		const conds = buildWhere(table, where);
		let result: any;
		try {
			const rows = (await db.delete(table).where(conds).returning()) as any[];
			result = rows[0];
		} catch (error: any) {
			if (isConnectionError(error) && backups.length > 0) {
				markPrimaryDown(error);
				({ primary, backups } = getDrizzleModelDelegates(modelName));
				const pTable: any = primary.table;
				const pDb: any = primary.db;
				const pConds = buildWhere(pTable, where);
				const rows = (await pDb.delete(pTable).where(pConds).returning()) as any[];
				result = rows[0];
			} else {
				throw error;
			}
		}

		for (let i = 0; i < backups.length; i++) {
			const bTable: any = backups[i].table;
			const bConds = buildWhere(bTable, where);
			fireAndForget(`${backups[i].dbName}`, "delete", modelName, backups[i].db.delete(bTable).where(bConds).returning());
		}

		return result;
	},

	async deleteMany(modelName: string, where: Record<string, any>) {
		let { primary, backups } = getDrizzleModelDelegates(modelName);
		const table: any = primary.table;
		const db: any = primary.db;
		const conds = buildWhere(table, where);
		let result: any;
		try {
			const rows = (await db.delete(table).where(conds).returning()) as any[];
			result = rows;
		} catch (error: any) {
			if (isConnectionError(error) && backups.length > 0) {
				markPrimaryDown(error);
				({ primary, backups } = getDrizzleModelDelegates(modelName));
				const pTable: any = primary.table;
				const pDb: any = primary.db;
				const pConds = buildWhere(pTable, where);
				const rows = (await pDb.delete(pTable).where(pConds).returning()) as any[];
				result = rows;
			} else {
				throw error;
			}
		}

		for (let i = 0; i < backups.length; i++) {
			const bTable: any = backups[i].table;
			const bConds = buildWhere(bTable, where);
			fireAndForget(`${backups[i].dbName}`, "deleteMany", modelName, backups[i].db.delete(bTable).where(bConds).returning());
		}

		return result;
	},

	async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
		const { primary } = getDrizzleModelDelegates("user");
		const db: any = primary.db;
		try {
			return await db.transaction(async (tx: any) => fn(tx));
		} catch (error: any) {
			if (isConnectionError(error)) {
				markPrimaryDown(error);
				const { primary: newPrimary } = getDrizzleModelDelegates("user");
				const newDb: any = newPrimary.db;
				return await newDb.transaction(async (tx: any) => fn(tx));
			}
			throw error;
		}
	},

	async queryRaw(query: TemplateStringsArray, ...values: any[]) {
		const primary = dbRegistry.getPrimary();
		if (!primary?.pool) throw new Error("[DRIZZLE] No primary database available");
		const text = query.reduce((acc, str, i) => (i < values.length ? `${acc}${str}$${i + 1}` : `${acc}${str}`), "");
		const result = await primary.pool.query({ text, values });
		return result.rows;
	},

	async healthCheck(): Promise<Record<string, string>> {
		const result: Record<string, string> = {};
		const entries = dbRegistry.getAll();
		for (const entry of entries) {
			if (!entry.pool) {
				result[entry.name] = "no_pool";
				continue;
			}
			try {
				await entry.pool.query("SELECT 1");
				result[entry.name] = "connected";
			} catch {
				result[entry.name] = "disconnected";
			}
		}
		return result;
	},

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
		const { primary } = getDrizzleModelDelegates(modelName);
		const table: any = primary.table;
		const db: any = primary.db;
		const conds = buildWhere(table, options.where);
		const columns: Record<string, any> = {};

		if (options._sum) for (const [k, v] of Object.entries(options._sum)) if (v) columns[`_sum_${k}`] = sql`sum(${table[k]})`;
		if (options._avg) for (const [k, v] of Object.entries(options._avg)) if (v) columns[`_avg_${k}`] = sql`avg(${table[k]})`;
		if (options._count) {
			if (typeof options._count === "boolean" && options._count) columns._count = sql`count(*)`;
			else if (typeof options._count === "object") {
				for (const [k, v] of Object.entries(options._count)) {
					if (v) columns[`_count_${k}`] = sql`count(${table[k]})`;
				}
			}
		}
		if (options._max) for (const [k, v] of Object.entries(options._max)) if (v) columns[`_max_${k}`] = sql`max(${table[k]})`;
		if (options._min) for (const [k, v] of Object.entries(options._min)) if (v) columns[`_min_${k}`] = sql`min(${table[k]})`;

		let q: any = db.select(columns).from(table);
		if (conds) q = q.where(conds);
		const rows = (await q) as any[];
		return rows[0];
	},

	async groupBy(
		modelName: string,
		options: {
			by: string[];
			where?: Record<string, any>;
			_sum?: Record<string, boolean>;
			_avg?: Record<string, boolean>;
			_max?: Record<string, boolean>;
			_min?: Record<string, boolean>;
			_count?: Record<string, boolean> | Record<string, Record<string, boolean>> | boolean;
			orderBy?: Record<string, any>;
			take?: number;
		},
	) {
		const { primary } = getDrizzleModelDelegates(modelName);
		const table: any = primary.table;
		const db: any = primary.db;
		const conds = buildWhere(table, options.where);
		const columns: Record<string, any> = {};
		for (const key of options.by) columns[key] = table[key];

		if (options._sum) for (const [k, v] of Object.entries(options._sum)) if (v) columns[`_sum_${k}`] = sql`sum(${table[k]})`;
		if (options._avg) for (const [k, v] of Object.entries(options._avg)) if (v) columns[`_avg_${k}`] = sql`avg(${table[k]})`;
		if (typeof options._count === "boolean" && options._count) columns._count = sql`count(*)`;
		if (typeof options._count === "object" && !Array.isArray(options._count)) {
			for (const [k, v] of Object.entries(options._count as Record<string, boolean>)) {
				if (v) columns[`_count_${k}`] = sql`count(${table[k]})`;
			}
		}

		let q: any = db.select(columns).from(table);
		if (conds) q = q.where(conds);
		if (options.by.length) q = q.groupBy(...options.by.map((k) => table[k]));
		const orderBy = buildOrderBy(table, options.orderBy);
		if (orderBy) q = q.orderBy(...orderBy);
		if (options.take) q = q.limit(options.take);
		const raw = (await q) as any[];
		return raw.map((row) => {
			const out: any = {};
			for (const key of options.by) out[key] = row[key];
			const counts: Record<string, any> = {};
			if (typeof options._count === "object" && options._count) {
				for (const [k, v] of Object.entries(options._count)) {
					if (v) counts[k] = row[`_count_${k}`];
				}
			} else if (typeof options._count === "boolean" && options._count) {
				out._count = row._count;
			}
			if (Object.keys(counts).length) out._count = counts;
			const sums: Record<string, any> = {};
			if (options._sum) for (const [k, v] of Object.entries(options._sum)) if (v) sums[k] = row[`_sum_${k}`];
			if (Object.keys(sums).length) out._sum = sums;
			const avgs: Record<string, any> = {};
			if (options._avg) for (const [k, v] of Object.entries(options._avg)) if (v) avgs[k] = row[`_avg_${k}`];
			if (Object.keys(avgs).length) out._avg = avgs;
			const maxs: Record<string, any> = {};
			if (options._max) for (const [k, v] of Object.entries(options._max)) if (v) maxs[k] = row[`_max_${k}`];
			if (Object.keys(maxs).length) out._max = maxs;
			const mins: Record<string, any> = {};
			if (options._min) for (const [k, v] of Object.entries(options._min)) if (v) mins[k] = row[`_min_${k}`];
			if (Object.keys(mins).length) out._min = mins;
			return out;
		});
	},

	invalidateDelegateCache: invalidateDrizzleDelegateCache,

	getPrimaryName(): string | null {
		return dbRegistry.getPrimary()?.name || null;
	},
};
