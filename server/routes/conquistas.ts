import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { getStringParam } from '../utils/queryParams'

const router = Router()

// GET /api/conquistas — list all conquistas (all roles)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const userRole = req.userRole!

    const conquistas = await prisma.conquista.findMany({
      orderBy: { ordem: 'asc' },
    })

    if (userRole === 'ATENDENTE') {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } })
      const userXp = user?.xp || 0
      const userConquistas = await prisma.userConquista.findMany({ where: { userId } })
      const earnedIds = new Set(userConquistas.map(uc => uc.conquistaId))

      const filtered = conquistas
        .filter(c => c.ativo)
        .map(c => ({
          ...c,
          earned: earnedIds.has(c.id),
          dataConquista: userConquistas.find(uc => uc.conquistaId === c.id)?.dataConquista || null,
          progresso: userXp >= c.pontosMinimos ? 100 : Math.round((userXp / Math.max(c.pontosMinimos, 1)) * 100),
          disponivel: userXp >= c.pontosMinimos,
        }))

      return res.json(filtered)
    }

    const result = conquistas.map(c => ({
      ...c,
      earned: false,
      dataConquista: null,
      progresso: 0,
      disponivel: true,
    }))

    res.json(result)
  } catch (error) {
    console.error('[CONQUISTAS LIST ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar conquistas' })
  }
})

// POST /api/conquistas — create conquista (ADMIN, GESTOR)
router.post('/', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const { titulo, descricao, icone, cor, pontosMinimos, xpRecompensa, ativo, ordem } = req.body
    if (!titulo || !descricao) {
      return res.status(400).json({ error: 'Titulo e descricao sao obrigatorios' })
    }
    const conquista = await prisma.conquista.create({
      data: {
        titulo,
        descricao,
        icone: icone || '🏆',
        cor: cor || '#F47C20',
        pontosMinimos: pontosMinimos || 0,
        xpRecompensa: xpRecompensa || 0,
        ativo: ativo !== false,
        ordem: ordem || 0,
      },
    })
    res.status(201).json(conquista)
  } catch (error) {
    console.error('[CONQUISTA CREATE ERROR]', error)
    res.status(500).json({ error: 'Erro ao criar conquista' })
  }
})

// PUT /api/conquistas/:id — update conquista (ADMIN, GESTOR)
router.put('/:id', authenticate, authorize('ADMIN', 'GESTOR'), async (req: AuthRequest, res) => {
  try {
    const { titulo, descricao, icone, cor, pontosMinimos, xpRecompensa, ativo, ordem } = req.body
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    const conquista = await prisma.conquista.update({
      where: { id },
      data: {
        ...(titulo !== undefined && { titulo }),
        ...(descricao !== undefined && { descricao }),
        ...(icone !== undefined && { icone }),
        ...(cor !== undefined && { cor }),
        ...(pontosMinimos !== undefined && { pontosMinimos }),
        ...(xpRecompensa !== undefined && { xpRecompensa }),
        ...(ativo !== undefined && { ativo }),
        ...(ordem !== undefined && { ordem }),
      },
    })
    res.json(conquista)
  } catch (error) {
    console.error('[CONQUISTA UPDATE ERROR]', error)
    res.status(500).json({ error: 'Erro ao atualizar conquista' })
  }
})

// DELETE /api/conquistas/:id — delete conquista (ADMIN only)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    await prisma.userConquista.deleteMany({ where: { conquistaId: id } })
    await prisma.conquista.delete({ where: { id } })
    res.json({ success: true })
  } catch (error) {
    console.error('[CONQUISTA DELETE ERROR]', error)
    res.status(500).json({ error: 'Erro ao excluir conquista' })
  }
})

// GET /api/conquistas/my — user's earned conquistas
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!
    const userConquistas = await prisma.userConquista.findMany({
      where: { userId },
      include: { conquista: true },
    })
    res.json(userConquistas.map(uc => ({
      ...uc.conquista,
      dataConquista: uc.dataConquista,
    })))
  } catch (error) {
    console.error('[MY CONQUISTAS ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar conquistas do usuario' })
  }
})

export default router
