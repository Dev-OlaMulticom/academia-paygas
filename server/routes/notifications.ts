import { Router } from 'express'
import { db } from '../lib/db'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getStringParam } from '../utils/queryParams'
import { sendNotificationAlertEmail } from '../services/email'

const router = Router()

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, async (req: any, res) => {
  try {
    const count = await db.count('notification', { toId: req.userId, lida: false })
    res.json({ count })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao contar notificações' })
  }
})

// GET /api/notifications
router.get('/', authenticate, async (req: any, res) => {
  try {
    const notifs = await db.findMany('notification', {
      where: { toId: req.userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(notifs)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar notificações' })
  }
})

// POST /api/notifications — send to user(s)
router.post('/', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const { toId, toRole, toTeam, titulo, mensagem } = req.body
    if (!titulo || !mensagem) {
      return res.status(400).json({ error: 'Título e mensagem são obrigatórios' })
    }

    const fromId = req.userId!
    let targetUserIds: string[] = []

    if (toTeam && req.userRole === 'GESTOR') {
      const members = await db.findMany('user', { where: { gestorId: fromId } }) as any[]
      targetUserIds = members.map((m: any) => m.id)
    } else if (toId === 'all' && req.userRole === 'ADMIN') {
      const users = await db.findMany('user', { where: { id: { not: fromId } } }) as any[]
      targetUserIds = users.map((u: any) => u.id)
    } else if (toRole && req.userRole === 'ADMIN') {
      const validRoles = ['ADMIN', 'GESTOR', 'ATENDENTE']
      if (!validRoles.includes(toRole)) {
        return res.status(400).json({ error: 'Perfil inválido' })
      }
      const users = await db.findMany('user', { where: { role: toRole as any, id: { not: fromId } } }) as any[]
      targetUserIds = users.map((u: any) => u.id)
    } else if (toId && toId !== 'all') {
      const targetUser = await db.findUnique('user', { id: toId }) as any
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

    await db.createMany('notification', targetUserIds.map(userId => ({
      fromId,
      toId: userId,
      titulo,
      mensagem,
    })))

    // Send email alerts asynchronously (fire-and-forget)
    const users = await db.findMany('user', {
      where: { id: { in: targetUserIds } },
    }) as any[]
    for (const u of users) {
      sendNotificationAlertEmail(u.email, u.nome || u.email, titulo).then(r => {
        if (!r.success) console.warn(`[EMAIL] Falha notif para ${u.email}: ${r.error}`)
      })
    }

    res.status(201).json({ success: true, sent: targetUserIds.length })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao enviar notificação' })
  }
})

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, async (req: any, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID invalido' })

    const notif = await db.findUnique('notification', { id }) as any
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' })
    if (notif.toId !== req.userId) return res.status(403).json({ error: 'Sem permissao' })

    const updated = await db.update('notification', { id }, { lida: true })
    res.json(updated)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao marcar como lida' })
  }
})

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, async (req: any, res) => {
  try {
    await db.updateMany('notification', { toId: req.userId, lida: false }, { lida: true })
    res.json({ success: true })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao marcar todas como lidas' })
  }
})

// DELETE /api/notifications/:id - Owner or ADMIN can delete.
router.delete('/:id', authenticate, async (req: any, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID invalido' })

    const notif = await db.findUnique('notification', { id }) as any
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' })

    const isOwner = notif.toId === req.userId
    const isAdmin = req.userRole === 'ADMIN'
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Sem permissao' })
    }

    await db.delete('notification', { id })
    res.json({ success: true })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao excluir notificação' })
  }
})

export default router
