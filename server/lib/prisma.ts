import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

// Always use singleton — both in development and production
// Without this, production can create multiple clients across module contexts
export const prisma = globalForPrisma.prisma || createPrismaClient()
if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma
