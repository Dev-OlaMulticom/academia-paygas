import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { db } from '../lib/db'
import { authenticate, authorize } from '../middleware/auth'
import { getStringParam } from '../utils/queryParams'
import { awardPointsIfNotAwarded } from '../services/gamification'
import { logActivity } from '../services/log'
import { sendNotificationAlertEmail } from '../services/email'

const router = Router()

// GET /api/cms/modulos - accessible to all authenticated users
router.get('/', authenticate, async (req: any, res) => {
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
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar modulos' })
  }
})

// GET /api/cms/:id - Get single modulo
router.get('/:id', authenticate, async (req: any, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    const modulo = await prisma.modulo.findUnique({
      where: { id },
      include: {
        aulas: { select: { id: true } },
        _count: { select: { aulas: true, progressos: true } },
      },
    })
    if (!modulo) return res.status(404).json({ error: 'Módulo não encontrado' })
    res.json(modulo)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar módulo' })
  }
})

// POST /api/cms/modulos
router.post('/', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const { titulo, descricao, ordem, videoUrl, videoInicio, videoFim, obrigatorio, autoCertificado, icone, certificadoTemplate } = req.body
    if (!titulo) {
      return res.status(400).json({ error: 'Título é obrigatório' })
    }

    const maxOrdem = await prisma.modulo.aggregate({
      _max: { ordem: true },
    })

    const modulo = await db.create('modulo', {
      titulo,
      descricao: descricao || '',
      ordem: ordem ?? ((maxOrdem._max.ordem ?? 0) + 1),
      icone: icone || null,
      videoUrl: videoUrl || null,
      videoInicio: videoInicio || null,
      videoFim: videoFim || null,
      obrigatorio: obrigatorio || false,
      autoCertificado: autoCertificado || false,
      certificadoTemplate: certificadoTemplate || null,
    })
    await logActivity(req.userId!, 'Criar Modulo', `Modulo: ${titulo}`)
    res.status(201).json(modulo)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao criar módulo' })
  }
})

// PUT /api/cms/modulos/:id
router.put('/:id', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const { titulo, descricao, ordem, videoUrl, videoInicio, videoFim, obrigatorio, autoCertificado, icone, certificadoTemplate } = req.body
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    const modulo = await db.update('modulo', { id }, {
      titulo, descricao, ordem, videoUrl, videoInicio, videoFim, obrigatorio, autoCertificado, icone, certificadoTemplate,
    })
    await logActivity(req.userId!, 'Editar Modulo', `Modulo: ${modulo.titulo}`)
    res.json(modulo)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao atualizar módulo' })
  }
})

// DELETE /api/cms/modulos/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    await db.delete('modulo', { id })
    await logActivity(req.userId!, 'Excluir Modulo', `Modulo ID: ${id}`)
    res.json({ success: true })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao excluir módulo' })
  }
})

// GET /api/modulos/:id/aulas
router.get('/:id/aulas', authenticate, async (req: any, res) => {
  try {
    const moduloId = getStringParam(req.params.id)
    if (!moduloId) return res.status(400).json({ error: 'ID inválido' })

    const moduloExists = await prisma.modulo.findUnique({ where: { id: moduloId }, select: { id: true } })
    if (!moduloExists) return res.status(404).json({ error: 'Módulo não encontrado' })

    let aulas = await prisma.aula.findMany({
      where: { moduloId },
      include: {
        quiz: { include: { perguntas: true } },
        licoes: { orderBy: { ordem: 'asc' } },
        progressos: { where: { userId: req.userId }, select: { concluido: true } },
      },
      orderBy: { ordem: 'asc' },
    })

    // Auto-migrate: if aula has no ancoragemPoints but has VIDEO licoes with inicioSeg, convert them
    for (const a of aulas) {
      if (!a.ancoragemPoints && a.licoes.length > 0) {
        const videoLicoes = a.licoes.filter((l: any) => l.tipo === 'VIDEO' && l.inicioSeg != null && l.conteudo === a.videoUrl)
        if (videoLicoes.length > 0) {
          const points = videoLicoes.map((l: any) => ({
            hours: Math.floor((l.inicioSeg || 0) / 3600),
            minutes: Math.floor(((l.inicioSeg || 0) % 3600) / 60),
            seconds: (l.inicioSeg || 0) % 60,
            titulo: l.titulo || '',
          }))
          try {
            await prisma.aula.update({ where: { id: a.id }, data: { ancoragemPoints: points } })
            ;(a as any).ancoragemPoints = points
          } catch { /* ignore */ }
        }
      }
    }

    const result = aulas.map(a => ({
      ...a,
      concluido: a.progressos.length > 0 ? a.progressos[0].concluido : false,
      progressos: undefined,
    }))

    res.json(result)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar aulas' })
  }
})

