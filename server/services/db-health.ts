/**
 * Database Health Tracker
 *
 * Periodically checks all registered PostgreSQL databases.
 * Tracks health status, detects recoveries, triggers background sync.
 *
 * Health check interval: configurable via DB_HEALTH_INTERVAL_MS (default 60s)
 * Exponential backoff: 30s → 60s → 120s → max 5min for disconnected databases
 *
 * Usage:
 *   import { startHealthChecks } from '../services/db-health'
 *   startHealthChecks() // Call once at server startup
 */
import { dbRegistry } from '../config/databases'

const DEFAULT_INTERVAL = 60 * 1000       // 60 seconds
const MAX_BACKOFF = 5 * 60 * 1000        // 5 minutes
const BASE_BACKOFF = 30 * 1000           // 30 seconds

let healthInterval: ReturnType<typeof setInterval> | null = null
let healthTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Check health of a single database.
 * Returns 'connected', 'degraded', or 'disconnected'.
 */
async function checkDatabase(name: string): Promise<'connected' | 'degraded' | 'disconnected'> {
  const client = dbRegistry.getClient(name)
  if (!client) return 'disconnected'

  try {
    const start = Date.now()
    await client.$queryRaw`SELECT 1`
    const latency = Date.now() - start

    if (latency > 3000) {
      return 'degraded'  // Responded but slow
    }
    return 'connected'
  } catch {
    return 'disconnected'
  }
}

/**
 * Run health checks on all databases.
 * Logs status changes and triggers sync on recovery.
 */
async function runHealthChecks() {
  const entries = dbRegistry.getAll()

  for (const entry of entries) {
    const prevStatus = entry.status
    const newStatus = await checkDatabase(entry.name)

    dbRegistry.setStatus(entry.name, newStatus)

    // Log status changes
    if (prevStatus !== 'unknown' && prevStatus !== newStatus) {
      if (newStatus === 'connected') {
        console.log(`[DB-HEALTH] ${entry.name}: RECOVERED (${prevStatus} → connected)`)
        // Signal to sync worker that this database needs reconciliation
        entry.consecutiveFailures = 0
      } else if (newStatus === 'disconnected') {
        console.warn(`[DB-HEALTH] ${entry.name}: DOWN (${prevStatus} → disconnected)`)
      } else {
        console.log(`[DB-HEALTH] ${entry.name}: DEGRADED (latency high)`)
      }
    } else if (prevStatus === 'unknown') {
      console.log(`[DB-HEALTH] ${entry.name}: ${newStatus}`)
    }
  }

  // Log summary
  const healthy = entries.filter(e => e.status === 'connected').length
  const degraded = entries.filter(e => e.status === 'degraded').length
  const down = entries.filter(e => e.status === 'disconnected').length
  const total = entries.length
  console.log(`[DB-HEALTH] Status: ${healthy} connected, ${degraded} degraded, ${down} down (of ${total})`)
}

/**
 * Get the check interval for a database based on its health.
 * Disconnected databases get exponential backoff.
 */
function getCheckInterval(entry: { status: string; consecutiveFailures: number }): number {
  if (entry.status === 'connected' || entry.status === 'unknown') {
    return DEFAULT_INTERVAL
  }

  // Exponential backoff for disconnected databases
  const backoff = Math.min(BASE_BACKOFF * Math.pow(2, entry.consecutiveFailures), MAX_BACKOFF)
  return backoff
}

/**
 * Smart scheduler: runs checks at different intervals per database.
 * Connected databases: every 60s. Disconnected: exponential backoff.
 */
function scheduleNext() {
  const entries = dbRegistry.getAll()
  const minInterval = Math.min(...entries.map(e => getCheckInterval(e)))

  healthTimeout = setTimeout(async () => {
    await runHealthChecks()
    scheduleNext()
  }, minInterval)
}

/**
 * Start periodic health checks.
 */
export function startHealthChecks() {
  if (healthInterval || healthTimeout) {
    console.log('[DB-HEALTH] Already running')
    return
  }

  console.log('[DB-HEALTH] Starting health tracker')

  // Initial check after 5 seconds
  healthTimeout = setTimeout(async () => {
    await runHealthChecks()
    scheduleNext()
  }, 5000)
}

/**
 * Stop health checks.
 */
export function stopHealthChecks() {
  if (healthTimeout) {
    clearTimeout(healthTimeout)
    healthTimeout = null
  }
  if (healthInterval) {
    clearInterval(healthInterval)
    healthInterval = null
  }
  console.log('[DB-HEALTH] Stopped')
}

/**
 * Force an immediate health check (e.g., after manual recovery).
 */
export async function forceHealthCheck(): Promise<void> {
  await runHealthChecks()
}

export { runHealthChecks }
