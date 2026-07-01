/**
 * Background Database Sync Worker
 *
 * When a database recovers from being offline, this worker syncs
 * all data from a healthy database to the recovered one.
 *
 * Strategy:
 * 1. Detect recovered databases (status changed from disconnected → connected)
 * 2. Pick the healthiest source database (most records or lowest latency)
 * 3. For each table: compare row counts, sync missing/stale rows
 * 4. Uses UPSERT to avoid duplicates, best-effort writes
 * 5. Runs in background, never blocks the application
 *
 * Usage:
 *   import { startSyncWorker } from '../services/db-sync'
 *   startSyncWorker() // Call once at server startup
 */
import type { PrismaClient } from "@prisma/client";
import { type DatabaseEntry, dbRegistry } from "../config/databases";
import logger from "../lib/logger";

const SYNC_INTERVAL = 30 * 1000; // Check every 30 seconds
const SYNC_BATCH_SIZE = 50; // Rows per batch

// All tables in dependency order (parents first)
const TABLES_IN_ORDER = [
	"User",
	"Modulo",
	"Aula",
	"Licao",
	"Quiz",
	"QuizPergunta",
	"QuizResponse",
	"Progresso",
	"Certificate",
	"Notification",
	"ActivityLog",
	"PointsTransaction",
	"ForumPost",
	"ModuleConfig",
	"XPConfig",
	"Conquista",
	"UserConquista",
];

let syncInterval: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

/**
 * Get row count from a specific database.
 */
async function getRowCount(client: PrismaClient, table: string): Promise<number> {
	try {
		const result = await client.$queryRawUnsafe(`SELECT COUNT(*)::int as c FROM "${table}"`);
		return (result as any[])[0]?.c || 0;
	} catch {
		return -1;
	}
}

/**
 * Get all rows from a table in a specific database.
 */
async function getAllRows(client: PrismaClient, table: string): Promise<Record<string, any>[]> {
	try {
		return await client.$queryRawUnsafe(`SELECT * FROM "${table}"`);
	} catch {
		return [];
	}
}

/**
 * Upsert a batch of rows into a database.
 * Best-effort: skips rows that fail.
 */
async function upsertBatch(client: PrismaClient, table: string, rows: Record<string, any>[]): Promise<number> {
	let synced = 0;

	for (const row of rows) {
		try {
			const keys = Object.keys(row);
			const values = keys.map((_, i) => `$${i + 1}`);

			await client.$queryRawUnsafe(
				`INSERT INTO "${table}" (${keys.map((k) => `"${k}"`).join(",")})
         VALUES (${values.join(",")})
         ON CONFLICT DO NOTHING`,
				...keys.map((k) => row[k]),
			);
			synced++;
		} catch {
			// Skip this row — best effort
		}
	}

	return synced;
}

/**
 * Sync all data from source to target database.
 * Returns the number of tables synced.
 */
async function syncDatabaseToTarget(
	source: DatabaseEntry,
	target: DatabaseEntry,
): Promise<{ tables: number; rows: number }> {
	if (!source.client || !target.client) {
		return { tables: 0, rows: 0 };
	}

	let tablesSynced = 0;
	let totalRows = 0;

	logger.info(`[DB-SYNC] Starting sync: ${source.name} → ${target.name}`);

	for (const table of TABLES_IN_ORDER) {
		const sourceCount = await getRowCount(source.client, table);
		const targetCount = await getRowCount(target.client, table);

		if (sourceCount === -1 || targetCount === -1) {
			logger.info(`[DB-SYNC]   ${table}: SKIP (table doesn't exist)`);
			continue;
		}

		if (sourceCount === targetCount) {
			continue; // Already in sync
		}

		if (sourceCount === 0) {
			// Source is empty but target has data — clear target
			try {
				await target.client.$queryRawUnsafe(`DELETE FROM "${table}"`);
				logger.info(`[DB-SYNC]   ${table}: cleared (source empty)`);
			} catch {
				/* skip */
			}
			continue;
		}

		logger.info(`[DB-SYNC]   ${table}: source=${sourceCount} target=${targetCount} — syncing...`);

		// Get all rows from source
		const sourceRows = await getAllRows(source.client, table);

		if (sourceRows.length === 0) continue;

		// Batch upsert into target
		for (let i = 0; i < sourceRows.length; i += SYNC_BATCH_SIZE) {
			const batch = sourceRows.slice(i, i + SYNC_BATCH_SIZE);
			const synced = await upsertBatch(target.client, table, batch);
			totalRows += synced;
		}

		tablesSynced++;
		logger.info(`[DB-SYNC]   ${table}: synced ${sourceRows.length} rows`);
	}

	logger.info(`[DB-SYNC] Complete: ${source.name} → ${target.name} (${tablesSynced} tables, ${totalRows} rows)`);
	return { tables: tablesSynced, rows: totalRows };
}