// POST /api/modulos/:id/aulas
router.post('/:id/aulas', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const { titulo, descricao, tipo, videoUrl, pdfUrl, videoInicio, videoFim, duracaoMin, obrigatorio, ancoragemPoints } = req.body
    const moduloId = getStringParam(req.params.id)
    if (!moduloId) return res.status(400).json({ error: 'ID inválido' })

    const maxOrdem = await prisma.aula.aggregate({
      where: { moduloId },
      _max: { ordem: true },
    })

    const aula = await db.create('aula', {
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
      ancoragemPoints: ancoragemPoints || null,
    })
    await logActivity(req.userId!, 'Criar Aula', `Aula: ${titulo}`)
    res.status(201).json(aula)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao criar aula' })
  }
})

// PUT /api/aulas/:id
router.put('/aulas/:id', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const { titulo, descricao, tipo, videoUrl, pdfUrl, videoInicio, videoFim, duracaoMin, ordem, obrigatorio, ancoragemPoints } = req.body
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    const aula = await db.update('aula', { id }, {
      titulo, descricao, tipo, videoUrl, pdfUrl, videoInicio, videoFim, duracaoMin, ordem, obrigatorio, ancoragemPoints,
    })
    await logActivity(req.userId!, 'Editar Aula', `Aula: ${aula.titulo}`)
    res.json(aula)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao atualizar aula' })
  }
})

// DELETE /api/aulas/:id
router.delete('/aulas/:id', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    await db.delete('aula', { id })
    await logActivity(req.userId!, 'Excluir Aula', `Aula ID: ${id}`)
    res.json({ success: true })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao excluir aula' })
  }
})

// ==================== LICAO ENDPOINTS ====================

// GET /api/cms/aulas/:aulaId/licoes
router.get('/aulas/:aulaId/licoes', authenticate, async (req: any, res) => {
  try {
    const aulaId = getStringParam(req.params.aulaId)
    if (!aulaId) return res.status(400).json({ error: 'ID inválido' })

    const licoes = await prisma.licao.findMany({
      where: { aulaId },
      orderBy: { ordem: 'asc' },
    })
    res.json(licoes)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar lições' })
  }
})

// POST /api/cms/aulas/:aulaId/licoes
router.post('/aulas/:aulaId/licoes', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const aulaId = getStringParam(req.params.aulaId)
    if (!aulaId) return res.status(400).json({ error: 'ID inválido' })

    const { titulo, conteudo, tipo, duracaoMin, inicioSeg, fimSeg } = req.body
    if (!titulo) return res.status(400).json({ error: 'Título é obrigatório' })

    const maxOrdem = await prisma.licao.aggregate({
      where: { aulaId },
      _max: { ordem: true },
    })

    const licao = await db.create('licao', {
      aulaId,
      titulo,
      conteudo: conteudo || null,
      tipo: tipo || 'TEXTO',
      duracaoMin: duracaoMin || null,
      inicioSeg: typeof inicioSeg === 'number' ? inicioSeg : null,
      fimSeg: typeof fimSeg === 'number' ? fimSeg : null,
      ordem: (maxOrdem._max.ordem ?? 0) + 1,
    })
    await logActivity(req.userId!, 'Criar Licao', `Licao: ${titulo}`)
    res.status(201).json(licao)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao criar lição' })
  }
})

// PUT /api/cms/licoes/:id
router.put('/licoes/:id', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    const { titulo, conteudo, tipo, ordem, duracaoMin, inicioSeg, fimSeg } = req.body
    const licao = await db.update('licao', { id }, {
      titulo,
      conteudo,
      tipo,
      ordem,
      duracaoMin,
      ...(typeof inicioSeg === 'number' ? { inicioSeg } : {}),
      ...(typeof fimSeg === 'number' ? { fimSeg } : {}),
    })
    await logActivity(req.userId!, 'Editar Licao', `Licao: ${licao.titulo}`)
    res.json(licao)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao atualizar lição' })
  }
})

// DELETE /api/cms/licoes/:id
router.delete('/licoes/:id', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    await db.delete('licao', { id })
    await logActivity(req.userId!, 'Excluir Licao', `Licao ID: ${id}`)
    res.json({ success: true })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao excluir lição' })
  }
})

// ==================== QUIZ ENDPOINTS ====================

