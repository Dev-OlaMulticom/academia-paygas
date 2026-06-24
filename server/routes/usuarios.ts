import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { prismaMysql } from '../lib/prisma-mysql'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getStringParam } from '../utils/queryParams'
import { Role } from '@prisma/client'
import { sendVerificationEmail } from '../services/email'
import { awardPointsIfNotAwarded } from '../services/gamification'
import { logActivity } from '../services/log'

const router = Router()

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
      xp: u.xp,
      level: u.level,
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
    console.error('[ROUTE ERROR]', error)
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

    // Dual-write user create to MySQL
    if (prismaMysql) {
      try {
        await prismaMysql.user.create({
          data: {
            id: user.id,
            email,
            nome,
            senha: hashedPassword,
            role: role as any,
            gestorId: finalGestorId,
            tokenVerificacao: verificationToken,
            tokenExpiry,
          },
        })
      } catch (error: any) {
        console.warn('[DUAL-WRITE] MySQL user create failed:', error?.message)
      }
    }

    await logActivity(req.userId!, 'Criar Usuario', `Criou ${role}: ${nome} (${email})`)
    await awardPointsIfNotAwarded(req.userId!, 'MODULE_OPEN', `USER_CREATE:${user.id}`)

    sendVerificationEmail(email, nome, verificationToken).catch(err => {
      console.error('Erro ao enviar email de verificacao:', err)
    })

    res.status(201).json(user)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao criar usuário' })
  }
})

// PUT /api/usuarios/change-password (MUST be before /:id to avoid route shadowing)
router.put('/change-password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 8 caracteres' })
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    const validPassword = await bcrypt.compare(currentPassword, user.senha)
    if (!validPassword) {
      return res.status(401).json({ error: 'Senha atual incorreta' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: req.userId },
      data: { senha: hashedPassword },
    })

    // Dual-write password change to MySQL
    if (prismaMysql) {
      try {
        await prismaMysql.user.update({
          where: { id: req.userId },
          data: { senha: hashedPassword },
        })
      } catch (error: any) {
        console.warn('[DUAL-WRITE] MySQL password change failed:', error?.message)
      }
    }

    await logActivity(req.userId!, 'Alterar Senha', 'Senha alterada com sucesso')
    res.json({ message: 'Senha alterada com sucesso' })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao alterar senha' })
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
        return res.status(403).json({ error: 'Gestores só podem manter role ATENDENTE' })
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

    // Dual-write user update to MySQL
    if (prismaMysql) {
      try {
        const mysqlUpdateData: any = {}
        if (nome) mysqlUpdateData.nome = nome
        if (email) mysqlUpdateData.email = email
        if (role) mysqlUpdateData.role = role
        if (gestorId !== undefined) mysqlUpdateData.gestorId = gestorId || null
        await prismaMysql.user.update({
          where: { id },
          data: mysqlUpdateData,
        })
      } catch (error: any) {
        console.warn('[DUAL-WRITE] MySQL user update failed:', error?.message)
      }
    }

    await logActivity(req.userId!, 'Editar Usuario', `Editou usuario: ${user.nome}`)
    res.json(user)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
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

    // Dual-write user delete to MySQL
    if (prismaMysql) {
      try {
        await prismaMysql.user.delete({ where: { id } })
      } catch (error: any) {
        console.warn('[DUAL-WRITE] MySQL user delete failed:', error?.message)
      }
    }

    await logActivity(req.userId!, 'Excluir Usuario', `Excluiu usuario: ${user?.nome} (${user?.email})`)
    res.json({ success: true })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
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
        xp: m.xp,
        level: m.level,
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
        xp: a.xp,
        level: a.level,
        certCount: a._count.certificates,
        progressCount: a._count.progressos,
      })),
      totalMembros: g.atendentes.length,
    }))

    res.json(teams)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar equipe' })
  }
})

