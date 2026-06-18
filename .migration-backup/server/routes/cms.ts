import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { getStringParam } from '../utils/queryParams'
import { awardPoints } from '../services/gamification'

const router = Router()

// GET /api/cms/modulos - accessible to all authenticated users
router.get('/', authenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const skip = (page - 1) * limit

    const [modulos, total] = await Promise.all([
      prisma.modulo.findMany({
        include: {
          aulas: { select: { id: true } },
          _count: { select: { aulas: true, progressos: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.modulo.count(),
    ])

    res.json({
      data: modulos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch {
    res.status(500).json({ error: 'Erro ao buscar modulos' })
  }
})

// POST /api/cms/modulos
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { titulo, descricao, ordem, videoUrl, videoInicio, videoFim, obrigatorio, autoCertificado } = req.body
    if (!titulo) {
      return res.status(400).json({ error: 'Título é obrigatório' })
    }

    const maxOrdem = await prisma.modulo.aggregate({
      _max: { ordem: true },
    })

    const modulo = await prisma.modulo.create({
      data: {
        titulo,
        descricao: descricao || '',
        ordem: ordem ?? ((maxOrdem._max.ordem ?? 0) + 1),
        videoUrl: videoUrl || null,
        videoInicio: videoInicio || null,
        videoFim: videoFim || null,
        obrigatorio: obrigatorio || false,
        autoCertificado: autoCertificado || false,
      },
    })
    res.status(201).json(modulo)
  } catch {
    res.status(500).json({ error: 'Erro ao criar módulo' })
  }
})

// PUT /api/cms/modulos/:id
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { titulo, descricao, ordem, videoUrl, videoInicio, videoFim, obrigatorio, autoCertificado } = req.body
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    const modulo = await prisma.modulo.update({
      where: { id },
      data: { titulo, descricao, ordem, videoUrl, videoInicio, videoFim, obrigatorio, autoCertificado },
    })
    res.json(modulo)
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar módulo' })
  }
})

// DELETE /api/cms/modulos/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    await prisma.modulo.delete({ where: { id } })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Erro ao excluir módulo' })
  }
})

// GET /api/modulos/:id/aulas
router.get('/:id/aulas', authenticate, async (req: any, res) => {
  try {
    const moduloId = getStringParam(req.params.id)
    if (!moduloId) return res.status(400).json({ error: 'ID inválido' })
    let aulas = await prisma.aula.findMany({
      where: { moduloId },
      include: {
        quiz: { include: { perguntas: true } },
        progressos: { where: { userId: req.userId }, select: { concluido: true } },
      },
      orderBy: { ordem: 'asc' },
    })

    if (aulas.length === 0) {
      const modulo = await prisma.modulo.findUnique({ where: { id: moduloId } })
      const titulo = modulo?.titulo || 'Modulo'
      const demoAulas = [
        { titulo: `Introducao a ${titulo}`, descricao: `Conceitos basicos e visao geral de ${titulo}.`, duracaoMin: 15 },
        { titulo: `Praticas Fundamentais`, descricao: `Melhores praticas e tecnicas essenciais.`, duracaoMin: 20 },
        { titulo: `Aplicacao Pratica`, descricao: `Exercicios praticos e estudos de caso.`, duracaoMin: 25 },
      ]

      for (let i = 0; i < demoAulas.length; i++) {
        const d = demoAulas[i]
        const aula = await prisma.aula.create({
          data: { moduloId, titulo: d.titulo, descricao: d.descricao, ordem: i + 1, duracaoMin: d.duracaoMin },
        })
        const quiz = await prisma.quiz.create({
          data: { aulaId: aula.id, titulo: `Quiz: ${d.titulo}`, autoGerarCertificado: i === demoAulas.length - 1 },
        })
        await prisma.quizPergunta.create({
          data: {
            quizId: quiz.id, pergunta: `Pergunta principal sobre ${d.titulo}?`,
            opcaoA: 'Alternativa incorreta A', opcaoB: 'Alternativa correta',
            opcaoC: 'Alternativa incorreta C', opcaoD: 'Alternativa incorreta D',
            correta: 'B', ordem: 1,
          },
        })
      }

      aulas = await prisma.aula.findMany({
        where: { moduloId },
        include: {
          quiz: { include: { perguntas: true } },
          progressos: { where: { userId: req.userId }, select: { concluido: true } },
        },
        orderBy: { ordem: 'asc' },
      })
    }

    const result = aulas.map(a => ({
      ...a,
      concluido: a.progressos.length > 0 ? a.progressos[0].concluido : false,
      progressos: undefined,
    }))

    res.json(result)
  } catch {
    res.status(500).json({ error: 'Erro ao buscar aulas' })
  }
})