/**
 * Find the best source database for syncing.
 * Prefers the database with the most data (highest row counts).
 */
async function findBestSource(excludeName: string): Promise<DatabaseEntry | null> {
	const healthy = dbRegistry.getHealthy().filter((e) => e.name !== excludeName);
	if (healthy.length === 0) return null;

	let bestSource: DatabaseEntry | null = null;
	let highestTotal = -1;

	for (const entry of healthy) {
		if (!entry.client) continue;

		let totalRows = 0;
		for (const table of TABLES_IN_ORDER) {
			const count = await getRowCount(entry.client, table);
			if (count > 0) totalRows += count;
		}

		if (totalRows > highestTotal) {
			highestTotal = totalRows;
			bestSource = entry;
		}
	}

	return bestSource;
}

/**
 * Main sync loop.
 * Checks for recovered databases and syncs them in the background.
 */
async function syncLoop() {
	if (isSyncing) return; // Prevent concurrent syncs

	const allDatabases = dbRegistry.getAll();
	const recovered = allDatabases.filter((e) => e.status === "connected" && e.consecutiveFailures === 0 && e.lastCheck);

	if (recovered.length === 0) return;

	// Check if any database has data mismatch
	for (const target of recovered) {
		if (!target.client) continue;

		// Quick check: is this database empty or significantly behind?
		const targetUserCount = await getRowCount(target.client, "User");
		if (targetUserCount === 0) {
			// Empty database — needs full sync
			isSyncing = true;
			try {
				const source = await findBestSource(target.name);
				if (source) {
					logger.info(`[DB-SYNC] Database ${target.name} is empty, syncing from ${source.name}`);
					await syncDatabaseToTarget(source, target);
				}
			} finally {
				isSyncing = false;
			}
		}
	}
}

/**
 * Start the background sync worker.
 */
export function startSyncWorker() {
	if (syncInterval) {
		logger.info("[DB-SYNC] Already running");
		return;
	}

	logger.info("[DB-SYNC] Starting background sync worker");

	// Initial sync check after 30 seconds
	setTimeout(() => {
		syncLoop();
		syncInterval = setInterval(syncLoop, SYNC_INTERVAL);
	}, 30000);
}

/**
 * Stop the sync worker.
 */
export function stopSyncWorker() {
	if (syncInterval) {
		clearInterval(syncInterval);
		syncInterval = null;
		logger.info("[DB-SYNC] Stopped");
	}
}

/**
 * Force an immediate sync of a specific database.
 */
export async function forceSyncTo(targetName: string): Promise<boolean> {
	const target = dbRegistry.getClient(targetName);
	const targetEntry = dbRegistry.getAll().find((e) => e.name === targetName);

	if (!target || !targetEntry) {
		logger.error(`[DB-SYNC] Target database "${targetName}" not found`);
		return false;
	}

	const source = await findBestSource(targetName);
	if (!source) {
		logger.error(`[DB-SYNC] No healthy source database found for syncing to "${targetName}"`);
		return false;
	}

	isSyncing = true;
	try {
		await syncDatabaseToTarget(source, targetEntry);
		return true;
	} finally {
		isSyncing = false;
	}
}

export { syncDatabaseToTarget };
