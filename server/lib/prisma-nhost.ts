/**
 * Nhost PostgreSQL Prisma Client — backup/redundancy (third database).
 *
 * Uses the SAME Prisma schema as Supabase (PostgreSQL).
 * Writes are best-effort: failures logged but never block the application.
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

let prismaNhost: PrismaClient | null = null

function createNhostClient(): PrismaClient | null {
  const url = process.env.NHOST_URL
  if (!url) {
    console.log('[DB] NHOST_URL not set — Nhost backup disabled')
    return null
  }

  try {
    const adapter = new PrismaPg({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    })

    const client = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
    })

    console.log('[DB] Nhost backup client initialized')
    return client
  } catch (error: any) {
    console.error('[DB] Failed to initialize Nhost client:', error.message)
    return null
  }
}

prismaNhost = createNhostClient()
export { prismaNhost }
