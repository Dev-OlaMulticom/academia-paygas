/**
 * Database Health Tracker
 *
 * Monitora continuamente todas as bases PostgreSQL registradas:
 *   - Mede latencia em cada check (ms para `SELECT 1`)
 *   - Mantém janela deslizante de amostras para avg/min/max/uptime
 *   - Detecta transições offline → online (RECOVERED) e dispara sync imediato
 *   - Invalida cache de delegates quando a primaria muda
 *
 * Métricas disponíveis via `getLatencyStats()` (consumido em /api/health).
 * Intervalo para DBs conectadas: 60s (DEFAULT_INTERVAL). DBs offline usam
 * backoff exponencial (30s → 60s → 120s → max 5min) para não saturar logs.
 *
 * Usage:
 *   import { startHealthChecks } from "../services/db-health"
 *   startHealthChecks()
 *
 *   import { getLatencyStats } from "../services/db-health"
 *   getLatencyStats()
 */
import { dbRegistry } from "../config/databases";
import { invalidateDelegateCache } from "../lib/db-models";
import logger from "../lib/logger";

const DEFAULT_INTERVAL = 60 * 1000;
const MAX_BACKOFF = 5 * 60 * 1000;
const BASE_BACKOFF = 30 * 1000;
const LATENCY_WINDOW = 20;
const MAX_LATENCY_OK = 3000;

interface LatencySample {
	ts: number;
	ms: number;
	online: boolean;
}

const latencyMap = new Map<string, LatencySample[]>();

/**
 * Registra uma amostra de latência na janela deslizante de cada base.
 */
function pushSample(name: string, ms: number, online: boolean): void {
	let arr = latencyMap.get(name);
	if (!arr) {
		arr = [];
		latencyMap.set(name, arr);
	}
	arr.push({ ts: Date.now(), ms, online });
	if (arr.length > LATENCY_WINDOW) arr.shift();
}

export interface LatencyStat {
	online: boolean;
	avgMs: number;
	minMs: number;
	maxMs: number;
	lastCheck: string | null;
	uptimePct: number;
	samples: number;
	status: string;
}

/**
 * Retorna estatísticas de latência por base (média/min/max das amostras
 * online, uptime %, número de amostras, status atual). Para o /api/health.
 */
export function getLatencyStats(): Record<string, LatencyStat> {
	const result: Record<string, LatencyStat> = {};
	for (const entry of dbRegistry.getAll()) {
		const arr = latencyMap.get(entry.name) || [];
		const onlineSamples = arr.filter((s) => s.online);
		const avg =
			onlineSamples.length > 0 ? Math.round(onlineSamples.reduce((a, s) => a + s.ms, 0) / onlineSamples.length) : 0;
		const min = onlineSamples.length > 0 ? Math.min(...onlineSamples.map((s) => s.ms)) : 0;
		const max = onlineSamples.length > 0 ? Math.max(...onlineSamples.map((s) => s.ms)) : 0;
		const online = entry.status === "connected" || entry.status === "degraded";
		const onlineCount = arr.filter((s) => s.online).length;
		result[entry.name] = {
			online,
			avgMs: avg,
			minMs: min,
			maxMs: max,
			lastCheck: entry.lastCheck?.toISOString() || null,
			uptimePct: arr.length > 0 ? Math.round((onlineCount / arr.length) * 100) : online ? 100 : 0,
			samples: arr.length,
			status: entry.status,
		};
	}
	return result;
}

/**
 * Mede latencia de uma base. Retorna status + latencia em ms (ou null se offline).
 */
async function checkDatabase(
	name: string,
): Promise<{ status: "connected" | "degraded" | "disconnected"; ms: number | null }> {
	const client = dbRegistry.getClient(name);
	if (!client) return { status: "disconnected", ms: null };
	try {
		const start = Date.now();
		await client.$queryRaw`SELECT 1`;
		const ms = Date.now() - start;
		if (ms > MAX_LATENCY_OK) return { status: "degraded", ms };
		return { status: "connected", ms };
	} catch {
		return { status: "disconnected", ms: null };
	}
}

