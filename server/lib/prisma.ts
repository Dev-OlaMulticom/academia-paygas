import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const url = process.env.DATABASE_URL || ''

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
