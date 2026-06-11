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

export default router