// POST /api/modulos/:moduloId/quiz - Create quiz for an aula
router.post('/:moduloId/quiz', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const { aulaId, titulo, autoGerarCertificado, notaMinima } = req.body
    if (!aulaId || !titulo) {
      return res.status(400).json({ error: 'aulaId e titulo são obrigatórios' })
    }

    const existing = await prisma.quiz.findUnique({ where: { aulaId } })
    if (existing) {
      return res.status(409).json({ error: 'Esta aula já possui um quiz' })
    }

    const quiz = await db.create('quiz', {
      aulaId,
      titulo,
      autoGerarCertificado: autoGerarCertificado || false,
      notaMinima: typeof notaMinima === 'number' ? notaMinima : 7,
    })
    await logActivity(req.userId!, 'Criar Quiz', `Quiz: ${titulo}`)
    res.status(201).json(quiz)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao criar quiz' })
  }
})

// GET /api/modulos/:moduloId/quiz/:aulaId - Get quiz with questions
router.get('/:moduloId/quiz/:aulaId', authenticate, async (req: any, res) => {
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
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar quiz' })
  }
})

// PUT /api/modulos/quiz/:quizId - Update quiz
router.put('/quiz/:quizId', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const { titulo, autoGerarCertificado, notaMinima } = req.body
    const quizId = getStringParam(req.params.quizId)
    if (!quizId) return res.status(400).json({ error: 'ID inválido' })
    const quiz = await db.update('quiz', { id: quizId }, {
      titulo, autoGerarCertificado, ...(typeof notaMinima === 'number' ? { notaMinima } : {}),
    })
    await logActivity(req.userId!, 'Editar Quiz', `Quiz: ${quiz.titulo}`)
    res.json(quiz)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao atualizar quiz' })
  }
})

// DELETE /api/modulos/quiz/:quizId - Delete quiz
router.delete('/quiz/:quizId', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const quizId = getStringParam(req.params.quizId)
    if (!quizId) return res.status(400).json({ error: 'ID inválido' })
    await db.delete('quiz', { id: quizId })
    await logActivity(req.userId!, 'Excluir Quiz', `Quiz ID: ${quizId}`)
    res.json({ success: true })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao excluir quiz' })
  }
})

// POST /api/modulos/quiz/:quizId/perguntas - Add question to quiz
router.post('/quiz/:quizId/perguntas', authenticate, authorize('ADMIN'), async (req: any, res) => {
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

    const newPergunta = await db.create('quizPergunta', {
      quizId,
      pergunta,
      opcaoA,
      opcaoB,
      opcaoC: opcaoC || null,
      opcaoD: opcaoD || null,
      correta,
      ordem: (maxOrdem._max.ordem ?? 0) + 1,
    })
    res.status(201).json(newPergunta)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao criar pergunta' })
  }
})

// PUT /api/modulos/perguntas/:perguntaId - Update question
router.put('/perguntas/:perguntaId', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const { pergunta, opcaoA, opcaoB, opcaoC, opcaoD, correta, ordem } = req.body
    const perguntaId = getStringParam(req.params.perguntaId)
    if (!perguntaId) return res.status(400).json({ error: 'ID inválido' })
    const updated = await db.update('quizPergunta', { id: perguntaId }, {
      pergunta, opcaoA, opcaoB, opcaoC, opcaoD, correta, ordem,
    })
    res.json(updated)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao atualizar pergunta' })
  }
})

