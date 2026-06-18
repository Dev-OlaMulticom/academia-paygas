import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getStringParam } from '../utils/queryParams'
import { Role } from '@prisma/client'
import { sendVerificationEmail } from '../services/email'

const router = Router()

// GET /api/usuarios
router.get('/', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const skip = (page - 1) * limit

    const where = req.userRole === 'GESTOR'
      ? { gestorId: req.userId }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          _count: { select: { progressos: true, certificates: true } },
        },
        orderBy: { nome: 'asc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    const usersWithXp = users.map(u => ({
      id: u.id,
      email: u.email,
      nome: u.nome,
      role: u.role,
      emailVerificado: u.emailVerificado,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      gestorId: u.gestorId,
      xp: u._count.progressos * 150 + u._count.certificates * 500,
      progressCount: u._count.progressos,
      certCount: u._count.certificates,
    }))

    res.json({
      data: usersWithXp,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuarios' })
  }
})

// POST /api/usuarios
router.post('/', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const { email, nome, senha, role } = req.body
    if (!email || !nome || !senha || !role) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
    }

    // Validate role
    const validRoles = ['ADMIN', 'GESTOR', 'ATENDENTE']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Role inválido' })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(409).json({ error: 'Email já cadastrado' })

    // GESTOR can only create ATENDENTE users
    if (req.userRole === 'GESTOR' && role !== 'ATENDENTE') {
      return res.status(403).json({ error: 'Gestores só podem criar usuários ATENDENTE' })
    }

    // Validate password strength
    if (senha.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' })
    }

    const hashedPassword = await bcrypt.hash(senha, 12)
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const user = await prisma.user.create({
      data: {
        email,
        nome,
        senha: hashedPassword,
        role: role as Role,
        gestorId: req.userRole === 'GESTOR' ? req.userId : undefined,
        tokenVerificacao: verificationToken,
        tokenExpiry: tokenExpiry,
      },
      select: { id: true, email: true, nome: true, role: true, emailVerificado: true, createdAt: true },
    })

    // Send verification email (non-blocking)
    sendVerificationEmail(email, nome, verificationToken).catch(err => {
      console.error('Erro ao enviar email de verificacao:', err)
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
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    const updateData: any = {}
    
    if (nome) updateData.nome = nome
    if (email) updateData.email = email
    if (role) updateData.role = role as Role
    if (gestorId) updateData.gestorId = gestorId
    
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    await prisma.user.delete({ where: { id } })
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
      : { role: 'ATENDENTE' as Role }

    const members = await prisma.user.findMany({
      where,
      include: {
        _count: { select: { progressos: true, certificates: true } },
      },
    })

    const result = members.map(m => ({
      id: m.id,
      nome: m.nome,
      email: m.email,
      role: m.role,
      gestorId: m.gestorId,
      xp: m._count.progressos * 150 + m._count.certificates * 500,
      certCount: m._count.certificates,
    }))

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar equipe' })
  }
})

// POST /api/usuarios/:id/validate-account - Admin/Gestor manually validate user
router.post('/:id/validate-account', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID invalido' })

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' })

    // GESTOR can only validate their own attendants
    if (req.userRole === 'GESTOR' && user.gestorId !== req.userId) {
      return res.status(403).json({ error: 'Voce so pode validar atendentes da sua equipe' })
    }

    await prisma.user.update({
      where: { id },
      data: {
        emailVerificado: true,
        tokenVerificacao: null,
        tokenExpiry: null,
      },
    })

    res.json({ message: 'Conta validada com sucesso!' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao validar conta' })
  }
})

// POST /api/usuarios/:id/resend-verification - Admin/Gestor resend verification email
router.post('/:id/resend-verification', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID invalido' })

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' })

    // GESTOR can only resend for their own attendants
    if (req.userRole === 'GESTOR' && user.gestorId !== req.userId) {
      return res.status(403).json({ error: 'Voce so pode reenviar para atendentes da sua equipe' })
    }

    if (user.emailVerificado) {
      return res.status(400).json({ error: 'Email ja verificado' })
    }

    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await prisma.user.update({
      where: { id },
      data: { 
        tokenVerificacao: verificationToken,
        tokenExpiry: tokenExpiry,
      },
    })

    await sendVerificationEmail(user.email, user.nome, verificationToken)

    res.json({ message: 'Email de verificacao reenviado!' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao reenviar verificacao' })
  }
})

export default router
