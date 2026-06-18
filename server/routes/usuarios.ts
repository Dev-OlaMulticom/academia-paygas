import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getStringParam } from '../utils/queryParams'
import { Role } from '@prisma/client'
import { sendVerificationEmail } from '../services/email'
import { awardPoints } from '../services/gamification'

const router = Router()

// Helper: register activity log
async function logActivity(userId: string, acao: string, detalhes?: string) {
  await prisma.activityLog.create({
    data: { userId, acao, detalhes },
  }).catch(() => {})
}

// Helper: check if gestor owns the user
async function gestorOwnsUser(gestorId: string, userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { gestorId: true } })
  return user?.gestorId === gestorId
}

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
          gestor: { select: { id: true, nome: true } },
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
      gestorNome: u.gestor?.nome || null,
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
    const { email, nome, senha, role, gestorId } = req.body
    if (!email || !nome || !senha || !role) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
    }

    const validRoles = ['ADMIN', 'GESTOR', 'ATENDENTE']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Role inválido' })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(409).json({ error: 'Email já cadastrado' })

    if (req.userRole === 'GESTOR' && role !== 'ATENDENTE') {
      return res.status(403).json({ error: 'Gestores só podem criar usuários ATENDENTE' })
    }

    if (senha.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres' })
    }

    let finalGestorId: string | undefined
    if (role === 'ATENDENTE') {
      if (req.userRole === 'GESTOR') {
        finalGestorId = req.userId
      } else if (gestorId) {
        finalGestorId = gestorId
      }
    }

    const hashedPassword = await bcrypt.hash(senha, 12)
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const user = await prisma.user.create({
      data: {
        email,
        nome,
        senha: hashedPassword,
        role: role as Role,
        gestorId: finalGestorId,
        tokenVerificacao: verificationToken,
        tokenExpiry,
      },
      select: { id: true, email: true, nome: true, role: true, emailVerificado: true, createdAt: true },
    })

    await logActivity(req.userId!, 'Criar Usuario', `Criou ${role}: ${nome} (${email})`)
    await awardPoints(req.userId!, 'MODULE_OPEN', 'Gestor criou novo usuario')

    sendVerificationEmail(email, nome, verificationToken).catch(err => {
      console.error('Erro ao enviar email de verificacao:', err)
    })

    res.status(201).json(user)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar usuário' })
  }
})

// PUT /api/usuarios/:id
router.put('/:id', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const { nome, email, role, gestorId } = req.body
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    // GESTOR can only edit their own team members
    if (req.userRole === 'GESTOR') {
      const isOwn = await gestorOwnsUser(req.userId!, id)
      if (!isOwn) return res.status(403).json({ error: 'Sem permissão para editar este usuario' })
      // GESTOR cannot change role
      if (role && role !== 'ATENDENTE') {
        return res.status(403).json({ error: 'Gestores só podem manter角色 ATENDENTE' })
      }
    }

    const updateData: any = {}
    if (nome) updateData.nome = nome
    if (email) updateData.email = email
    if (role) updateData.role = role as Role
    if (gestorId !== undefined) updateData.gestorId = gestorId || null

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, nome: true, role: true, gestorId: true },
    })

    await logActivity(req.userId!, 'Editar Usuario', `Editou usuario: ${user.nome}`)
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' })
  }
})

// DELETE /api/usuarios/:id
router.delete('/:id', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    // GESTOR can only delete their own team members
    if (req.userRole === 'GESTOR') {
      const isOwn = await gestorOwnsUser(req.userId!, id)
      if (!isOwn) return res.status(403).json({ error: 'Sem permissão para excluir este usuario' })
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { nome: true, email: true } })
    await prisma.user.delete({ where: { id } })

    await logActivity(req.userId!, 'Excluir Usuario', `Excluiu usuario: ${user?.nome} (${user?.email})`)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir usuário' })
  }
})

// GET /api/usuarios/equipe - Team members
router.get('/equipe', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    if (req.userRole === 'GESTOR') {
      // GESTOR sees only their team
      const members = await prisma.user.findMany({
        where: { gestorId: req.userId },
        include: {
          _count: { select: { progressos: true, certificates: true } },
        },
      })

      const result = members.map(m => ({
        id: m.id,
        nome: m.nome,
        email: m.email,
        role: m.role,
        xp: m._count.progressos * 150 + m._count.certificates * 500,
        certCount: m._count.certificates,
        progressCount: m._count.progressos,
      }))

      return res.json(result)
    }

    // ADMIN sees all teams grouped by gestor
    const gestores = await prisma.user.findMany({
      where: { role: 'GESTOR' },
      include: {
        atendentes: {
          include: {
            _count: { select: { progressos: true, certificates: true } },
          },
        },
      },
      orderBy: { nome: 'asc' },
    })

    const teams = gestores.map(g => ({
      gestor: {
        id: g.id,
        nome: g.nome,
        email: g.email,
      },
      membros: g.atendentes.map(a => ({
        id: a.id,
        nome: a.nome,
        email: a.email,
        role: a.role,
        xp: a._count.progressos * 150 + a._count.certificates * 500,
        certCount: a._count.certificates,
        progressCount: a._count.progressos,
      })),
      totalMembros: g.atendentes.length,
    }))

    res.json(teams)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar equipe' })
  }
})

// GET /api/usuarios/equipe/stats - Team stats for admin
router.get('/equipe/stats', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const totalGestores = await prisma.user.count({ where: { role: 'GESTOR' } })
    const totalAtendentes = await prisma.user.count({ where: { role: 'ATENDENTE' } })
    const totalAtendentesComGestor = await prisma.user.count({ where: { role: 'ATENDENTE', gestorId: { not: null } } })
    const totalAtendentesSemGestor = totalAtendentes - totalAtendentesComGestor

    res.json({
      totalGestores,
      totalAtendentes,
      totalAtendentesComGestor,
      totalAtendentesSemGestor,
    })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatisticas' })
  }
})

// POST /api/usuarios/:id/validate-account
router.post('/:id/validate-account', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID invalido' })

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' })

    if (req.userRole === 'GESTOR' && user.gestorId !== req.userId) {
      return res.status(403).json({ error: 'Voce so pode validar atendentes da sua equipe' })
    }

    await prisma.user.update({
      where: { id },
      data: { emailVerificado: true, tokenVerificacao: null, tokenExpiry: null },
    })

    await logActivity(req.userId!, 'Validar Conta', `Validou conta de: ${user.nome}`)
    await awardPoints(req.userId!, 'LESSON_COMPLETE', 'Gestor validou conta de atendente')

    res.json({ message: 'Conta validada com sucesso!' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao validar conta' })
  }
})

// POST /api/usuarios/:id/resend-verification
router.post('/:id/resend-verification', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID invalido' })

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' })

    if (req.userRole === 'GESTOR' && user.gestorId !== req.userId) {
      return res.status(403).json({ error: 'Voce so pode reenviar para atendentes da sua equipe' })
    }

    if (user.emailVerificado) {
      return res.status(400).json({ error: 'Email ja verificado' })
    }

    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.user.update({
      where: { id },
      data: { tokenVerificacao: verificationToken, tokenExpiry },
    })

    await sendVerificationEmail(user.email, user.nome, verificationToken)
    await logActivity(req.userId!, 'Reenviar Verificacao', `Reenviou verificacao para: ${user.nome}`)

    res.json({ message: 'Email de verificacao reenviado!' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao reenviar verificacao' })
  }
})

export default router
