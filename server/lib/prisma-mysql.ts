import { PrismaClient } from '../../prisma/generated/mysql'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const globalForPrismaMysql = globalThis as unknown as { prismaMysql: PrismaClient | null }

function createMysqlClient(): PrismaClient | null {
  const url = process.env.MYSQL_URL
  if (!url) return null

  try {
    // Parse mysql://user:pass@host:port/database
    const parsed = new URL(url)
    const adapter = new PrismaMariaDb({
      host: parsed.hostname,
      port: parseInt(parsed.port || '3306'),
      user: parsed.username || 'root',
      password: parsed.password || '',
      database: parsed.pathname.replace('/', '') || undefined,
      connectionLimit: 5,
    })

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    })
  } catch (error) {
    console.error('[MYSQL] Failed to create client:', error)
    return null
  }
}

export const prismaMysql = globalForPrismaMysql.prismaMysql ?? createMysqlClient()
if (!globalForPrismaMysql.prismaMysql && prismaMysql) {
  globalForPrismaMysql.prismaMysql = prismaMysql
}

/**
 * Check if MySQL is available and connected
 */
export async function checkMysqlHealth(): Promise<boolean> {
  if (!prismaMysql) return false
  try {
    await prismaMysql.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}
