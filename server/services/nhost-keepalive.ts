/**
 * Nhost Keep-Alive Service
 *
 * Prevents Nhost free-tier databases from pausing due to inactivity.
 * Nhost pauses databases after 7 days without connections.
 *
 * This service sends a simple SELECT 1 query every 24 hours
 * to keep the database alive.
 *
 * Usage:
 *   import { startNhostKeepAlive } from './services/nhost-keepalive'
 *   startNhostKeepAlive() // Call once at server startup
 */
import { prisma } from '../lib/prisma'

let keepAliveInterval: ReturnType<typeof setInterval> | null = null
let keepAliveTimeout: ReturnType<typeof setTimeout> | null = null

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

async function pingDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log(`[KEEP-ALIVE] PostgreSQL ping OK at ${new Date().toISOString()}`)
    return true
  } catch (error: any) {
    console.warn(`[KEEP-ALIVE] PostgreSQL ping failed:`, error?.message || error)
    return false
  }
}

/**
 * Start the keep-alive pinger.
 * Pings every 24 hours. First ping after 1 hour.
 */
export function startNhostKeepAlive() {
  if (keepAliveInterval) {
    console.log('[KEEP-ALIVE] Already running')
    return
  }

  console.log('[KEEP-ALIVE] Starting Nhost keep-alive (every 24h)')

  // First ping after 1 hour, then every 24 hours
  keepAliveTimeout = setTimeout(async () => {
    await pingDatabase()

    keepAliveInterval = setInterval(async () => {
      await pingDatabase()
    }, TWENTY_FOUR_HOURS)
  }, 60 * 60 * 1000)
}

/**
 * Stop the keep-alive pinger.
 */
export function stopNhostKeepAlive() {
  if (keepAliveTimeout) {
    clearTimeout(keepAliveTimeout)
    keepAliveTimeout = null
  }
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
    keepAliveInterval = null
    console.log('[KEEP-ALIVE] Stopped')
  }
}
