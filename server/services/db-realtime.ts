/**
 * Real-time Sync via Postgres LISTEN/NOTIFY
 *
 * Every registered database has triggers (see
 * prisma/migrations/20260824000000_add_realtime_sync_triggers) that call
 * `pg_notify('academia_sync', '{"table":..,"id":..,"op":..}')` on every
 * INSERT/UPDATE/DELETE. This service keeps one dedicated `pg.Client` per
 * healthy database LISTENing on that channel — completely separate from the
 * Prisma connection pool, since Prisma doesn't expose LISTEN/NOTIFY.
 *
 * On notification, the changed row is mirrored to every OTHER healthy
 * database immediately (via `syncRow` in db-sync.ts), instead of waiting for
 * the periodic sync loops. `syncRow` compares hashes before writing, which
 * both avoids redundant writes and naturally stops any notify ping-pong
 * between databases (A -> notifies -> writes to B -> B notifies -> would
 * write back to A, but A already matches, so it's a no-op).
 *
 * LISTEN/NOTIFY is fire-and-forget: a notification raised while nobody is
 * connected is lost forever. This is why the incremental + full-diff sync
 * layers in db-sync.ts still exist as safety nets — this service is the fast
 * path, not the only path.
 *
 * Usage:
 *   import { startRealtimeSync, stopRealtimeSync } from "../services/db-realtime"
 *   startRealtimeSync()   // connects a LISTEN client for every healthy DB
 *
 *   import { attachRealtimeListener } from "../services/db-realtime"
 *   attachRealtimeListener("PG_2")   // (re)connect a single DB, e.g. on recovery
 *
 *   import { getRealtimeStats } from "../services/db-realtime"
 *   getRealtimeStats()
 */
import { type Notification, Client as PgClient } from "pg";
import { dbRegistry, resolveSslOption } from "../config/databases";
import logger from "../lib/logger";
import { syncRow } from "./db-sync";

const CHANNEL = "academia_sync";
const RECONNECT_BASE_DELAY = 2000;
const RECONNECT_MAX_DELAY = 30000;

interface NotifyPayload {
	table: string;
	id: string;
	op: "INSERT" | "UPDATE" | "DELETE";
}

interface ListenerState {
	client: PgClient;
	reconnectAttempts: number;
	reconnectTimer: ReturnType<typeof setTimeout> | null;
}

const listeners = new Map<string, ListenerState>();

const stats = {
	eventsReceived: 0,
	eventsPropagated: 0,
	errors: 0,
	reconnects: 0,
};

/**
 * Handles a single NOTIFY payload from `name`: mirrors the changed row to
 * every other currently-healthy database. DELETE is logged but not
 * propagated — this project has no delete-sync policy (see db-sync.ts).
 */
async function handleNotification(name: string, rawPayload: string | undefined): Promise<void> {
	if (!rawPayload) return;
	let payload: NotifyPayload;
	try {
		payload = JSON.parse(rawPayload);
	} catch {
		logger.warn(`[DB-REALTIME] payload invalido de ${name}: ${rawPayload}`);
		return;
	}

	stats.eventsReceived++;

	if (payload.op === "DELETE") {
		logger.info(
			`[DB-REALTIME] ${name}: DELETE ${payload.table}#${payload.id} (nao propagado — sem politica de delete)`,
		);
		return;
	}

	const source = dbRegistry.getAll().find((e) => e.name === name);
	if (!source) return;

	const targets = dbRegistry.getHealthy().filter((e) => e.name !== name);
	for (const target of targets) {
		try {
			const changed = await syncRow(source, target, payload.table, payload.id);
			if (changed) {
				stats.eventsPropagated++;
				logger.info(`[DB-REALTIME] ${payload.table}#${payload.id} ${name} → ${target.name} (${payload.op})`);
			}
		} catch (err: any) {
			stats.errors++;
			logger.warn(
				`[DB-REALTIME] falha ao propagar ${payload.table}#${payload.id} ${name}->${target.name}: ${err?.message}`,
			);
		}
	}
}

/**
 * Connects (or reconnects) a LISTEN client for a single registered database.
 * Safe to call repeatedly — no-ops if already connected.
 */
export function attachRealtimeListener(name: string): void {
	if (listeners.has(name)) return; // already connected or reconnect scheduled

	const entry = dbRegistry.getAll().find((e) => e.name === name);
	if (!entry?.url) return;

	const client = new PgClient({ connectionString: entry.url, ssl: resolveSslOption(entry.url) });
	const state: ListenerState = { client, reconnectAttempts: 0, reconnectTimer: null };
	listeners.set(name, state);

	client.on("notification", (msg: Notification) => {
		void handleNotification(name, msg.payload);
	});

	client.on("error", (err: Error) => {
		logger.warn(`[DB-REALTIME] erro na conexao LISTEN de ${name}: ${err.message}`);
	});

	client.on("end", () => {
		listeners.delete(name);
		scheduleReconnect(name, state.reconnectAttempts);
	});

	client
		.connect()
		.then(() => client.query(`LISTEN ${CHANNEL}`))
		.then(() => {
			state.reconnectAttempts = 0;
			logger.info(`[DB-REALTIME] LISTEN ativo em ${name}`);
		})
		.catch((err: Error) => {
			logger.warn(`[DB-REALTIME] falha ao conectar LISTEN em ${name}: ${err.message}`);
			listeners.delete(name);
			scheduleReconnect(name, state.reconnectAttempts);
		});
}

function scheduleReconnect(name: string, attempts: number): void {
	const delay = Math.min(RECONNECT_BASE_DELAY * 2 ** attempts, RECONNECT_MAX_DELAY);
	setTimeout(() => {
		stats.reconnects++;
		attachRealtimeListener(name);
	}, delay);
}

/**
 * Detaches (closes) the LISTEN client for a single database, e.g. when
 * db-health marks it as disconnected — no point holding a dead socket.
 */
export function detachRealtimeListener(name: string): void {
	const state = listeners.get(name);
	if (!state) return;
	listeners.delete(name);
	if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
	state.client.removeAllListeners();
	state.client.end().catch(() => {});
}

/**
 * Connects a LISTEN client for every currently-healthy registered database.
 * Called once at startup, after the initial health check has classified who
 * is online.
 */
export function startRealtimeSync(): void {
	const healthy = dbRegistry.getHealthy();
	logger.info(`[DB-REALTIME] Iniciando LISTEN em ${healthy.length} base(s): ${healthy.map((e) => e.name).join(", ")}`);
	for (const entry of healthy) {
		attachRealtimeListener(entry.name);
	}
}

/**
 * Closes every LISTEN client. Called on server shutdown.
 */
export function stopRealtimeSync(): void {
	for (const name of [...listeners.keys()]) {
		detachRealtimeListener(name);
	}
	logger.info("[DB-REALTIME] Parado");
}

export function getRealtimeStats() {
	return {
		...stats,
		listening: [...listeners.keys()],
	};
}