// POST /api/modulos/:id/aulas
router.post('/:id/aulas', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { titulo, descricao, tipo, videoUrl, pdfUrl, videoInicio, videoFim, duracaoMin, obrigatorio } = req.body
    const moduloId = getStringParam(req.params.id)
    if (!moduloId) return res.status(400).json({ error: 'ID inválido' })

    const maxOrdem = await prisma.aula.aggregate({
      where: { moduloId },
      _max: { ordem: true },
    })

    const aula = await prisma.aula.create({
      data: {
        moduloId,
        titulo,
        descricao: descricao || '',
        ordem: (maxOrdem._max.ordem ?? 0) + 1,
        tipo: tipo || 'VIDEO',
        videoUrl: videoUrl || null,
        pdfUrl: pdfUrl || null,
        videoInicio: videoInicio || null,
        videoFim: videoFim || null,
        duracaoMin: duracaoMin || null,
        obrigatorio: obrigatorio || false,
      },
    })
    res.status(201).json(aula)
  } catch {
    res.status(500).json({ error: 'Erro ao criar aula' })
  }
})

// PUT /api/aulas/:id
router.put('/aulas/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { titulo, descricao, tipo, videoUrl, pdfUrl, videoInicio, videoFim, duracaoMin, ordem, obrigatorio } = req.body
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    const aula = await prisma.aula.update({
      where: { id },
      data: { titulo, descricao, tipo, videoUrl, pdfUrl, videoInicio, videoFim, duracaoMin, ordem, obrigatorio },
    })
    res.json(aula)
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar aula' })
  }
})

// DELETE /api/aulas/:id
router.delete('/aulas/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    await prisma.aula.delete({ where: { id } })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Erro ao excluir aula' })
  }
})

// ==================== QUIZ ENDPOINTS ====================

// POST /api/modulos/:moduloId/quiz - Create quiz for an aula
router.post('/:moduloId/quiz', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { aulaId, titulo, autoGerarCertificado } = req.body
    if (!aulaId || !titulo) {
      return res.status(400).json({ error: 'aulaId e titulo são obrigatórios' })
    }

    const existing = await prisma.quiz.findUnique({ where: { aulaId } })
    if (existing) {
      return res.status(409).json({ error: 'Esta aula já possui um quiz' })
    }

    const quiz = await prisma.quiz.create({
      data: {
        aulaId,
        titulo,
        autoGerarCertificado: autoGerarCertificado || false,
      },
    })
    res.status(201).json(quiz)
  } catch {
    res.status(500).json({ error: 'Erro ao criar quiz' })
  }
})

// GET /api/modulos/:moduloId/quiz/:aulaId - Get quiz with questions
router.get('/:moduloId/quiz/:aulaId', authenticate, async (req, res) => {
  try {
    const aulaId = getStringParam(req.params.aulaId)
    if (!aulaId) return res.status(400).json({ error: 'ID inválido' })
    const quiz = await prisma.quiz.findUnique({
      where: { aulaId },
      include: {
        perguntas: { orderBy: { ordem: 'asc' } },
      },
    })
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz não encontrado' })
    }
    res.json(quiz)
  } catch {
    res.status(500).json({ error: 'Erro ao buscar quiz' })
  }
})

