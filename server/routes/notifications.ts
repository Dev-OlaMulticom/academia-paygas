import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getStringParam } from '../utils/queryParams'
import { sendNotificationAlertEmail } from '../services/email'

const router = Router()

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, async (req: any, res) => {
  try {
    const count = await prisma.notification.count({
      where: { toId: req.userId, lida: false },
    })
    res.json({ count })
  } catch {
    res.status(500).json({ error: 'Erro ao contar notificações' })
  }
})

// GET /api/notifications
router.get('/', authenticate, async (req: any, res) => {
  try {
    const notifs = await prisma.notification.findMany({
      where: { toId: req.userId },
      include: { from: { select: { nome: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(notifs)
  } catch {
    res.status(500).json({ error: 'Erro ao buscar notificações' })
  }
})

// POST /api/notifications — send to user(s)
// Body:
//   toId: string       → send to specific user
//   toId: 'all'        → send to all users (ADMIN only)
//   toRole: string     → send to all users of role (ADMIN only)
//   toTeam: true       → send to all team members (GESTOR only)
//   titulo: string
//   mensagem: string
router.post('/', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const { toId, toRole, toTeam, titulo, mensagem } = req.body
    if (!titulo || !mensagem) {
      return res.status(400).json({ error: 'Título e mensagem são obrigatórios' })
    }

    const fromId = req.userId!
    let targetUserIds: string[] = []

    if (toTeam && req.userRole === 'GESTOR') {
      const members = await prisma.user.findMany({
        where: { gestorId: fromId },
        select: { id: true },
      })
      targetUserIds = members.map(m => m.id)
    } else if (toId === 'all' && req.userRole === 'ADMIN') {
      const users = await prisma.user.findMany({
        where: { id: { not: fromId } },
        select: { id: true },
      })
      targetUserIds = users.map(u => u.id)
    } else if (toRole && req.userRole === 'ADMIN') {
      const validRoles = ['ADMIN', 'GESTOR', 'ATENDENTE']
      if (!validRoles.includes(toRole)) {
        return res.status(400).json({ error: 'Perfil inválido' })
      }
      const users = await prisma.user.findMany({
        where: { role: toRole as any, id: { not: fromId } },
        select: { id: true },
      })
      targetUserIds = users.map(u => u.id)
    } else if (toId && toId !== 'all') {
      const targetUser = await prisma.user.findUnique({ where: { id: toId }, select: { id: true, gestorId: true } })
      if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado' })

      if (req.userRole === 'GESTOR' && targetUser.gestorId !== fromId) {
        return res.status(403).json({ error: 'Sem permissão para enviar a este usuário' })
      }
      targetUserIds = [toId]
    } else {
      return res.status(400).json({ error: 'Destinatário inválido' })
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({ error: 'Nenhum destinatário encontrado' })
    }

    const notifs = await prisma.notification.createMany({
      data: targetUserIds.map(userId => ({
        fromId,
        toId: userId,
        titulo,
        mensagem,
      })),
    })

    // Send email alerts asynchronously (fire-and-forget)
    prisma.user.findMany({
      where: { id: { in: targetUserIds } },
      select: { id: true, email: true, nome: true },
    }).then(users => {
      for (const u of users) {
        sendNotificationAlertEmail(u.email, u.nome || u.email, titulo).catch(() => {})
      }
    }).catch(() => {})

    res.status(201).json({ success: true, sent: notifs.count })
  } catch {
    res.status(500).json({ error: 'Erro ao enviar notificação' })
  }
})

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, async (req: any, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID invalido' })

    const notif = await prisma.notification.findUnique({ where: { id } })
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' })
    if (notif.toId !== req.userId) return res.status(403).json({ error: 'Sem permissao' })

    const updated = await prisma.notification.update({
      where: { id },
      data: { lida: true },
    })
    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Erro ao marcar como lida' })
  }
})

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, async (req: any, res) => {
  try {
    await prisma.notification.updateMany({
      where: { toId: req.userId, lida: false },
      data: { lida: true },
    })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Erro ao marcar todas como lidas' })
  }
})

export default router
