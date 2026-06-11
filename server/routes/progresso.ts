import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()

// GET /api/progresso
router.get('/', authenticate, async (req: any, res) => {
  try {
    const progresso = await prisma.progresso.findMany({
      where: { userId: req.userId },
      include: {
        modulo: { select: { id: true, titulo: true, trilhaId: true } },
        aula: { select: { id: true, titulo: true } },
      },
    })
    res.json(progresso)
  } catch (error) {
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

    const progresso = await prisma.progresso.upsert({
      where: {
        moduloId_aulaId_userId: { moduloId, aulaId, userId: req.userId },
      },
      update: { concluido: concluido !== false },
      create: { moduloId, aulaId, userId: req.userId, concluido: concluido !== false },
    })
    res.json(progresso)
  } catch (error) {
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

    const trilhasIniciadas = await prisma.progresso.groupBy({
      by: ['moduloId'],
      where: { userId: req.userId },
    })

    const trilhasComProgresso = await prisma.modulo.findMany({
      where: { id: { in: trilhasIniciadas.map(t => t.moduloId) } },
      select: { trilhaId: true },
    })

    const uniqueTrilhas = [...new Set(trilhasComProgresso.map(t => t.trilhaId))]

    res.json({
      totalAulas,
      concluidas,
      percentual: totalAulas > 0 ? Math.round((concluidas / totalAulas) * 100) : 0,
      trilhasIniciadas: uniqueTrilhas.length,
      xp: concluidas * 150,
    })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' })
  }
})

export default router