// GET /api/usuarios/equipe/detalhe - Detailed team progress for GESTOR
router.get('/equipe/detalhe', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    if (req.userRole === 'GESTOR') {
      const members = await prisma.user.findMany({
        where: { gestorId: req.userId },
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          xp: true,
          lastLogin: true,
          progressos: {
            include: {
              modulo: { select: { id: true, titulo: true } },
              aula: { select: { id: true, titulo: true, moduloId: true } },
            },
          },
        },
      })

      const modulos = await prisma.modulo.findMany({
        select: {
          id: true,
          titulo: true,
          aulas: { select: { id: true, titulo: true, licoes: { select: { id: true, titulo: true } } } },
        },
      })

      const result = members.map((m) => {
        const progressoByModulo = new Map<string, { total: number; concluidas: number; aulas: any[] }>()

        for (const mod of modulos) {
          const aulaProgress = mod.aulas.map((a) => {
            const prog = m.progressos.find((p) => p.aulaId === a.id)
            return {
              id: a.id,
              titulo: a.titulo,
              concluido: prog?.concluido || false,
              licoes: a.licoes.map((l) => ({
                id: l.id,
                titulo: l.titulo,
              })),
            }
          })
          const concluidas = aulaProgress.filter((a) => a.concluido).length
          progressoByModulo.set(mod.id, {
            total: mod.aulas.length,
            concluidas,
            aulas: aulaProgress,
          })
        }

        return {
          id: m.id,
          nome: m.nome,
          email: m.email,
          role: m.role,
          xp: m.xp,
          lastLogin: m.lastLogin,
          modulos: modulos.map((mod) => ({
            id: mod.id,
            titulo: mod.titulo,
            totalAulas: progressoByModulo.get(mod.id)?.total || 0,
            aulasConcluidas: progressoByModulo.get(mod.id)?.concluidas || 0,
            aulas: progressoByModulo.get(mod.id)?.aulas || [],
          })),
        }
      })

      return res.json(result)
    }

    // ADMIN: return all users with progress
    const allUsers = await prisma.user.findMany({
      where: { role: 'ATENDENTE' },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        xp: true,
        lastLogin: true,
        gestorId: true,
        progressos: {
          include: {
            modulo: { select: { id: true, titulo: true } },
            aula: { select: { id: true, titulo: true, moduloId: true } },
          },
        },
      },
    })

    const modulos = await prisma.modulo.findMany({
      select: {
        id: true,
        titulo: true,
        aulas: { select: { id: true, titulo: true, licoes: { select: { id: true, titulo: true } } } },
      },
    })

    const result = allUsers.map((m) => {
      const progressoByModulo = new Map<string, { total: number; concluidas: number; aulas: any[] }>()

      for (const mod of modulos) {
        const aulaProgress = mod.aulas.map((a) => {
          const prog = m.progressos.find((p) => p.aulaId === a.id)
          return {
            id: a.id,
            titulo: a.titulo,
            concluido: prog?.concluido || false,
            licoes: a.licoes.map((l) => ({ id: l.id, titulo: l.titulo })),
          }
        })
        const concluidas = aulaProgress.filter((a) => a.concluido).length
        progressoByModulo.set(mod.id, { total: mod.aulas.length, concluidas, aulas: aulaProgress })
      }

      return {
        id: m.id,
        nome: m.nome,
        email: m.email,
        role: m.role,
        xp: m.xp,
        lastLogin: m.lastLogin,
        gestorId: m.gestorId,
        modulos: modulos.map((mod) => ({
          id: mod.id,
          titulo: mod.titulo,
          totalAulas: progressoByModulo.get(mod.id)?.total || 0,
          aulasConcluidas: progressoByModulo.get(mod.id)?.concluidas || 0,
          aulas: progressoByModulo.get(mod.id)?.aulas || [],
        })),
      }
    })

    res.json(result)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar detalhe da equipe' })
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
    console.error('[ROUTE ERROR]', error)
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

    // Skip if already verified — no duplicate XP
    if (user.emailVerificado) {
      return res.json({ message: 'Conta já validada anteriormente' })
    }

    await prisma.user.update({
      where: { id },
      data: { emailVerificado: true, tokenVerificacao: null, tokenExpiry: null },
    })

    // Dual-write account validation to MySQL
    if (prismaMysql) {
      try {
        await prismaMysql.user.update({
          where: { id },
          data: { emailVerificado: true, tokenVerificacao: null, tokenExpiry: null },
        })
      } catch (error: any) {
        console.warn('[DUAL-WRITE] MySQL validate account failed:', error?.message)
      }
    }

    await logActivity(req.userId!, 'Validar Conta', `Validou conta de: ${user.nome}`)
    await awardPointsIfNotAwarded(req.userId!, 'LESSON_COMPLETE', `VALIDATE_ACCOUNT:${id}`)

    res.json({ message: 'Conta validada com sucesso!' })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
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

    // Dual-write verification token to MySQL
    if (prismaMysql) {
      try {
        await prismaMysql.user.update({
          where: { id },
          data: { tokenVerificacao: verificationToken, tokenExpiry },
        })
      } catch (error: any) {
        console.warn('[DUAL-WRITE] MySQL resend verification failed:', error?.message)
      }
    }

    await sendVerificationEmail(user.email, user.nome, verificationToken)
    await logActivity(req.userId!, 'Reenviar Verificacao', `Reenviou verificacao para: ${user.nome}`)

    res.json({ message: 'Email de verificacao reenviado!' })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao reenviar verificacao' })
  }
})

export default router
