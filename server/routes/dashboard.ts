import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { getUserPoints, getTeamPoints } from '../services/gamification'

const router = Router()

// GET /api/dashboard
router.get('/', authenticate, async (req: any, res) => {
  try {
    const userId = req.userId

    const totalModulos = await prisma.modulo.count()

    const modulosComProgresso = await prisma.progresso.groupBy({
      by: ['moduloId'],
      where: { userId, concluido: true },
    })

    const modulosConcluidos = modulosComProgresso.length

    const totalCertificados = await prisma.certificate.count({
      where: { userId, status: 'ISSUED' },
    })

    const totalAulas = await prisma.aula.count()
    const aulasConcluidas = await prisma.progresso.count({
      where: { userId, concluido: true },
    })

    const totalQuizzes = await prisma.quizResponse.count({
      where: { userId, concluido: true },
    })

    const recentActivity = await prisma.activityLog.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
    })

    const userPoints = await getUserPoints(userId)

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
