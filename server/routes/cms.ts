import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()

// GET /api/cms/modulos
router.get('/', authenticate, authorize('ADMIN', 'GESTOR'), async (req, res) => {
  try {
    const modulos = await prisma.modulo.findMany({
      include: {
        trilha: { select: { titulo: true } },
        aulas: { select: { id: true } },
        _count: { select: { aulas: true, progressos: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(modulos)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar módulos' })
  }
})

// POST /api/cms/modulos
router.post('/', authenticate, authorize('ADMIN', 'GESTOR'), async (req, res) => {
  try {
    const { trilhaId, titulo, descricao, ordem, videoUrl, videoInicio, videoFim } = req.body
    if (!trilhaId || !titulo) {
      return res.status(400).json({ error: 'Trilha e título são obrigatórios' })
    }

    const maxOrdem = await prisma.modulo.aggregate({
      where: { trilhaId },
      _max: { ordem: true },
    })

    const modulo = await prisma.modulo.create({
      data: {
        trilhaId,
        titulo,
        descricao: descricao || '',
        ordem: ordem ?? (maxOrdem._max.ordem ?? 0) + 1,
        videoUrl: videoUrl || null,
        videoInicio: videoInicio || null,
        videoFim: videoFim || null,
      },
    })
    res.status(201).json(modulo)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar módulo' })
  }
})

// PUT /api/cms/modulos/:id
router.put('/:id', authenticate, authorize('ADMIN', 'GESTOR'), async (req, res) => {
  try {
    const { titulo, descricao, ordem, videoUrl, videoInicio, videoFim } = req.body
    const modulo = await prisma.modulo.update({
      where: { id: req.params.id },
      data: { titulo, descricao, ordem, videoUrl, videoInicio, videoFim },
    })
    res.json(modulo)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar módulo' })
  }
})

// DELETE /api/cms/modulos/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.modulo.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir módulo' })
  }
})

// GET /api/modulos/:id/aulas
router.get('/:id/aulas', authenticate, async (req, res) => {
  try {
    const aulas = await prisma.aula.findMany({
      where: { moduloId: req.params.id },
      include: { quiz: { include: { perguntas: true } } },
      orderBy: { ordem: 'asc' },
    })
    res.json(aulas)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar aulas' })
  }
})

// POST /api/modulos/:id/aulas
router.post('/:id/aulas', authenticate, authorize('ADMIN', 'GESTOR'), async (req, res) => {
  try {
    const { titulo, descricao, videoUrl, videoInicio, videoFim, duracaoMin } = req.body

    const maxOrdem = await prisma.aula.aggregate({
      where: { moduloId: req.params.id },
      _max: { ordem: true },
    })

    const aula = await prisma.aula.create({
      data: {
        moduloId: req.params.id,
        titulo,
        descricao: descricao || '',
        ordem: (maxOrdem._max.ordem ?? 0) + 1,
        videoUrl: videoUrl || null,
        videoInicio: videoInicio || null,
        videoFim: videoFim || null,
        duracaoMin: duracaoMin || null,
      },
    })
    res.status(201).json(aula)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar aula' })
  }
})

// PUT /api/aulas/:id
router.put('/aulas/:id', authenticate, authorize('ADMIN', 'GESTOR'), async (req, res) => {
  try {
    const { titulo, descricao, videoUrl, videoInicio, videoFim, duracaoMin, ordem } = req.body
    const aula = await prisma.aula.update({
      where: { id: req.params.id },
      data: { titulo, descricao, videoUrl, videoInicio, videoFim, duracaoMin, ordem },
    })
    res.json(aula)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar aula' })
  }
})

// DELETE /api/aulas/:id
router.delete('/aulas/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.aula.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir aula' })
  }
})

// ==================== QUIZ ENDPOINTS ====================

// POST /api/modulos/:id/quiz - Create quiz for an aula
router.post('/:moduloId/quiz', authenticate, authorize('ADMIN', 'GESTOR'), async (req, res) => {
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
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar quiz' })
  }
})

