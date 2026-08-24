/**
 * Model configuration for the Data Access Layer.
 *
 * Uses the database registry (server/config/databases.ts) for all PG connections.
 * Each PG_URL_* from env becomes a write target. MySQL stays separate.
 *
 * Architecture:
 *   PG_URL_1, PG_URL_2, ... → dynamically discovered via registry
 *   MYSQL_URL → separate MySQL client
 *
 * Adding a new PG database = just add PG_URL_N to .env. DAL auto-discovers it.
 *
 * "Primary" semantics:
 *   The PRIMARY delegate is the database chosen by `dbRegistry.getPrimary()`,
 *   which is health-aware (prefers `connected > degraded > unknown >
 *   disconnected`, sorted by registry priority). This is the source used for
 *   authoritative reads and writes.
 *
 *   Backups = every other healthy PG entry, fire-and-forget for writes.
 *
 *   MySQL is a third-tier backup that only gets writes.
 */
import { type DatabaseEntry, dbRegistry } from "../config/databases";
import { prismaMysql } from "./prisma-mysql";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModelDelegate = any;

export interface ModelDelegates {
	primary: ModelDelegate;
	backups: ModelDelegate[];
	mysql: ModelDelegate | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const delegateCache = new Map<string, ModelDelegates>();

function getRegistryClientModel(entry: DatabaseEntry, modelName: string): ModelDelegate | null {
	if (!entry.client) return null;
	// PrismaClient delegates are accessed as client.user, client.curso, etc.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (entry.client as any)[modelName] || null;
}

/**
 * Pick the primary database entry using the health-aware registry method.
 * Falls back to the first registered entry only when the registry is empty
 * (cold-start codepath).
 */
function resolvePrimaryEntry(): DatabaseEntry {
	const healthy = dbRegistry.getHealthy();
	const candidates = healthy.length > 0 ? healthy : dbRegistry.getAll();
	if (candidates.length === 0) {
		throw new Error("[DB] No databases registered. Set PG_URL_1 or DATABASE_URL");
	}
	return dbRegistry.getPrimary() ?? candidates[0];
}

export function getModelDelegates(modelName: string): ModelDelegates {
	const cached = delegateCache.get(modelName);
	if (cached) return cached;

	const allEntries = dbRegistry.getAll();
	if (allEntries.length === 0) {
		throw new Error("[DB] No databases registered. Set PG_URL_1 or DATABASE_URL");
	}

	const primaryEntry = resolvePrimaryEntry();
	const primary = getRegistryClientModel(primaryEntry, modelName);

	// Backups = every other PG entry that has a client
	const backups: ModelDelegate[] = [];
	for (const entry of allEntries) {
		if (entry.name === primaryEntry.name) continue;
		const delegate = getRegistryClientModel(entry, modelName);
		if (delegate) backups.push(delegate);
	}

	// MySQL backup
	const mysql = prismaMysql ? (prismaMysql as any)[modelName] || null : null;

	const result: ModelDelegates = { primary, backups, mysql };
	delegateCache.set(modelName, result);
	return result;
}

/**
 * Invalidate the delegate cache. Call after the registry re-evaluates health
 * status (e.g. after a failover) so reads start routing through the new primary.
 */
export function invalidateDelegateCache(): void {
	delegateCache.clear();
}

// Backward compatibility export — used by db.ts getReadClient
export const MODELS = new Proxy({} as Record<string, ModelDelegates>, {
	get(_target, prop: string) {
		return getModelDelegates(prop);
	},
});
