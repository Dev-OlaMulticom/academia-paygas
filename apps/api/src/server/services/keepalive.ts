/**
 * Unified Keep-Alive Service
 *
 * Prevents all PostgreSQL databases from going inactive/paused.
 * - Supabase: pauses after ~7 days inactivity
 * - Nhost: pauses after 7 days inactivity
 *
 * Pings all registered databases every 12 hours (configurable).
 * First ping after 5 minutes to allow connections to stabilize.
 *
 * Usage:
 *   import { startKeepAlive } from '../services/keepalive'
 *   startKeepAlive() // Call once at server startup
 */
import { dbRegistry } from "../config/databases";
import logger from "../lib/logger";

const DEFAULT_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours
const FIRST_DELAY = 5 * 60 * 1000; // 5 minutes

let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
let keepAliveTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Ping all registered databases.
 * Logs results and updates health status.
 */
async function pingAllDatabases(): Promise<void> {
	const entries = dbRegistry.getAll();
	logger.info(`[KEEP-ALIVE] Pinging ${entries.length} database(s)...`);

	for (const entry of entries) {
		if (!entry.client) {
			logger.info(`[KEEP-ALIVE]   ${entry.name}: no client (skipped)`);
			continue;
		}

		try {
			const start = Date.now();
			await entry.client.$queryRaw`SELECT 1`;
			const latency = Date.now() - start;

			logger.info(`[KEEP-ALIVE]   ${entry.name}: OK (${latency}ms)`);
			dbRegistry.setStatus(entry.name, "connected");
		} catch (error: any) {
			logger.warn(`[KEEP-ALIVE]   ${entry.name}: FAILED — ${error?.message || error}`);
			dbRegistry.setStatus(entry.name, "disconnected", error?.message);
		}
	}
}

/**
 * Start the keep-alive service.
 * Pings all databases every 12 hours. First ping after 5 minutes.
 */
export function startKeepAlive() {
	if (process.env.MICRO_MODE === "1") {
		logger.info("[KEEP-ALIVE] MICRO_MODE: keep-alive desativado");
		return;
	}
	if (keepAliveInterval || keepAliveTimeout) {
		logger.info("[KEEP-ALIVE] Already running");
		return;
	}

	const interval = parseInt(process.env.KEEPALIVE_INTERVAL_MS || "", 10) || DEFAULT_INTERVAL;
	const firstDelay = parseInt(process.env.KEEPALIVE_FIRST_DELAY_MS || "", 10) || FIRST_DELAY;

	logger.info(`[KEEP-ALIVE] Starting (interval: ${interval / 1000}s, first ping: ${firstDelay / 1000}s)`);

	keepAliveTimeout = setTimeout(async () => {
		await pingAllDatabases();

		keepAliveInterval = setInterval(async () => {
			await pingAllDatabases();
		}, interval);
	}, firstDelay);
}

/**
 * Stop the keep-alive service.
 */
export function stopKeepAlive() {
	if (keepAliveTimeout) {
		clearTimeout(keepAliveTimeout);
		keepAliveTimeout = null;
	}
	if (keepAliveInterval) {
		clearInterval(keepAliveInterval);
		keepAliveInterval = null;
		logger.info("[KEEP-ALIVE] Stopped");
	}
}

/**
 * Force an immediate ping of all databases.
 */
export async function forceKeepAlive(): Promise<void> {
	await pingAllDatabases();
}
