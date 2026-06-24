import { db } from '../lib/db'

export async function logActivity(userId: string, acao: string, detalhes?: string): Promise<void> {
  try {
    await db.create('activityLog', { userId, acao, detalhes })
  } catch (error) {
    console.error('[LOG ACTIVITY ERROR]', error)
  }
}
