import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { getUserPoints, getTeamPoints } from '../services/gamification'

const router = Router()

// GET /api/dashboard
router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = req.userId

    const [
      totalModulos,
      modulosComProgresso,
      totalCertificados,
      totalAulas,
      aulasConcluidas,
      totalQuizzes,
      recentActivity,
      userPoints,
    ] = await Promise.all([
      prisma.modulo.count(),
      prisma.progresso.groupBy({
        by: ['moduloId'],
        where: { userId, concluido: true },
      }),
      prisma.certificate.count({
        where: { userId, status: 'ISSUED' },
      }),
      prisma.aula.count(),
      prisma.progresso.count({
        where: { userId, concluido: true },
      }),
      prisma.quizResponse.count({
        where: { userId, concluido: true },
      }),
      prisma.activityLog.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      getUserPoints(userId),
    ])

    const modulosConcluidos = modulosComProgresso.length

    res.json({
      totalModulos,
      modulosConcluidos,
      totalCertificados,
      totalAulas,
      aulasConcluidas,
      totalQuizzes,
      percentual: totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0,
      xp: userPoints.totalXp,
      level: userPoints.level,
      recentActivity,
      pointsByAction: userPoints.byAction,
    })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dashboard' })
  }
})

// GET /api/dashboard/leaderboard
router.get('/leaderboard', authenticate, async (req: any, res) => {
  try {
    const team = await getTeamPoints()
    res.json(team)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar leaderboard' })
  }
})

export default router
