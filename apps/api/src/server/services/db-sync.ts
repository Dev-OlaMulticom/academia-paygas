/**
 * Background Database Sync — three layers
 *
 *   1. Real-time (server/services/db-realtime.ts): Postgres triggers NOTIFY
 *      on every row change; we LISTEN on every healthy database and mirror
 *      the single changed row to the others within milliseconds. This is
 *      the primary sync path while all databases are online.
 *   2. Incremental catch-up (this file, `runIncrementalSync`, every 10s):
 *      cheap safety net — pulls rows with `updatedAt`/`createdAt` newer than
 *      the last cursor seen per (target, table). Catches anything the
 *      real-time layer missed (e.g. app was briefly down, a NOTIFY was
 *      dropped because nobody was LISTENing yet).
 *   3. Full reconciliation (this file, `syncDatabaseToTarget`, hash-diff):
 *      the expensive full-table `md5(row::text)` comparison. Only run:
 *        - Once at startup (baseline — cursors above start counting from here).
 *        - Immediately when a database recovers from being offline (db-health
 *          calls `triggerSync(name)`), since it may have missed everything.
 *        - Periodically as a deep safety net (FULL_SYNC_INTERVAL, default 15m)
 *          to catch drift that neither of the above layers can (e.g. rows
 *          edited directly in the DB without updating `updatedAt`).
 *
 * Never deletes (no soft-delete policy defined) — inserts/updates only.
 *
 * Usage:
 *   import { startSyncWorker } from '../services/db-sync'
 *   startSyncWorker()
 *
 *   import { triggerSync } from '../services/db-sync'
 *   triggerSync('PG_2')   // forces an immediate FULL diff sync for a target
 *
 *   import { syncRow } from '../services/db-sync'
 *   syncRow(sourceEntry, targetEntry, 'User', id)   // used by db-realtime.ts
 *
 *   import { getSyncStats } from '../services/db-sync'
 *   getSyncStats()
 */
import type { Pool } from "pg";
import { type DatabaseEntry, dbRegistry } from "../config/databases";
import logger from "../lib/logger";

// Intervalos configurables por env — pensados para servidores pequenos
// (0.1 vCPU / 256MB): FULL_SYNC_OFF=1 + intervalos largos reducen CPU.
const FULL_SYNC_INTERVAL = parseInt(process.env.FULL_SYNC_INTERVAL_MS || "", 10) || 60 * 60 * 1000; // deep reconciliation safety net
const INCREMENTAL_INTERVAL = parseInt(process.env.INCREMENTAL_INTERVAL_MS || "", 10) || 30 * 1000; // fast catch-up safety net
const FULL_SYNC_OFF = process.env.FULL_SYNC_OFF === "1";
const SYNC_BATCH_SIZE = 25;
const SYNC_START_DELAY = parseInt(process.env.SYNC_START_DELAY_MS || "", 10) || 30 * 1000;
const INCREMENTAL_BATCH_LIMIT = 100;

// Tabelas em ordem de dependencias (pais antes dos filhos) para nao violar FKs.
const TABLES_IN_ORDER = [
	"Estabelecimento",
	"User",
	"Curso",
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
	"RoleConfig",
	"Conquista",
	"UserConquista",
];

const TABLE_SET = new Set(TABLES_IN_ORDER);

function validateTableName(table: string): void {
	if (!TABLE_SET.has(table)) {
		throw new Error(`[DB-SYNC] Table name not allowed: ${table}`);
	}
}

// Column used as an incremental cursor per table — `updatedAt` where the
// model has it, otherwise `createdAt`/creation timestamp (append-mostly
// tables). Mutable columns on tables without `updatedAt` (e.g. Notification's
// `lida`) are NOT caught by the incremental layer — the real-time NOTIFY
// layer handles those instantly instead, and the periodic full hash-diff
// catches anything left over.
const CURSOR_COLUMN: Record<string, string> = {
	Estabelecimento: "updatedAt",
	User: "updatedAt",
	Curso: "updatedAt",
	Aula: "updatedAt",
	Licao: "updatedAt",
	Quiz: "updatedAt",
	QuizPergunta: "updatedAt",
	QuizResponse: "updatedAt",
	Progresso: "updatedAt",
	Certificate: "updatedAt",
	Notification: "createdAt",
	ActivityLog: "createdAt",
	PointsTransaction: "createdAt",
	ForumPost: "updatedAt",
	ModuleConfig: "updatedAt",
	XPConfig: "updatedAt",
	RoleConfig: "updatedAt",
	Conquista: "updatedAt",
	UserConquista: "dataConquista",
};

