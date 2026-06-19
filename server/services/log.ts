import { prisma } from '../lib/prisma'

export async function logActivity(userId: string, acao: string, detalhes?: string): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { userId, acao, detalhes },
    })
  } catch (error) {
    console.error('[LOG ACTIVITY ERROR]', error)
  }
}
