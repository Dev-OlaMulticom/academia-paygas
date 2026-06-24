import { Router } from 'express'
import { db } from '../lib/db'
import { authenticate } from '../middleware/auth'
import { awardPointsIfNotAwarded } from '../services/gamification'
import { logActivity } from '../services/log'

const router = Router()

// GET /api/progresso
router.get('/', authenticate, async (req: any, res) => {
  try {
    const progresso = await db.findMany('progresso', {
      where: { userId: req.userId },
    })
    res.json(progresso)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar progresso' })
  }
})

// PUT /api/progresso
router.put('/', authenticate, async (req: any, res) => {
  try {
    const { moduloId, aulaId, concluido } = req.body
    if (!moduloId || !aulaId) {
      return res.status(400).json({ error: 'moduloId e aulaId são obrigatórios' })
    }

    const existing = await db.findFirst('progresso', {
      moduloId,
      aulaId,
      userId: req.userId,
    })

    const progresso = await db.upsert('progresso',
      { moduloId_aulaId_userId: { moduloId, aulaId, userId: req.userId } },
      { moduloId, aulaId, userId: req.userId, concluido: concluido !== false },
      { concluido: concluido !== false }
    )

    // Award points for lesson completion (only if newly completed)
    if (!existing?.concluido && concluido !== false) {
      const aula = await db.findUnique('aula', { id: aulaId }) as any
      await awardPointsIfNotAwarded(req.userId, 'LESSON_COMPLETE', `LESSON_COMPLETE:aula:${aulaId}`)
      await logActivity(req.userId, 'Aula Concluida', `Aula: ${aula?.titulo || aulaId}`)

      // Check if all aulas in the modulo are completed
      const modulo = await db.findUnique('modulo', { id: moduloId }) as any
      if (modulo) {
        const completedCount = await db.count('progresso', {
          moduloId,
          userId: req.userId,
          concluido: true,
        })

        if (completedCount >= modulo.aulas?.length) {
          await awardPointsIfNotAwarded(req.userId, 'MODULE_COMPLETE', `MODULE_COMPLETE:modulo:${moduloId}`)
          await logActivity(req.userId, 'Modulo Concluido', `Modulo: ${modulo.titulo}`)
        }
      }
    }

    res.json(progresso)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao atualizar progresso' })
  }
})

// GET /api/progresso/stats
router.get('/stats', authenticate, async (req: any, res) => {
  try {
    const totalAulas = await db.count('aula')
    const concluidas = await db.count('progresso', {
      userId: req.userId,
      concluido: true,
    })

    const modulosIniciados = await db.groupBy('progresso', {
      by: ['moduloId'],
      where: { userId: req.userId },
    })

    const user = await db.findUnique('user', { id: req.userId }) as any

    res.json({
      totalAulas,
      concluidas,
      percentual: totalAulas > 0 ? Math.round((concluidas / totalAulas) * 100) : 0,
      modulosIniciados: modulosIniciados.length,
      xp: user?.xp || 0,
    })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar estatísticas' })
  }
})

export default router
