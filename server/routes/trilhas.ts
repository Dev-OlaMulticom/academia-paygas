import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { getStringParam } from '../utils/queryParams'

const router = Router()

// GET /api/trilhas
router.get('/', authenticate, async (req: any, res) => {
  try {
    const trilhas = await prisma.trilha.findMany({
      include: {
        modulos: {
          include: { aulas: true },
          orderBy: { ordem: 'asc' },
        },
      },
      orderBy: { titulo: 'asc' },
    })

    const result = trilhas.map(t => ({
      ...t,
      lessons: t.modulos.reduce((acc, m) => acc + m.aulas.length, 0),
      modulos: undefined,
    }))

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar trilhas' })
  }
})

// POST /api/trilhas
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { titulo, descricao, icon, color, obrigatorio } = req.body
    const trilha = await prisma.trilha.create({
      data: { titulo, descricao, icon: icon || '📚', color: color || '#E6EEF9', obrigatorio: obrigatorio || false },
    })
    res.status(201).json(trilha)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar trilha' })
  }
})

// PUT /api/trilhas/:id
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { titulo, descricao, icon, color, obrigatorio } = req.body
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    const updateData: any = {}
    
    if (titulo) updateData.titulo = titulo
    if (descricao) updateData.descricao = descricao
    if (icon) updateData.icon = icon
    if (color) updateData.color = color
    if (typeof obrigatorio === 'boolean') updateData.obrigatorio = obrigatorio
    
    const trilha = await prisma.trilha.update({
      where: { id },
      data: updateData,
    })
    res.json(trilha)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar trilha' })
  }
})

// DELETE /api/trilhas/:id
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    await prisma.trilha.delete({ where: { id } })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir trilha' })
  }
})

// GET /api/trilhas/:id/modulos
router.get('/:id/modulos', authenticate, async (req, res) => {
  try {
    const trilhaId = getStringParam(req.params.id)
    if (!trilhaId) return res.status(400).json({ error: 'ID inválido' })
    const modulos = await prisma.modulo.findMany({
      where: { trilhaId },
      include: {
        aulas: { orderBy: { ordem: 'asc' } },
        _count: { select: { aulas: true } },
      },
      orderBy: { ordem: 'asc' },
    })
    res.json(modulos)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar módulos' })
  }
})

export default router
