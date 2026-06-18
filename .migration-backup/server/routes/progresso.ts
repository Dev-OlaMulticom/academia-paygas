import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { awardPoints } from '../services/gamification'

const router = Router()

// GET /api/progresso
router.get('/', authenticate, async (req: any, res) => {
  try {
    const progresso = await prisma.progresso.findMany({
      where: { userId: req.userId },
      include: {
        modulo: { select: { id: true, titulo: true } },
        aula: { select: { id: true, titulo: true } },
      },
    })
    res.json(progresso)
  } catch {
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

    const existing = await prisma.progresso.findFirst({
      where: { moduloId, aulaId, userId: req.userId },
    })

    const progresso = await prisma.progresso.upsert({
      where: {
        moduloId_aulaId_userId: { moduloId, aulaId, userId: req.userId },
      },
      update: { concluido: concluido !== false },
      create: { moduloId, aulaId, userId: req.userId, concluido: concluido !== false },
    })

    // Award points for lesson completion (only if newly completed)
    if (!existing?.concluido && concluido !== false) {
      const aula = await prisma.aula.findUnique({ where: { id: aulaId } })
      await awardPoints(req.userId, 'LESSON_COMPLETE', `Aula: ${aula?.titulo || aulaId}`)

      // Check if all aulas in the modulo are completed
      const modulo = await prisma.modulo.findUnique({
        where: { id: moduloId },
        include: { aulas: true },
      })

      if (modulo) {
        const completedCount = await prisma.progresso.count({
          where: {
            moduloId,
            userId: req.userId,
            concluido: true,
          },
        })

        if (completedCount >= modulo.aulas.length) {
          await awardPoints(req.userId, 'MODULE_COMPLETE', `Modulo: ${modulo.titulo}`)
        }
      }
    }

    res.json(progresso)
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar progresso' })
  }
})

// GET /api/progresso/stats
router.get('/stats', authenticate, async (req: any, res) => {
  try {
    const totalAulas = await prisma.aula.count()
    const concluidas = await prisma.progresso.count({
      where: { userId: req.userId, concluido: true },
    })

    const modulosIniciados = await prisma.progresso.groupBy({
      by: ['moduloId'],
      where: { userId: req.userId },
    })

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { xp: true },
    })

    res.json({
      totalAulas,
      concluidas,
      percentual: totalAulas > 0 ? Math.round((concluidas / totalAulas) * 100) : 0,
      modulosIniciados: modulosIniciados.length,
      xp: user?.xp || 0,
    })
  } catch {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' })
  }
})

export default router