// PUT /api/modulos/quiz/:quizId - Update quiz
router.put('/quiz/:quizId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { titulo, autoGerarCertificado } = req.body
    const quizId = getStringParam(req.params.quizId)
    if (!quizId) return res.status(400).json({ error: 'ID inválido' })
    const quiz = await prisma.quiz.update({
      where: { id: quizId },
      data: { titulo, autoGerarCertificado },
    })
    res.json(quiz)
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar quiz' })
  }
})

// DELETE /api/modulos/quiz/:quizId - Delete quiz
router.delete('/quiz/:quizId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const quizId = getStringParam(req.params.quizId)
    if (!quizId) return res.status(400).json({ error: 'ID inválido' })
    await prisma.quiz.delete({ where: { id: quizId } })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Erro ao excluir quiz' })
  }
})

// POST /api/modulos/quiz/:quizId/perguntas - Add question to quiz
router.post('/quiz/:quizId/perguntas', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { pergunta, opcaoA, opcaoB, opcaoC, opcaoD, correta } = req.body
    const quizId = getStringParam(req.params.quizId)
    if (!quizId) return res.status(400).json({ error: 'ID inválido' })
    if (!pergunta || !opcaoA || !opcaoB || !correta) {
      return res.status(400).json({ error: 'Pergunta, opção A, opção B e resposta correta são obrigatórias' })
    }

    const maxOrdem = await prisma.quizPergunta.aggregate({
      where: { quizId },
      _max: { ordem: true },
    })

    const newPergunta = await prisma.quizPergunta.create({
      data: {
        quizId,
        pergunta,
        opcaoA,
        opcaoB,
        opcaoC: opcaoC || null,
        opcaoD: opcaoD || null,
        correta,
        ordem: (maxOrdem._max.ordem ?? 0) + 1,
      },
    })
    res.status(201).json(newPergunta)
  } catch {
    res.status(500).json({ error: 'Erro ao criar pergunta' })
  }
})

// PUT /api/modulos/perguntas/:perguntaId - Update question
router.put('/perguntas/:perguntaId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { pergunta, opcaoA, opcaoB, opcaoC, opcaoD, correta, ordem } = req.body
    const perguntaId = getStringParam(req.params.perguntaId)
    if (!perguntaId) return res.status(400).json({ error: 'ID inválido' })
    const updated = await prisma.quizPergunta.update({
      where: { id: perguntaId },
      data: { pergunta, opcaoA, opcaoB, opcaoC, opcaoD, correta, ordem },
    })
    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar pergunta' })
  }
})

// DELETE /api/modulos/perguntas/:perguntaId - Delete question
router.delete('/perguntas/:perguntaId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const perguntaId = getStringParam(req.params.perguntaId)
    if (!perguntaId) return res.status(400).json({ error: 'ID inválido' })
    await prisma.quizPergunta.delete({ where: { id: perguntaId } })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Erro ao excluir pergunta' })
  }
})

