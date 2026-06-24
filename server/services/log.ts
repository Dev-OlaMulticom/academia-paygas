import { prisma } from '../lib/prisma'
import { prismaMysql } from '../lib/prisma-mysql'

export async function logActivity(userId: string, acao: string, detalhes?: string): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { userId, acao, detalhes },
    })
  } catch (error) {
    console.error('[LOG ACTIVITY ERROR]', error)
  }

  // Dual-write to MySQL
  if (prismaMysql) {
    try {
      await prismaMysql.activityLog.create({
        data: { userId, acao, detalhes },
      })
    } catch (error: any) {
      console.warn('[DUAL-WRITE] MySQL logActivity failed:', error?.message)
    }
  }
}
