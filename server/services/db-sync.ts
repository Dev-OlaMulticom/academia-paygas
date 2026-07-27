/**
 * Background Database Sync Worker — sync por diferencas de hash
 *
 * Mantem as bases de backup consistentes com a primaria, em background, sem
 * bloquear requests. Estrategia:
 *
 *   1. Para cada backup saudavel, compara `md5(row::text)` entre primaria e
 *      backup, por tabela e por id.
 *   2. Rows que faltam no backup (id ausente) -> INSERT via ON CONFLICT.
 *   3. Rows presentes em ambos com hash divergente -> UPDATE (UPSERT).
 *   4. Nunca deleta (nao ha politica de soft-delete definida).
 *   5. Sync dispara em duas situacoes:
 *        - Periodicamente (SYNC_INTERVAL, default 60s), em background.
 *        - Imediatamente quando db-health detecta uma base que se recuperou.
 *
 * Fonte de verdade: `dbRegistry.getPrimary()`. Todos os backups convergem
 * para ela. Se a primaria mudar (failover), a nova primaria passa a ser a
 * fuente — cuidado: sincronizacao conflitante entre duas primarias antigas
 * poderia misturar dados. Em pratica, a primaria nova ja foi escolhida por
 * saude, entao e a mais atualizada.
 *
 * Nao bloqueia API: syncLoop usa Promise.allSettled, batches de 25 rows,
 * e `ON CONFLICT (id) DO UPDATE` que e seguro para colisões.
 *
 * Usage:
 *   import { startSyncWorker } from '../services/db-sync'
 *   startSyncWorker()
 *
 *   import { triggerSync } from '../services/db-sync'
 *   triggerSync('PG_2')   // forca sync imediato para a base recuperada
 *
 *   import { getSyncStats } from '../services/db-sync'
 *   getSyncStats()        // -> { runs, rowsInserted, rowsUpdated, errors, ... }
 */
import type { PrismaClient } from "@prisma/client";
import { type DatabaseEntry, dbRegistry } from "../config/databases";
import logger from "../lib/logger";

const SYNC_INTERVAL = 60 * 1000;
const SYNC_BATCH_SIZE = 25;
const SYNC_START_DELAY = 30 * 1000;

// Tabelas em ordem de dependencias (pais antes dos filhos) para nao violar FKs.
const TABLES_IN_ORDER = [
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
}

const syncStats: SyncStats = {
	runs: 0,
	rowsInserted: 0,
	rowsUpdated: 0,
	errors: 0,
};

let syncInterval: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;
let lastSyncAt: number | null = null;

/**
 * Obtem definicoes de colunas de uma tabela (caching por nome). Usa
 * information_schema para nao depender do schema do Prisma.
 */
