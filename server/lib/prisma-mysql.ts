import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import path from 'path'

// Dynamic require — resolve from project root
const mysqlPath = path.resolve(process.cwd(), 'prisma/generated/mysql')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MysqlPrismaClient: any = require(mysqlPath).PrismaClient

const globalForPrismaMysql = globalThis as unknown as { prismaMysql: any }

function createMysqlClient(): any | null {
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
      connectionLimit: 2,
      connectTimeout: 2000,
      acquireTimeout: 2000,
    })

    return new MysqlPrismaClient({
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
