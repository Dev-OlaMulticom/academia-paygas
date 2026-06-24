/**
 * PostgreSQL Prisma Client — primary database (backward compatible).
 *
 * Priority:
 * 1. PG_URL_1 (if set, this is the primary)
 * 2. DATABASE_URL (legacy fallback)
 *
 * The database registry (server/config/databases.ts) manages all PG connections.
 * This module re-exports the primary client for backward compatibility.
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient(): PrismaClient {
  // Prefer PG_URL_1 as primary, fall back to DATABASE_URL
  const url = process.env.PG_URL_1 || process.env.DATABASE_URL || ''

  if (!url) {
    throw new Error('[DB] No database URL configured. Set PG_URL_1 or DATABASE_URL')
  }

  const adapter = new PrismaPg({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  })
}

// Always use singleton — both in development and production
// Without this, production can create multiple clients across module contexts
export const prisma = globalForPrisma.prisma || createPrismaClient()
if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma
