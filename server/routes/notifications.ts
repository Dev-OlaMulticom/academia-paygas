import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { getStringParam } from '../utils/queryParams'

const router = Router()

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, async (req: any, res) => {
  try {
    const count = await prisma.notification.count({
      where: { toId: req.userId, lida: false },
    })
    res.json({ count })
  } catch (error) {
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
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar notificações' })
  }
})

// POST /api/notifications
router.post('/', authenticate, authorize('ADMIN', 'GESTOR'), async (req: any, res) => {
  try {
    const { toId, titulo, mensagem } = req.body
    if (!toId || !titulo || !mensagem) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
    }

    const notif = await prisma.notification.create({
      data: { fromId: req.userId, toId, titulo, mensagem },
      include: { from: { select: { nome: true } } },
    })
    res.status(201).json(notif)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar notificação' })
  }
})

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, async (req: any, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID invalido' })

    const notif = await prisma.notification.findUnique({ where: { id } })
    if (!notif) return res.status(404).json({ error: 'Notificacion no encontrada' })
    if (notif.toId !== req.userId) return res.status(403).json({ error: 'Sem permissao' })

    const updated = await prisma.notification.update({
      where: { id },
      data: { lida: true },
    })
    res.json(updated)
  } catch (error) {
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
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar todas como lidas' })
  }
})

export default router
