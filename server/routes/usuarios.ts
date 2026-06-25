import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from '../lib/db'
import { prisma } from '../lib/prisma'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getStringParam } from '../utils/queryParams'
import { Role } from '@prisma/client'
import { sendVerificationEmail } from '../services/email'
import { awardPointsIfNotAwarded } from '../services/gamification'
import { logActivity } from '../services/log'

const router = Router()

// Helper: check if gestor owns the user
async function gestorOwnsUser(gestorId: string, userId: string): Promise<boolean> {
  const user = await db.findUnique('user', { id: userId }) as any
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
      db.findMany('user', {
        where,
        orderBy: { nome: 'asc' },
        skip,
        take: limit,
      }),
      db.count('user', where),
    ])

    const usersWithXp = (users as any[]).map((u: any) => ({
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
      progressCount: u._count?.progressos || 0,
      certCount: u._count?.certificates || 0,
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

    const exists = await db.findUnique('user', { email })
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

    const user = await db.create('user', {
      email,
      nome,
      senha: hashedPassword,
      role: role as Role,
      gestorId: finalGestorId,
      tokenVerificacao: verificationToken,
      tokenExpiry,
    }) as any

    await logActivity(req.userId!, 'Criar Usuario', `Criou ${role}: ${nome} (${email})`)
    await awardPointsIfNotAwarded(req.userId!, 'MODULE_OPEN', `USER_CREATE:${user.id}`)

    sendVerificationEmail(email, nome, verificationToken).then(r => {
      if (!r.success) console.warn(`[EMAIL] Falha verificacao para ${email}: ${r.error}`)
    })

    res.status(201).json({
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
      emailVerificado: user.emailVerificado,
      createdAt: user.createdAt,
    })
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

    const user = await db.findUnique('user', { id: req.userId! }) as any
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    const validPassword = await bcrypt.compare(currentPassword, user.senha)
    if (!validPassword) {
      return res.status(401).json({ error: 'Senha atual incorreta' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await db.update('user', { id: req.userId! }, { senha: hashedPassword })

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

    const user = await db.update('user', { id }, updateData) as any

    await logActivity(req.userId!, 'Editar Usuario', `Editou usuario: ${user.nome}`)
    res.json({
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
      gestorId: user.gestorId,
    })
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

    const user = await db.findUnique('user', { id }) as any
    await db.delete('user', { id })

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
      const members = await db.findMany('user', {
        where: { gestorId: req.userId },
      }) as any[]

      const result = members.map((m: any) => ({
        id: m.id,
        nome: m.nome,
        email: m.email,
        role: m.role,
        xp: m.xp,
        level: m.level,
        certCount: m._count?.certificates || 0,
        progressCount: m._count?.progressos || 0,
      }))

      return res.json(result)
    }

    // ADMIN sees all teams grouped by gestor
    const gestores = await db.findMany('user', {
      where: { role: 'GESTOR' },
      orderBy: { nome: 'asc' },
    }) as any[]

    const teams = await Promise.all(gestores.map(async (g: any) => {
      const atendentes = await db.findMany('user', {
        where: { gestorId: g.id },
      }) as any[]

      return {
        gestor: {
          id: g.id,
          nome: g.nome,
          email: g.email,
        },
        membros: atendentes.map((a: any) => ({
          id: a.id,
          nome: a.nome,
          email: a.email,
          role: a.role,
          xp: a.xp,
          level: a.level,
          certCount: a._count?.certificates || 0,
          progressCount: a._count?.progressos || 0,
        })),
        totalMembros: atendentes.length,
      }
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
    const allUsers = req.userRole === 'GESTOR'
      ? await db.findMany('user', { where: { gestorId: req.userId } }) as any[]
      : await db.findMany('user', { where: { role: 'ATENDENTE' } }) as any[]

    const modulos = await db.findMany('modulo', {
      orderBy: { ordem: 'asc' },
    }) as any[]

    const result = await Promise.all(allUsers.map(async (m: any) => {
      const progressos = await db.findMany('progresso', {
        where: { userId: m.id },
      }) as any[]

      // Fetch quiz results for this user
      const quizResponses = await db.findMany('quizResponse', {
        where: { userId: m.id },
      }) as any[]

      const quizResponseMap = new Map<string, any>()
      for (const qr of quizResponses) {
        quizResponseMap.set(qr.quizId, qr)
      }

      // Fetch certificates for this user
      const certificates = await db.findMany('certificate', {
        where: { userId: m.id },
      }) as any[]

      const certMap = new Map<string, any>()
      for (const c of certificates) {
        certMap.set(c.moduloId, c)
      }

      // Fetch notifications sent/received for this user
      const notifications = await db.findMany('notification', {
        where: { fromId: m.id },
      }) as any[]

      return {
        id: m.id,
        nome: m.nome,
        email: m.email,
        role: m.role,
        xp: m.xp,
        lastLogin: m.lastLogin,
        gestorId: m.gestorId,
        modulos: await Promise.all(modulos.map(async (mod: any) => {
          const aulas = await db.findMany('aula', {
            where: { moduloId: mod.id },
            include: { quiz: { include: { perguntas: true } } },
          }) as any[]

          const aulaIds = aulas.map((a: any) => a.id)
          const concluidas = progressos.filter((p: any) => aulaIds.includes(p.aulaId) && p.concluido).length

          const aulasDetail = aulas.map((aula: any) => {
            const quizResult = aula.quiz ? quizResponseMap.get(aula.quiz.id) : null
            return {
              id: aula.id,
              titulo: aula.titulo,
              tipo: aula.tipo,
              concluido: progressos.some((p: any) => p.aulaId === aula.id && p.concluido),
              quiz: aula.quiz ? {
                id: aula.quiz.id,
                titulo: aula.quiz.titulo,
                notaMinima: aula.quiz.notaMinima,
                autoGerarCertificado: aula.quiz.autoGerarCertificado,
                totalPerguntas: aula.quiz.perguntas?.length || 0,
              } : null,
              quizResultado: quizResult ? {
                nota: quizResult.nota,
                total: quizResult.total,
                concluido: quizResult.concluido,
                respostas: quizResult.respostas || null,
                createdAt: quizResult.createdAt,
              } : null,
            }
          })

          const quizzesAprovados = aulasDetail.filter((a: any) => a.quizResultado?.concluido).length
          const quizzesTotal = aulasDetail.filter((a: any) => a.quiz).length
          const allAulasCompleted = concluidas === aulas.length && aulas.length > 0
          const allQuizzesPassed = quizzesTotal > 0 && quizzesAprovados === quizzesTotal

          // Certificate status
          const cert = certMap.get(mod.id)
          const certExpected = mod.autoCertificado && allAulasCompleted && allQuizzesPassed
          const certStatus = cert?.status || null

          // Notification status
          const hasCompletionNotif = notifications.some((n: any) =>
            n.titulo === 'Modulo Completo' && n.mensagem?.includes(mod.titulo)
          )

          // Auto-process audit
          const autoProcessStatus = {
            certExpected: !!certExpected,
            certGenerated: !!cert,
            certStatus,
            notificationSent: hasCompletionNotif,
            issues: [] as string[],
          }

          if (certExpected && !cert) {
            autoProcessStatus.issues.push('Certificado esperado mas nao gerado')
          }
          if (allAulasCompleted && allQuizzesPassed && !hasCompletionNotif) {
            autoProcessStatus.issues.push('Modulo completo mas notificacao nao enviada ao gestor')
          }

          return {
            id: mod.id,
            titulo: mod.titulo,
            totalAulas: aulas.length,
            aulasConcluidas: concluidas,
            quizzesAprovados,
            quizzesTotal,
            allAulasCompleted,
            allQuizzesPassed,
            autoProcessStatus,
            aulas: aulasDetail,
          }
        })),
      }
    }))

    res.json(result)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar detalhe da equipe' })
  }
})

// GET /api/usuarios/equipe/stats - Team stats for admin
router.get('/equipe/stats', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const totalGestores = await db.count('user', { role: 'GESTOR' })
    const totalAtendentes = await db.count('user', { role: 'ATENDENTE' })
    const totalAtendentesComGestor = await db.count('user', { role: 'ATENDENTE', gestorId: { not: null } })
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

    const user = await db.findUnique('user', { id }) as any
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' })

    if (req.userRole === 'GESTOR' && user.gestorId !== req.userId) {
      return res.status(403).json({ error: 'Voce so pode validar atendentes da sua equipe' })
    }

    // Skip if already verified — no duplicate XP
    if (user.emailVerificado) {
      return res.json({ message: 'Conta já validada anteriormente' })
    }

    await db.update('user', { id }, {
      emailVerificado: true,
      tokenVerificacao: null,
      tokenExpiry: null,
    })

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

    const user = await db.findUnique('user', { id }) as any
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' })

    if (req.userRole === 'GESTOR' && user.gestorId !== req.userId) {
      return res.status(403).json({ error: 'Voce so pode reenviar para atendentes da sua equipe' })
    }

    if (user.emailVerificado) {
      return res.status(400).json({ error: 'Email ja verificado' })
    }

    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await db.update('user', { id }, { tokenVerificacao: verificationToken, tokenExpiry })

    const emailResult = await sendVerificationEmail(user.email, user.nome, verificationToken)
    await logActivity(req.userId!, 'Reenviar Verificacao', `Reenviou verificacao para: ${user.nome} | email: ${emailResult.success ? 'OK' : emailResult.error}`)

    res.json({ message: 'Email de verificacao reenviado!' })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao reenviar verificacao' })
  }
})

// POST /api/usuarios/:userId/auto-approve - Auto-approve quiz/aula/module for a user
router.post('/:userId/auto-approve', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const userId = getStringParam(req.params.userId)!
    const { tipo, targetId } = req.body // tipo: 'quiz' | 'aula' | 'modulo', targetId: quiz/aula/modulo id

    const targetUser = await db.findUnique('user', { id: userId }) as any
    if (!targetUser) return res.status(404).json({ error: 'Usuario nao encontrado' })

    if (req.userRole === 'GESTOR' && targetUser.gestorId !== req.userId) {
      return res.status(403).json({ error: 'Voce so pode gerenciar atendentes da sua equipe' })
    }

    if (tipo === 'quiz' && targetId) {
      const quiz = await prisma.quiz.findUnique({ where: { id: targetId }, include: { perguntas: true, aula: true } }) as any
      if (!quiz) return res.status(404).json({ error: 'Quiz nao encontrado' })

      const total = quiz.perguntas.length
      const nota = quiz.notaMinima || 7

      await db.upsert('quizResponse',
        { quizId_userId: { quizId: targetId, userId } },
        { quizId: targetId, userId, nota, total, concluido: true, respostas: {} },
        { nota, total, concluido: true, respostas: {} },
      )

      await db.upsert('progresso',
        { moduloId_aulaId_userId: { moduloId: quiz.aula.moduloId, aulaId: quiz.aulaId, userId } },
        { moduloId: quiz.aula.moduloId, aulaId: quiz.aulaId, userId, concluido: true },
        { concluido: true },
      )

      await logActivity(req.userId!, 'Auto-Aprovar Quiz', `Aprovou quiz "${quiz.titulo}" para ${targetUser.nome}`)
      return res.json({ message: 'Quiz aprovado com sucesso' })
    }

    if (tipo === 'aula' && targetId) {
      const aula = await prisma.aula.findUnique({ where: { id: targetId } }) as any
      if (!aula) return res.status(404).json({ error: 'Aula nao encontrada' })

      await db.upsert('progresso',
        { moduloId_aulaId_userId: { moduloId: aula.moduloId, aulaId: targetId, userId } },
        { moduloId: aula.moduloId, aulaId: targetId, userId, concluido: true },
        { concluido: true },
      )

      if (aula.quizId) {
        const quiz = await prisma.quiz.findUnique({ where: { id: aula.quizId }, include: { perguntas: true } }) as any
        if (quiz) {
          const total = quiz.perguntas.length
          await db.upsert('quizResponse',
            { quizId_userId: { quizId: aula.quizId, userId } },
            { quizId: aula.quizId, userId, nota: quiz.notaMinima || 7, total, concluido: true, respostas: {} },
            { nota: quiz.notaMinima || 7, total, concluido: true, respostas: {} },
          )
        }
      }

      await logActivity(req.userId!, 'Auto-Aprovar Aula', `Aprovou aula "${aula.titulo}" para ${targetUser.nome}`)
      return res.json({ message: 'Aula aprovada com sucesso' })
    }

    if (tipo === 'modulo' && targetId) {
      const modulo = await prisma.modulo.findUnique({ where: { id: targetId }, include: { aulas: { include: { quiz: { include: { perguntas: true } } } } } }) as any
      if (!modulo) return res.status(404).json({ error: 'Modulo nao encontrado' })

      for (const aula of modulo.aulas) {
        await db.upsert('progresso',
          { moduloId_aulaId_userId: { moduloId: targetId, aulaId: aula.id, userId } },
          { moduloId: targetId, aulaId: aula.id, userId, concluido: true },
          { concluido: true },
        )

        if (aula.quiz) {
          const total = aula.quiz.perguntas.length
          await db.upsert('quizResponse',
            { quizId_userId: { quizId: aula.quiz.id, userId } },
            { quizId: aula.quiz.id, userId, nota: aula.quiz.notaMinima || 7, total, concluido: true, respostas: {} },
            { nota: aula.quiz.notaMinima || 7, total, concluido: true, respostas: {} },
          )
        }
      }

      if (modulo.autoCertificado) {
        const existing = await db.findFirst('certificate', { where: { userId, moduloId: targetId } }) as any
        if (!existing) {
          await db.create('certificate', {
            userId,
            moduloId: targetId,
            status: 'APPROVED',
          })
        }
      }

      await logActivity(req.userId!, 'Auto-Aprovar Modulo', `Aprovou modulo "${modulo.titulo}" completo para ${targetUser.nome}`)
      return res.json({ message: 'Modulo completo aprovado com sucesso' })
    }

    return res.status(400).json({ error: 'Tipo invalido. Use: quiz, aula, ou modulo' })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao auto-aprovar' })
  }
})

// POST /api/usuarios/:userId/fix-cert - Force generate/fix certificate for a user
router.post('/:userId/fix-cert', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const userId = getStringParam(req.params.userId)!
    const { moduloId } = req.body as { moduloId: string }

    const targetUser = await db.findUnique('user', { id: userId }) as any
    if (!targetUser) return res.status(404).json({ error: 'Usuario nao encontrado' })
    if (req.userRole === 'GESTOR' && targetUser.gestorId !== req.userId) {
      return res.status(403).json({ error: 'Voce so pode gerenciar atendentes da sua equipe' })
    }

    const modulo = await prisma.modulo.findUnique({ where: { id: moduloId } }) as any
    if (!modulo) return res.status(404).json({ error: 'Modulo nao encontrado' })

    const existing = await db.findFirst('certificate', { where: { userId, moduloId } }) as any
    if (existing) {
      if (existing.status !== 'APPROVED') {
        await db.update('certificate', { id: existing.id }, { status: 'APPROVED' })
      }
      await logActivity(req.userId!, 'Fix Certificado', `Corrigiu certificado do modulo "${modulo.titulo}" para ${targetUser.nome} (era ${existing.status}, agora APPROVED)`)
      return res.json({ message: 'Certificado corrigido para APPROVED' })
    }

    await db.create('certificate', { userId, moduloId, status: 'APPROVED' })
    await awardPointsIfNotAwarded(userId, 'CERTIFICATE', `CERTIFICATE:modulo:${moduloId}`)
    await logActivity(req.userId!, 'Fix Certificado', `Gerou certificado manualmente do modulo "${modulo.titulo}" para ${targetUser.nome}`)
    res.json({ message: 'Certificado gerado com sucesso' })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao corrigir certificado' })
  }
})