interface ColumnDef {
	name: string;
	type: string;
	isId: boolean;
}

const columnCache = new Map<string, ColumnDef[]>();

interface SyncStats {
	runs: number;
	rowsInserted: number;
	rowsUpdated: number;
	errors: number;
	incrementalRuns: number;
	incrementalRows: number;
	realtimeRows: number;
}

const syncStats: SyncStats = {
	runs: 0,
	rowsInserted: 0,
	rowsUpdated: 0,
	errors: 0,
	incrementalRuns: 0,
	incrementalRows: 0,
	realtimeRows: 0,
};

let fullSyncInterval: ReturnType<typeof setInterval> | null = null;
let incrementalInterval: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;
let lastSyncAt: number | null = null;
let lastIncrementalAt: number | null = null;

// Incremental cursors: `${targetName}:${table}` -> last value of CURSOR_COLUMN
// already synced to that target. Seeded to "now" right after the startup
// full sync, so the incremental loop only ever looks forward from there.
const cursors = new Map<string, Date>();
const cursorKey = (targetName: string, table: string) => `${targetName}:${table}`;

async function queryRaw<T extends Record<string, any> = Record<string, any>>(
	pool: Pool,
	text: string,
	values: any[] = [],
): Promise<T[]> {
	const result = await pool.query<T>({ text, values });
	return result.rows;
}

/**
 * Obtem definicoes de colunas de uma tabela (caching por nome). Usa
 * information_schema para nao depender do schema do Prisma.
 */
