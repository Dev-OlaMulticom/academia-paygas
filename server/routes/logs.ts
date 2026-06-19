import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()

// GET /api/logs - List all activity logs (ADMIN only)
// Query params: userId, startDate, endDate, acao, page, limit
router.get('/', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50))
    const skip = (page - 1) * limit

    const where: any = {}

    if (req.query.userId) {
      where.userId = req.query.userId
    }

    if (req.query.acao) {
      where.acao = { contains: req.query.acao, mode: 'insensitive' }
    }

    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {}
      if (req.query.startDate) {
        where.createdAt.gte = new Date(req.query.startDate as string)
      }
      if (req.query.endDate) {
        where.createdAt.lte = new Date(req.query.endDate as string + 'T23:59:59.999Z')
      }
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, nome: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ])

    res.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar logs de atividade' })
  }
})

// GET /api/logs/users - List users with activity summary (ADMIN only)
router.get('/users', authenticate, authorize('ADMIN'), async (_req: any, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        createdAt: true,
        lastLogin: true,
        _count: { select: { activityLogs: true } },
      },
      orderBy: { nome: 'asc' },
    })

    res.json(users)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar usuários' })
  }
})

// GET /api/logs/stats - Activity stats summary (ADMIN only)
router.get('/stats', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const where: any = {}

    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {}
      if (req.query.startDate) {
        where.createdAt.gte = new Date(req.query.startDate as string)
      }
      if (req.query.endDate) {
        where.createdAt.lte = new Date(req.query.endDate as string + 'T23:59:59.999Z')
      }
    }

    const [totalLogs, byAction, byUser] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.groupBy({
        by: ['acao'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      prisma.activityLog.groupBy({
        by: ['userId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ])

    const userIds = byUser.map((b: any) => b.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nome: true, email: true, role: true },
    })

    const userMap = new Map(users.map((u: any) => [u.id, u]))

    res.json({
      totalLogs,
      byAction: byAction.map((b: any) => ({ acao: b.acao, count: b._count.id })),
      byUser: byUser.map((b: any) => ({
        ...userMap.get(b.userId),
        count: b._count.id,
      })),
    })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar estatísticas' })
  }
})

export default router
