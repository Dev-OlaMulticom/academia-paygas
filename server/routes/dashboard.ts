import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()

// GET /api/dashboard
router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = req.userId

    const totalTrilhas = await prisma.trilha.count()

    const trilhasComProgresso = await prisma.progresso.groupBy({
      by: ['moduloId'],
      where: { userId, concluido: true },
    })

    const modulos = await prisma.modulo.findMany({
      where: { id: { in: trilhasComProgresso.map(t => t.moduloId) } },
      select: { trilhaId: true },
    })
    const trilhasConcluidas = [...new Set(modulos.map(m => m.trilhaId))].length

    const totalCertificados = await prisma.certificate.count({
      where: { userId, status: 'ISSUED' },
    })

    const totalAulas = await prisma.aula.count()
    const aulasConcluidas = await prisma.progresso.count({
      where: { userId, concluido: true },
    })

    const recentActivity = await prisma.activityLog.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
    })

    const xp = aulasConcluidas * 150 + totalCertificados * 500

    res.json({
      totalTrilhas,
      trilhasConcluidas,
      totalCertificados,
      totalAulas,
      aulasConcluidas,
      percentual: totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0,
      xp,
      nivel: Math.floor(xp / 2000) + 1,
      recentActivity,
    })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dashboard' })
  }
})

export default router