export async function getColumns(pool: Pool, table: string): Promise<ColumnDef[]> {
	const cached = columnCache.get(table);
	if (cached) return cached;
	const rows = await queryRaw<{ column_name: string; data_type: string }>(
		pool,
		`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
		[table],
	);
	const cols = rows.map((r) => ({
		name: r.column_name,
		type: r.data_type,
		isId: r.column_name === "id",
	}));
	columnCache.set(table, cols);
	return cols;
}

/**
 * Obtem pares (id, hash) de uma tabela. `md5(t::text)` e estavel em PG para o
 * mesmo conteudo de row. Retorna [] se a tabela nao existir ou falhar.
 */
async function fetchHashes(pool: Pool, table: string): Promise<Array<{ id: string; h: string }>> {
	try {
		validateTableName(table);
		return await queryRaw<{ id: string; h: string }>(pool, `SELECT id, md5(t::text) AS h FROM "${table}" t`);
	} catch (err: any) {
		logger.warn(`[DB-SYNC] Falha ao ler hashes de ${table}: ${err?.message || err}`);
		return [];
	}
}

/**
 * Busca rows completas de uma tabela por id (somente as que precisamos syncar).
 */
export async function fetchRowsByIds(pool: Pool, table: string, ids: string[]): Promise<Record<string, any>[]> {
	validateTableName(table);
	if (ids.length === 0) return [];
	const cols = await getColumns(pool, table);
	const selectCols = cols.map((c) => `"${c.name}"`).join(",");
	const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
	return await queryRaw<Record<string, any>>(
		pool,
		`SELECT ${selectCols} FROM "${table}" WHERE id IN (${placeholders})`,
		ids,
	);
}

/**
 * Upsert de rows na base destino usando `INSERT ... ON CONFLICT (id) DO UPDATE`.
 * Processa em batches de SYNC_BATCH_SIZE para nao estourar parametros do PG.
 * Retorna numero de rows que tentamos inserir/atualizar (best-effort).
 */
export async function upsertRows(target: Pool | null, table: string, rows: Record<string, any>[]): Promise<number> {
	if (!target || rows.length === 0) return 0;
	const cols = await getColumns(target, table);
	const nonIdCols = cols.filter((c) => !c.isId);
	const colNames = cols.map((c) => `"${c.name}"`).join(",");
	const updateSet = nonIdCols.map((c) => `"${c.name}" = EXCLUDED."${c.name}"`).join(", ");
	const conflictClause = `ON CONFLICT (id) DO ${updateSet ? `UPDATE SET ${updateSet}` : "NOTHING"}`;

	let affected = 0;
	for (let i = 0; i < rows.length; i += SYNC_BATCH_SIZE) {
		const batch = rows.slice(i, i + SYNC_BATCH_SIZE);
		let paramIdx = 1;
		const valuePlaceholders = batch.map(() => `(${cols.map(() => `$${paramIdx++}`).join(",")})`).join(",");
		const params: any[] = [];
		for (const row of batch) {
			for (const c of cols) {
				const raw = row[c.name] ?? null;
				if (raw === null || raw === undefined) {
					params.push(null);
				} else if (c.type === "json" || c.type === "jsonb") {
					params.push(typeof raw === "string" ? raw : JSON.stringify(raw));
				} else {
					params.push(raw);
				}
			}
		}
		try {
			await target.query({
				text: `INSERT INTO "${table}" (${colNames}) VALUES ${valuePlaceholders} ${conflictClause}`,
				values: params,
			});
			affected += batch.length;
		} catch (err: any) {
			logger.warn(`[DB-SYNC] upsert ${table} falhou: ${err?.message || err}`);
			syncStats.errors++;
		}
	}
	return affected;
}

/**
 * Sincroniza uma unica row (por id) de source -> target. Usado pelo
 * real-time listener (db-realtime.ts) apos receber um NOTIFY. Compara o hash
 * antes de escrever para (a) evitar writes desnecessarios e (b) interromper
 * o ping-pong de notificacoes entre bases (A muda -> notifica -> escreve em B
 * -> B notifica -> tentaria escrever de volta em A, mas o hash ja bate).
 */
export async function syncRow(
	source: DatabaseEntry,
	target: DatabaseEntry,
	table: string,
	id: string,
): Promise<boolean> {
	if (!source.pool || !target.pool) return false;
	try {
		const [[srcHash], [tgtHash]] = await Promise.all([
			queryRaw<{ h: string }>(source.pool, `SELECT md5(t::text) AS h FROM "${table}" t WHERE id = $1`, [id]),
			queryRaw<{ h: string }>(target.pool, `SELECT md5(t::text) AS h FROM "${table}" t WHERE id = $1`, [id]),
		]);

		if (!srcHash) {
			// Row was deleted at the source — this project has no delete-sync
			// policy (see module docstring), so we leave the target untouched.
			return false;
		}
		if (tgtHash && tgtHash.h === srcHash.h) return false; // already in sync

		const rows = await fetchRowsByIds(source.pool, table, [id]);
		if (rows.length === 0) return false;
		await upsertRows(target.pool, table, rows);
		syncStats.realtimeRows++;
		return true;
	} catch (err: any) {
		logger.warn(`[DB-SYNC] syncRow falhou (${table}#${id}, ${source.name}->${target.name}): ${err?.message || err}`);
		syncStats.errors++;
		return false;
	}
}

/**
 * Sincroniza uma tabela de source -> target comparando hashes por id
 * (full diff — caro, usado apenas no startup / recovery / reconciliacao
 * periodica; ver `runIncrementalSync` para o caminho barato).
 */
async function syncTableFullDiff(
	source: Pool,
	target: Pool,
	table: string,
): Promise<{ inserted: number; updated: number }> {
	const [sourceHashes, targetHashes] = await Promise.all([fetchHashes(source, table), fetchHashes(target, table)]);

	if (sourceHashes.length === 0) return { inserted: 0, updated: 0 };

	const sourceMap = new Map(sourceHashes.map((h) => [h.id, h.h]));
	const targetMap = new Map(targetHashes.map((h) => [h.id, h.h]));

	const missingIds: string[] = [];
	const divergentIds: string[] = [];
	for (const [id, h] of sourceMap) {
		if (!targetMap.has(id)) missingIds.push(id);
		else if (targetMap.get(id) !== h) divergentIds.push(id);
	}

	if (missingIds.length === 0 && divergentIds.length === 0) return { inserted: 0, updated: 0 };

	logger.info(`[DB-SYNC]   ${table}: ${missingIds.length} novas, ${divergentIds.length} divergentes`);

	const allIds = [...missingIds, ...divergentIds];
	const rows = await fetchRowsByIds(source, table, allIds);
	await upsertRows(target, table, rows);

	return { inserted: missingIds.length, updated: divergentIds.length };
}

/**
 * Sincroniza todas as tabelas de source -> target (full hash-diff). Nao
 * lanca — erros sao logados por tabela para nao abortar o sync inteiro.
 */
async function syncDatabaseToTarget(
	source: DatabaseEntry,
	target: DatabaseEntry,
): Promise<{ inserted: number; updated: number }> {
	if (!source.pool || !target.pool) return { inserted: 0, updated: 0 };

	let totalInserted = 0;
	let totalUpdated = 0;
	logger.info(`[DB-SYNC] Sincronizando (full) ${source.name} → ${target.name}`);

	for (const table of TABLES_IN_ORDER) {
		try {
			const r = await syncTableFullDiff(source.pool, target.pool, table);
			totalInserted += r.inserted;
			totalUpdated += r.updated;
		} catch (err: any) {
			logger.warn(`[DB-SYNC] ${table} falhou: ${err?.message || err}`);
			syncStats.errors++;
		}
	}

	logger.info(
		`[DB-SYNC] Concluido (full) ${source.name} → ${target.name}: ${totalInserted} novas, ${totalUpdated} atualizadas`,
	);
	syncStats.rowsInserted += totalInserted;
	syncStats.rowsUpdated += totalUpdated;

	// Seed incremental cursors to "now" so the fast loop only looks forward
	// from this known-consistent baseline.
	const now = new Date();
	for (const table of TABLES_IN_ORDER) {
		cursors.set(cursorKey(target.name, table), now);
	}

	return { inserted: totalInserted, updated: totalUpdated };
}

/**
 * Rodada de full-diff: escolhe primaria atual e sincroniza para cada backup
 * saudavel em paralelo (Promise.allSettled). Protegido por `isSyncing`.
 */
async function fullSyncLoop(): Promise<void> {
	if (isSyncing) return;
	const primary = dbRegistry.getPrimary();
	if (!primary?.pool) return;

	const backups = dbRegistry.getHealthy().filter((e) => e.name !== primary.name);
	if (backups.length === 0) return;

	isSyncing = true;
	try {
		syncStats.runs++;
		lastSyncAt = Date.now();
		await Promise.allSettled(
			backups.map(async (backup) => {
				try {
					await syncDatabaseToTarget(primary, backup);
				} catch (err: any) {
					logger.warn(`[DB-SYNC] Falha ${primary.name} → ${backup.name}: ${err?.message || err}`);
					syncStats.errors++;
				}
			}),
		);
	} finally {
		isSyncing = false;
	}
}

/**
 * Rodada de catch-up incremental: para cada backup saudavel, busca rows com
 * cursor (updatedAt/createdAt) maior que o ultimo visto e faz upsert. Muito
 * mais barato que o full diff — seguro para rodar a cada poucos segundos.
 */
async function incrementalSyncLoop(): Promise<void> {
	const primary = dbRegistry.getPrimary();
	const primaryPool = primary?.pool;
	if (!primary || !primaryPool) return;
	const backups = dbRegistry.getHealthy().filter((e) => e.name !== primary.name);
	if (backups.length === 0) return;

	syncStats.incrementalRuns++;
	lastIncrementalAt = Date.now();

	await Promise.allSettled(
		backups.map(async (backup) => {
			const backupPool = backup.pool;
			if (!backupPool) return;
			for (const table of TABLES_IN_ORDER) {
				const key = cursorKey(backup.name, table);
				const since = cursors.get(key);
				// No baseline yet (full sync hasn't run for this target) — skip;
				// the full-diff pass will seed the cursor once it completes.
				if (!since) continue;

				const cursorCol = CURSOR_COLUMN[table];
				try {
					const rows = await queryRaw<Record<string, any>>(
						primaryPool,
						`SELECT * FROM "${table}" WHERE "${cursorCol}" > $1 ORDER BY "${cursorCol}" ASC LIMIT $2`,
						[since, INCREMENTAL_BATCH_LIMIT],
					);
					if (rows.length === 0) continue;

					await upsertRows(backupPool, table, rows);
					syncStats.incrementalRows += rows.length;
					cursors.set(key, rows[rows.length - 1][cursorCol]);
				} catch (err: any) {
					logger.warn(
						`[DB-SYNC] incremental ${table} (${primary.name}->${backup.name}) falhou: ${err?.message || err}`,
					);
					syncStats.errors++;
				}
			}
		}),
	);
}

/**
 * Inicia os workers de sync: full-diff no startup (baseline) + periodico
 * como safety net profundo, e o loop incremental rapido para catch-up.
 */
export function startSyncWorker(): void {
	if (process.env.MICRO_MODE === "1") {
		logger.info("[DB-SYNC] MICRO_MODE: sync worker desativado");
		return;
	}
	if (fullSyncInterval || incrementalInterval) {
		logger.info("[DB-SYNC] Ja rodando");
		return;
	}
	if (FULL_SYNC_OFF) {
		logger.info(`[DB-SYNC] Worker iniciado (FULL_SYNC_OFF=1: solo incremental cada ${INCREMENTAL_INTERVAL / 1000}s)`);
		setTimeout(() => {
			incrementalSyncLoop();
			incrementalInterval = setInterval(incrementalSyncLoop, INCREMENTAL_INTERVAL);
		}, SYNC_START_DELAY);
		return;
	}
	logger.info(
		`[DB-SYNC] Worker iniciado (incremental a cada ${INCREMENTAL_INTERVAL / 1000}s, full-diff a cada ${
			FULL_SYNC_INTERVAL / 60000
		}min)`,
	);
	setTimeout(() => {
		fullSyncLoop(); // baseline — seeds incremental cursors
		fullSyncInterval = setInterval(fullSyncLoop, FULL_SYNC_INTERVAL);

		setTimeout(() => {
			incrementalSyncLoop();
			incrementalInterval = setInterval(incrementalSyncLoop, INCREMENTAL_INTERVAL);
		}, INCREMENTAL_INTERVAL);
	}, SYNC_START_DELAY);
}

/**
 * Para os workers. Salva no shutdown.
 */
export function stopSyncWorker(): void {
	if (fullSyncInterval) {
		clearInterval(fullSyncInterval);
		fullSyncInterval = null;
	}
	if (incrementalInterval) {
		clearInterval(incrementalInterval);
		incrementalInterval = null;
	}
	logger.info("[DB-SYNC] Parado");
}

/**
 * Forca sync FULL imediato (ex: apos recovery detectado pelo db-health).
 * Ignora `isSyncing` para nao esperar a rodada periodica — concorrencia e
 * segura porque usamos ON CONFLICT. Aceita um nome de target especifico ou
 * sync para todos os backups saudaveis.
 */
export async function triggerSync(targetName?: string): Promise<boolean> {
	const primary = dbRegistry.getPrimary();
	if (!primary?.pool) {
		logger.warn("[DB-SYNC] triggerSync: sem primaria saudavel");
		return false;
	}

	const targets = targetName
		? dbRegistry.getAll().filter((e) => e.name === targetName && e.status !== "disconnected")
		: dbRegistry.getHealthy().filter((e) => e.name !== primary.name);

	if (targets.length === 0) return false;

	logger.info(`[DB-SYNC] triggerSync (full) disparado para ${targets.map((t) => t.name).join(", ")}`);
	for (const target of targets) {
		try {
			await syncDatabaseToTarget(primary, target);
		} catch (err: any) {
			logger.warn(`[DB-SYNC] triggerSync falhou para ${target.name}: ${err?.message || err}`);
		}
	}
	return true;
}

/**
 * Estatisticas para o endpoint /api/health.
 */
export function getSyncStats(): SyncStats & {
	isSyncing: boolean;
	lastSyncAt: string | null;
	lastIncrementalAt: string | null;
} {
	return {
		...syncStats,
		isSyncing,
		lastSyncAt: lastSyncAt ? new Date(lastSyncAt).toISOString() : null,
		lastIncrementalAt: lastIncrementalAt ? new Date(lastIncrementalAt).toISOString() : null,
	};
}

export { syncDatabaseToTarget, TABLES_IN_ORDER };
