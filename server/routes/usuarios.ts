import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/usuarios
router.get('/', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const where = req.userRole === 'GESTOR'
      ? { gestorId: req.userId }
      : {}

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, email: true, nome: true, role: true, createdAt: true, lastLogin: true, gestorId: true,
        _count: { select: { progressos: true, certificates: true } },
      },
      orderBy: { nome: 'asc' },
    })

    const usersWithXp = users.map(u => ({
      ...u,
      xp: u._count.progressos * 150 + u._count.certificates * 500,
      progressCount: u._count.progressos,
      certCount: u._count.certificates,
      _count: undefined,
    }))

    res.json(usersWithXp)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários' })
  }
})

// POST /api/usuarios
router.post('/', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const { email, nome, senha, role } = req.body
    if (!email || !nome || !senha || !role) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(409).json({ error: 'Email já cadastrado' })

    const hashedPassword = await bcrypt.hash(senha, 10)
    const user = await prisma.user.create({
      data: {
        email,
        nome,
        senha: hashedPassword,
        role: role as any,
        gestorId: req.userRole === 'GESTOR' ? req.userId : undefined,
      },
      select: { id: true, email: true, nome: true, role: true, createdAt: true },
    })

    res.status(201).json(user)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar usuário' })
  }
})

// PUT /api/usuarios/:id
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { nome, email, role, gestorId } = req.body
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { nome, email, role, gestorId },
      select: { id: true, email: true, nome: true, role: true },
    })
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' })
  }
})

// DELETE /api/usuarios/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir usuário' })
  }
})

// GET /api/usuarios/equipe - Team members for gestor
router.get('/equipe', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const where = req.userRole === 'GESTOR'
      ? { gestorId: req.userId }
      : { role: 'ATENDENTE' }

    const members = await prisma.user.findMany({
      where,
      select: {
        id: true, nome: true, email: true, role: true,
        _count: { select: { progressos: true, certificates: true } },
      },
    })

    const result = members.map(m => ({
      ...m,
      xp: m._count.progressos * 150 + m._count.certificates * 500,
      certCount: m._count.certificates,
      _count: undefined,
    }))

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar equipe' })
  }
})

export default router