/**
 * Executa uma rodada de checks em todas as bases. Loga transições de status,
 * invalida cache de delegates quando a primaria muda, e dispara sync imediato
 * para qualquer base que se recuperou.
 */
async function runHealthChecks(): Promise<void> {
	const entries = dbRegistry.getAll();
	let primaryChanged = false;
	const recoveredNames: string[] = [];

	for (const entry of entries) {
		const prevStatus = entry.status;
		const { status: newStatus, ms } = await checkDatabase(entry.name);

		dbRegistry.setStatus(entry.name, newStatus);
		pushSample(entry.name, ms ?? 0, newStatus === "connected" || newStatus === "degraded");

		if (prevStatus !== "unknown" && prevStatus !== newStatus) {
			if (newStatus === "connected") {
				logger.info(`[DB-HEALTH] ${entry.name}: RECUPEROU (${prevStatus} → connected) latencia=${ms}ms`);
				entry.consecutiveFailures = 0;
				recoveredNames.push(entry.name);
			} else if (newStatus === "disconnected") {
				logger.warn(`[DB-HEALTH] ${entry.name}: OFFLINE (${prevStatus} → disconnected)`);
			} else {
				logger.info(`[DB-HEALTH] ${entry.name}: DEGRADADO (latencia ${ms}ms)`);
			}
			primaryChanged = true;
		} else if (prevStatus === "unknown") {
			logger.info(`[DB-HEALTH] ${entry.name}: ${newStatus}${ms !== null ? ` (${ms}ms)` : ""}`);
		}
	}

	if (primaryChanged) {
		invalidateDelegateCache();
		const primary = dbRegistry.getPrimary();
		if (primary) logger.info(`[DB-HEALTH] Primaria agora: ${primary.name}`);
	}

	// Dispara sync imediato (em background) para cada base que se recuperou.
	// Import dinamico para evitar dependencia circular com db-sync.
	if (recoveredNames.length > 0) {
		try {
			const { triggerSync } = await import("./db-sync");
			for (const name of recoveredNames) {
				triggerSync(name).catch((err: any) =>
					logger.warn(`[DB-HEALTH] sync trigger fail (${name}):`, err?.message || err),
				);
			}
		} catch (err: any) {
			logger.warn(`[DB-HEALTH] Nao foi possivel importar db-sync:`, err?.message || err);
		}
	}

	const summary = entries.map((e) => `${e.name}=${e.status}`).join(", ");
	logger.info(`[DB-HEALTH] ${summary}`);
}

/**
 * Intervalo de check por base: conectadas usam 60s, offline usam backoff.
 */
function getCheckInterval(entry: { status: string; consecutiveFailures: number }): number {
	if (entry.status === "connected" || entry.status === "unknown") {
		return DEFAULT_INTERVAL;
	}
	return Math.min(BASE_BACKOFF * 2 ** entry.consecutiveFailures, MAX_BACKOFF);
}

/**
 * Scheduler adaptativo: proximo check no menor intervalo entre todas as bases.
 */
function scheduleNext(): void {
	const entries = dbRegistry.getAll();
	if (entries.length === 0) return;
	const minInterval = Math.min(...entries.map((e) => getCheckInterval(e)));

	healthTimeout = setTimeout(async () => {
		await runHealthChecks();
		scheduleNext();
	}, minInterval);
}

let healthTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Inicia o monitor de saude. Primeiro check apos 5s, depois schedule adaptativo.
 */
export function startHealthChecks(): void {
	if (healthTimeout) {
		logger.info("[DB-HEALTH] Ja rodando");
		return;
	}
	logger.info("[DB-HEALTH] Iniciando monitor de bases");
	healthTimeout = setTimeout(async () => {
		await runHealthChecks();
		scheduleNext();
	}, 5000);
}

/**
 * Para o monitor. Salva no shutdown do servidor.
 */
export function stopHealthChecks(): void {
	if (healthTimeout) {
		clearTimeout(healthTimeout);
		healthTimeout = null;
	}
	logger.info("[DB-HEALTH] Parado");
}

/**
 * Forca um check imediato (manual).
 */
export async function forceHealthCheck(): Promise<void> {
	await runHealthChecks();
}

export { runHealthChecks };