// DELETE /api/modulos/perguntas/:perguntaId - Delete question
router.delete('/perguntas/:perguntaId', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const perguntaId = getStringParam(req.params.perguntaId)
    if (!perguntaId) return res.status(400).json({ error: 'ID inválido' })
    await db.delete('quizPergunta', { id: perguntaId })
    res.json({ success: true })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
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
    const concluido = nota >= (quiz.notaMinima || 7)

    const response = await db.upsert('quizResponse',
      { quizId_userId: { quizId: req.params.quizId, userId: req.userId } },
      { quizId: req.params.quizId, userId: req.userId, nota, total, concluido, respostas: respostas || {} },
      { nota, total, concluido, respostas: respostas || {} },
    )

    if (concluido) {
      if (correct > 0) {
        await awardPointsIfNotAwarded(req.userId, 'QUIZ_CORRECT', `QUIZ_CORRECT:quiz:${req.params.quizId}`)
      }
      await awardPointsIfNotAwarded(req.userId, 'QUIZ_PASS', `QUIZ_PASS:quiz:${req.params.quizId}`)
      await logActivity(req.userId, 'Quiz Aprovado', `Quiz: ${quiz.titulo} — Nota ${nota}/10`)

      // Mark lesson as completed only when quiz is passed
      const quizAula = await prisma.aula.findUnique({ where: { id: quiz.aulaId }, select: { moduloId: true } })
      if (quizAula) {
        await db.upsert('progresso',
          { moduloId_aulaId_userId: { moduloId: quizAula.moduloId, aulaId: quiz.aulaId, userId: req.userId } },
          { moduloId: quizAula.moduloId, aulaId: quiz.aulaId, userId: req.userId, concluido: true },
          { concluido: true },
        )
      }

      // Notify gestor when ATENDENTE passes a quiz
      const quizUser = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, nome: true, email: true, role: true, gestorId: true } })
      if (quizUser?.role === 'ATENDENTE' && quizUser.gestorId) {
        const gestor = await prisma.user.findUnique({ where: { id: quizUser.gestorId }, select: { id: true, nome: true, email: true } })
        if (gestor) {
          const titulo = 'Quiz Aprovado'
          const mensagem = `${quizUser.nome} aprovou no quiz "${quiz.titulo}" com nota ${nota}/10.`
          db.create('notification', { fromId: req.userId, toId: gestor.id, titulo, mensagem }).catch(() => {})
          sendNotificationAlertEmail(gestor.email, gestor.nome || gestor.email, titulo).then(r => {
            if (!r.success) console.warn(`[EMAIL] Falha ao enviar quiz-notify para ${gestor.email}: ${r.error}`)
          })
        }
      }
    } else {
      await logActivity(req.userId, 'Quiz Reprovado', `Quiz: ${quiz.titulo} — Nota ${nota}/10`)
    }

    // Auto-generate certificate if: quiz passed + (autoGerarCertificado OR modulo.autoCertificado) + ALL aulas completed
    if (concluido) {
      const aula = await prisma.aula.findUnique({ where: { id: quiz.aulaId } })
      if (aula) {
        const modulo = await prisma.modulo.findUnique({
          where: { id: aula.moduloId },
          include: { aulas: true },
        })
        if (modulo && (quiz.autoGerarCertificado || modulo.autoCertificado)) {
          const allAulasCompleted = await prisma.progresso.count({
            where: {
              moduloId: aula.moduloId,
              userId: req.userId,
              concluido: true,
            },
          })

          if (allAulasCompleted >= modulo.aulas.length) {
            const certStatus = modulo.autoCertificado ? 'APPROVED' : 'PENDING'
            try {
              await db.upsert('certificate',
                { userId_moduloId: { userId: req.userId, moduloId: aula.moduloId } },
                { userId: req.userId, moduloId: aula.moduloId, status: certStatus },
                {},
              )
              await awardPointsIfNotAwarded(req.userId, 'CERTIFICATE', `CERTIFICATE:modulo:${aula.moduloId}`)
              await logActivity(req.userId, 'Certificado Gerado', `Modulo: ${modulo.titulo}`)

              // Notify gestor when ATENDENTE completes entire module
              const quizUser = await prisma.user.findUnique({ where: { id: req.userId }, select: { id: true, nome: true, role: true, gestorId: true } })
              if (quizUser?.role === 'ATENDENTE' && quizUser.gestorId) {
                const gestor = await prisma.user.findUnique({ where: { id: quizUser.gestorId }, select: { id: true, nome: true, email: true } })
                if (gestor) {
                  const titulo = 'Modulo Completo'
                  const mensagem = `${quizUser.nome} completou o modulo "${modulo.titulo}" e recebeu o certificado.`
                  db.create('notification', { fromId: req.userId, toId: gestor.id, titulo, mensagem }).catch(() => {})
                }
              }
            } catch {
              // Certificate already exists (race condition), skip
            }
          }
        }
      }
    }

    res.json({ nota, total, correct, concluido, aulaId: quiz.aulaId, response })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
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
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
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

    await awardPointsIfNotAwarded(req.userId, 'MODULE_OPEN', `MODULE_OPEN:modulo:${id}`)
    await logActivity(req.userId, 'Modulo Aberto', `Modulo: ${modulo.titulo}`)

    res.json({ message: 'Modulo registrado' })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao registrar abertura do modulo' })
  }
})

// POST /api/modulos/aula/:aulaId/view - Track lesson view (XP for viewing a lesson)
router.post('/aula/:aulaId/view', authenticate, async (req: any, res) => {
  try {
    const aulaId = getStringParam(req.params.aulaId)
    if (!aulaId) return res.status(400).json({ error: 'ID invalido' })

    const aula = await prisma.aula.findUnique({ where: { id: aulaId }, select: { id: true, titulo: true } })
    if (!aula) return res.status(404).json({ error: 'Aula nao encontrada' })

    // Award LESSON_VIEW points (dedup per aula per user — once per view session is enough)
    await awardPointsIfNotAwarded(req.userId, 'LESSON_VIEW', `LESSON_VIEW:aula:${aulaId}`)
    await logActivity(req.userId, 'Licao Visualizada', `Aula: ${aula.titulo}`)

    res.json({ message: 'Visualização registrada' })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao registrar visualização' })
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
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
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
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar estatisticas de gamificacao' })
  }
})

export default router