// POST /api/usuarios/:userId/fix-notify - Resend notification to gestor
router.post('/:userId/fix-notify', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const userId = getStringParam(req.params.userId)!
    const { titulo, mensagem } = req.body

    const targetUser = await db.findUnique('user', { id: userId }) as any
    if (!targetUser) return res.status(404).json({ error: 'Usuario nao encontrado' })
    if (req.userRole === 'GESTOR' && targetUser.gestorId !== req.userId) {
      return res.status(403).json({ error: 'Voce so pode gerenciar atendentes da sua equipe' })
    }

    const gestorId = targetUser.gestorId
    if (!gestorId) return res.status(400).json({ error: 'Usuario nao tem gestor associado' })

    const notif = await db.create('notification', {
      fromId: userId,
      toId: gestorId,
      titulo: titulo || 'Atualizacao de progresso',
      mensagem: mensagem || `Atualizacao manual sobre o progresso de ${targetUser.nome}`,
    })

    await logActivity(req.userId!, 'Fix Notificacao', `Reenviou notificacao para gestor sobre ${targetUser.nome}: ${titulo || 'Atualizacao de progresso'}`)
    res.json({ message: 'Notificacao enviada com sucesso', notif })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao enviar notificacao' })
  }
})

// POST /api/usuarios/:userId/fix-progress - Force complete a lesson
router.post('/:userId/fix-progress', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const userId = getStringParam(req.params.userId)!
    const { aulaId, moduloId } = req.body

    const targetUser = await db.findUnique('user', { id: userId }) as any
    if (!targetUser) return res.status(404).json({ error: 'Usuario nao encontrado' })
    if (req.userRole === 'GESTOR' && targetUser.gestorId !== req.userId) {
      return res.status(403).json({ error: 'Voce so pode gerenciar atendentes da sua equipe' })
    }

    await db.upsert('progresso',
      { moduloId_aulaId_userId: { moduloId, aulaId, userId } },
      { moduloId, aulaId, userId, concluido: true },
      { concluido: true },
    )

    await logActivity(req.userId!, 'Fix Progresso', `Marcou aula como concluida para ${targetUser.nome}`)
    res.json({ message: 'Progresso corrigido com sucesso' })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao corrigir progresso' })
  }
})

export default router