// POST /api/modulos/quiz/:quizId/responder - Submit quiz answers
router.post('/quiz/:quizId/responder', authenticate, async (req: any, res) => {
  try {
    const { respostas } = req.body // { perguntaId: 'A'|'B'|'C'|'D' }
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.quizId },
      include: { perguntas: true },
    })
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz não encontrado' })
    }

    let correct = 0
    quiz.perguntas.forEach((p) => {
      if (respostas[p.id] === p.correta) correct++
    })

    const total = quiz.perguntas.length
    const nota = total > 0 ? Math.round((correct / total) * 10) : 0
    const concluido = nota >= 7

    const response = await prisma.quizResponse.upsert({
      where: { quizId_userId: { quizId: req.params.quizId, userId: req.userId } },
      update: { nota, total, concluido },
      create: { quizId: req.params.quizId, userId: req.userId, nota, total, concluido },
    })

    if (correct > 0) {
      await awardPoints(req.userId, 'QUIZ_CORRECT', `${correct}/${total} respostas corretas no quiz`)
    }

    if (concluido) {
      await awardPoints(req.userId, 'QUIZ_PASS', `Quiz aprovado com nota ${nota}/10`)
    }

    // Auto-generate certificate if: quiz passed + autoGerarCertificado + ALL aulas completed
    if (concluido && quiz.autoGerarCertificado) {
      const aula = await prisma.aula.findUnique({ where: { id: quiz.aulaId } })
      if (aula) {
        const modulo = await prisma.modulo.findUnique({
          where: { id: aula.moduloId },
          include: { aulas: true },
        })
        if (modulo) {
          const allAulasCompleted = await prisma.progresso.count({
            where: {
              moduloId: aula.moduloId,
              userId: req.userId,
              concluido: true,
            },
          })

          if (allAulasCompleted >= modulo.aulas.length) {
            const existingCert = await prisma.certificate.findFirst({
              where: { userId: req.userId, moduloId: aula.moduloId },
            })
            if (!existingCert) {
              const certStatus = modulo.autoCertificado ? 'APPROVED' : 'PENDING'
              await prisma.certificate.create({
                data: {
                  userId: req.userId,
                  moduloId: aula.moduloId,
                  status: certStatus,
                },
              })
              await awardPoints(req.userId, 'CERTIFICATE', `Certificado emitido: ${modulo.titulo}`)
            }
          }
        }
      }
    }

    res.json({ nota, total, correct, concluido, response })
  } catch {
    res.status(500).json({ error: 'Erro ao enviar respostas' })
  }
})

// GET /api/modulos/quiz/:quizId/resultados - Get quiz results
router.get('/quiz/:quizId/resultados', authenticate, async (req: any, res) => {
  try {
    const where: any = { quizId: req.params.quizId }
    if (req.userRole !== 'ADMIN') {
      where.userId = req.userId
    }
    const responses = await prisma.quizResponse.findMany({
      where,
      include: { user: { select: { id: true, nome: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(responses)
  } catch {
    res.status(500).json({ error: 'Erro ao buscar resultados' })
  }
})

// POST /api/modulos/:id/open - Track module open
router.post('/:id/open', authenticate, async (req: any, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID invalido' })

    const modulo = await prisma.modulo.findUnique({ where: { id } })
    if (!modulo) return res.status(404).json({ error: 'Modulo nao encontrado' })

    await awardPoints(req.userId, 'MODULE_OPEN', `Modulo aberto: ${modulo.titulo}`)

    res.json({ message: 'Modulo registrado', xp: 20 })
  } catch {
    res.status(500).json({ error: 'Erro ao registrar abertura do modulo' })
  }
})

// GET /api/modulos/gamification/leaderboard - Get leaderboard
router.get('/gamification/leaderboard', authenticate, async (req: any, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, nome: true, email: true, role: true, xp: true },
      orderBy: { xp: 'desc' },
      take: 20,
    })

    const result = users.map((u, i) => ({
      ...u,
      rank: i + 1,
      level: Math.floor(u.xp / 2000) + 1,
    }))

    res.json(result)
  } catch {
    res.status(500).json({ error: 'Erro ao buscar leaderboard' })
  }
})

// GET /api/modulos/gamification/stats - Get gamification stats
router.get('/gamification/stats', authenticate, async (req: any, res) => {
  try {
    const totalXpResult = await prisma.user.aggregate({
      _sum: { xp: true },
      _avg: { xp: true },
      _count: { id: true },
    })

    const topActions = await prisma.pointsTransaction.groupBy({
      by: ['action'],
      _sum: { points: true },
      _count: { id: true },
      orderBy: { _sum: { points: 'desc' } },
    })

    res.json({
      totalXpDistributed: totalXpResult._sum.xp || 0,
      averageXp: Math.round(totalXpResult._avg.xp || 0),
      totalUsers: totalXpResult._count.id,
      topActions,
    })
  } catch {
    res.status(500).json({ error: 'Erro ao buscar estatisticas de gamificacao' })
  }
})

export default router