async function getColumns(client: PrismaClient, table: string): Promise<ColumnDef[]> {
	const cached = columnCache.get(table);
	if (cached) return cached;
	const rows = (await client.$queryRawUnsafe(
		`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
		table,
	)) as Array<{ column_name: string; data_type: string }>;
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
async function fetchHashes(client: PrismaClient, table: string): Promise<Array<{ id: string; h: string }>> {
	try {
		return (await client.$queryRawUnsafe(`SELECT id, md5(t::text) AS h FROM "${table}" t`)) as Array<{
			id: string;
			h: string;
		}>;
	} catch (err: any) {
		logger.warn(`[DB-SYNC] Falha ao ler hashes de ${table}: ${err?.message || err}`);
		return [];
	}
}

/**
 * Busca rows completas de uma tabela por id (somente as que precisamos syncar).
 */
async function fetchRowsByIds(client: PrismaClient, table: string, ids: string[]): Promise<Record<string, any>[]> {
	if (ids.length === 0) return [];
	const cols = await getColumns(client, table);
	const selectCols = cols.map((c) => `"${c.name}"`).join(",");
	const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
	return (await client.$queryRawUnsafe(
		`SELECT ${selectCols} FROM "${table}" WHERE id IN (${placeholders})`,
		...ids,
	)) as Record<string, any>[];
}

/**
 * Upsert de rows na base destino usando `INSERT ... ON CONFLICT (id) DO UPDATE`.
 * Processa em batches de SYNC_BATCH_SIZE para nao estourar parametros do PG.
 * Retorna numero de rows que tentamos inserir/atualizar (best-effort).
 */
async function upsertRows(target: PrismaClient, table: string, rows: Record<string, any>[]): Promise<number> {
	if (rows.length === 0) return 0;
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
			for (const c of cols) params.push(row[c.name] ?? null);
		}
		try {
			await target.$queryRawUnsafe(
				`INSERT INTO "${table}" (${colNames}) VALUES ${valuePlaceholders} ${conflictClause}`,
				...params,
			);
			affected += batch.length;
		} catch (err: any) {
			logger.warn(`[DB-SYNC] upsert ${table} falhou: ${err?.message || err}`);
			syncStats.errors++;
		}
	}
	return affected;
}

/**
 * Sincroniza uma tabela de source -> target comparando hashes por id.
 */
async function syncTable(
	source: PrismaClient,
	target: PrismaClient,
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
 * Sincroniza todas as tabelas de source -> target. Nao lanca — erros sao
 * logados por tabela para nao abortar o sync inteiro.
 */
async function syncDatabaseToTarget(
	source: DatabaseEntry,
	target: DatabaseEntry,
): Promise<{ inserted: number; updated: number }> {
	if (!source.client || !target.client) return { inserted: 0, updated: 0 };

	let totalInserted = 0;
	let totalUpdated = 0;
	logger.info(`[DB-SYNC] Sincronizando ${source.name} → ${target.name}`);

	for (const table of TABLES_IN_ORDER) {
		try {
			const r = await syncTable(source.client, target.client, table);
			totalInserted += r.inserted;
			totalUpdated += r.updated;
		} catch (err: any) {
			logger.warn(`[DB-SYNC] ${table} falhou: ${err?.message || err}`);
			syncStats.errors++;
		}
	}

	logger.info(
		`[DB-SYNC] Concluido ${source.name} → ${target.name}: ${totalInserted} novas, ${totalUpdated} atualizadas`,
	);
	syncStats.rowsInserted += totalInserted;
	syncStats.rowsUpdated += totalUpdated;
	return { inserted: totalInserted, updated: totalUpdated };
}

/**
 * Rodada de sync: escolhe primaria atual e sincroniza para cada backup saudavel
 * em paralelo (Promise.allSettled). Protegido por `isSyncing` para evitar
 * concorrencia entre rodadas periodicas.
 */
async function syncLoop(): Promise<void> {
	if (isSyncing) return;
	const primary = dbRegistry.getPrimary();
	if (!primary?.client) return;

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
 * Inicia o worker de sync periodica. Primeira rodada apos SYNC_START_DELAY.
 */
export function startSyncWorker(): void {
	if (syncInterval) {
		logger.info("[DB-SYNC] Ja rodando");
		return;
	}
	logger.info(`[DB-SYNC] Worker iniciado (intervalo ${SYNC_INTERVAL / 1000}s)`);
	setTimeout(() => {
		syncLoop();
		syncInterval = setInterval(syncLoop, SYNC_INTERVAL);
	}, SYNC_START_DELAY);
}

/**
 * Para o worker. Salva no shutdown.
 */
export function stopSyncWorker(): void {
	if (syncInterval) {
		clearInterval(syncInterval);
		syncInterval = null;
		logger.info("[DB-SYNC] Parado");
	}
}

/**
 * Forca sync imediato (ex: apos recovery detectado pelo db-health).
 * Ignora `isSyncing` para nao esperar a rodada periodica — concorrencia e
 * segura porque usamos ON CONFLICT. Aceita um nome de target especifico ou
 * sync para todos os backups saudaveis.
 */
export async function triggerSync(targetName?: string): Promise<boolean> {
	const primary = dbRegistry.getPrimary();
	if (!primary?.client) {
		logger.warn("[DB-SYNC] triggerSync: sem primaria saudavel");
		return false;
	}

	const targets = targetName
		? dbRegistry.getAll().filter((e) => e.name === targetName && e.status !== "disconnected")
		: dbRegistry.getHealthy().filter((e) => e.name !== primary.name);

	if (targets.length === 0) return false;

	logger.info(`[DB-SYNC] triggerSync disparado para ${targets.map((t) => t.name).join(", ")}`);
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
} {
	return {
		...syncStats,
		isSyncing,
		lastSyncAt: lastSyncAt ? new Date(lastSyncAt).toISOString() : null,
	};
}

export { syncDatabaseToTarget };