// GET /api/modulos/:moduloId/quiz/:aulaId - Get quiz with questions
router.get('/:moduloId/quiz/:aulaId', authenticate, async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { aulaId: req.params.aulaId },
      include: {
        perguntas: { orderBy: { ordem: 'asc' } },
      },
    })
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz não encontrado' })
    }
    res.json(quiz)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar quiz' })
  }
})

// PUT /api/modulos/quiz/:quizId - Update quiz
router.put('/quiz/:quizId', authenticate, authorize('ADMIN', 'GESTOR'), async (req, res) => {
  try {
    const { titulo, autoGerarCertificado } = req.body
    const quiz = await prisma.quiz.update({
      where: { id: req.params.quizId },
      data: { titulo, autoGerarCertificado },
    })
    res.json(quiz)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar quiz' })
  }
})

// DELETE /api/modulos/quiz/:quizId - Delete quiz
router.delete('/quiz/:quizId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.quiz.delete({ where: { id: req.params.quizId } })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir quiz' })
  }
})

// POST /api/modulos/quiz/:quizId/perguntas - Add question to quiz
router.post('/quiz/:quizId/perguntas', authenticate, authorize('ADMIN', 'GESTOR'), async (req, res) => {
  try {
    const { pergunta, opcaoA, opcaoB, opcaoC, opcaoD, correta } = req.body
    if (!pergunta || !opcaoA || !opcaoB || !correta) {
      return res.status(400).json({ error: 'Pergunta, opção A, opção B e resposta correta são obrigatórias' })
    }

    const maxOrdem = await prisma.quizPergunta.aggregate({
      where: { quizId: req.params.quizId },
      _max: { ordem: true },
    })

    const newPergunta = await prisma.quizPergunta.create({
      data: {
        quizId: req.params.quizId,
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
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar pergunta' })
  }
})

// PUT /api/modulos/perguntas/:perguntaId - Update question
router.put('/perguntas/:perguntaId', authenticate, authorize('ADMIN', 'GESTOR'), async (req, res) => {
  try {
    const { pergunta, opcaoA, opcaoB, opcaoC, opcaoD, correta, ordem } = req.body
    const updated = await prisma.quizPergunta.update({
      where: { id: req.params.perguntaId },
      data: { pergunta, opcaoA, opcaoB, opcaoC, opcaoD, correta, ordem },
    })
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar pergunta' })
  }
})

// DELETE /api/modulos/perguntas/:perguntaId - Delete question
router.delete('/perguntas/:perguntaId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.quizPergunta.delete({ where: { id: req.params.perguntaId } })
    res.json({ success: true })
  } catch (error) {
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

    // Auto-generate certificate if quiz passed and autoGerarCertificado is enabled
    if (concluido && quiz.autoGerarCertificado) {
      const aula = await prisma.aula.findUnique({ where: { id: quiz.aulaId } })
      if (aula) {
        const modulo = await prisma.modulo.findUnique({ where: { id: aula.moduloId } })
        if (modulo) {
          const existingCert = await prisma.certificate.findFirst({
            where: { userId: req.userId, trilhaId: modulo.trilhaId },
          })
          if (!existingCert) {
            await prisma.certificate.create({
              data: {
                userId: req.userId,
                trilhaId: modulo.trilhaId,
                status: 'APPROVED',
              },
            })
          }
        }
      }
    }

    res.json({ nota, total, correct, concluido, response })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar respostas' })
  }
})

// GET /api/modulos/quiz/:quizId/resultados - Get quiz results
router.get('/quiz/:quizId/resultados', authenticate, async (req: any, res) => {
  try {
    const responses = await prisma.quizResponse.findMany({
      where: { quizId: req.params.quizId },
      include: { user: { select: { id: true, nome: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(responses)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar resultados' })
  }
})

export default router
