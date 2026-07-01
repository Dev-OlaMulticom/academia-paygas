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
 */
import { type DatabaseEntry, dbRegistry } from "../config/databases";
import { prismaMysql } from "./prisma-mysql";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModelDelegate = any;

export interface ModelDelegates {
	primary: ModelDelegate; // First healthy PG (for reads)
	backups: ModelDelegate[]; // All other healthy PGs (fire-and-forget writes)
	mysql: ModelDelegate | null; // MySQL backup
}

/**
 * Lazily resolve model delegates from the registry.
 * Registry clients are PrismaClients — we access model via (client as any)[modelName]
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const delegateCache = new Map<string, ModelDelegates>();

function getRegistryClientModel(entry: DatabaseEntry, modelName: string): ModelDelegate | null {
	if (!entry.client) return null;
	// PrismaClient delegates are accessed as client.user, client.modulo, etc.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (entry.client as any)[modelName] || null;
}

export function getModelDelegates(modelName: string): ModelDelegates {
	const cached = delegateCache.get(modelName);
	if (cached) return cached;

	const allEntries = dbRegistry.getAll();
	if (allEntries.length === 0) {
		throw new Error("[DB] No databases registered. Set PG_URL_1 or DATABASE_URL");
	}

	// Primary = first registered (PG_URL_1)
	const primaryEntry = allEntries[0];
	const primary = getRegistryClientModel(primaryEntry, modelName);

	// Backups = all other PGs
	const backups: ModelDelegate[] = [];
	for (let i = 1; i < allEntries.length; i++) {
		const delegate = getRegistryClientModel(allEntries[i], modelName);
		if (delegate) backups.push(delegate);
	}

	// MySQL backup
	const mysql = prismaMysql ? (prismaMysql as any)[modelName] || null : null;

	const result: ModelDelegates = { primary, backups, mysql };
	delegateCache.set(modelName, result);
	return result;
}

// Backward compatibility export — used by db.ts getReadClient
export const MODELS = new Proxy({} as Record<string, ModelDelegates>, {
	get(_target, prop: string) {
		return getModelDelegates(prop);
	},
});
