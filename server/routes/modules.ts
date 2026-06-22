import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { logActivity } from '../services/log'

const router = Router()

// Default module configs (inserted if not exists)
const DEFAULT_MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'trilhas', label: 'Trilhas de Aprendizado' },
  { key: 'certificados', label: 'Certificados' },
  { key: 'cms', label: 'Gestao de Conteudo' },
  { key: 'equipe', label: 'Equipes' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'relatorios', label: 'Relatorios' },
  { key: 'notificacoes', label: 'Notificacoes' },
  { key: 'perfil', label: 'Meu Perfil' },
  { key: 'forum', label: 'Forum' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'ranking', label: 'Ranking Nacional' },
  { key: 'mapa', label: 'Mapa Nacional' },
  { key: 'nacional', label: 'Painel Nacional' },
  { key: 'conquistas', label: 'Conquistas' },
]

// GET /api/admin/modules - Get all module configs (any authenticated user)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    // Ensure all default modules exist (batch upsert instead of sequential)
    await prisma.$transaction(
      DEFAULT_MODULES.map(mod =>
        prisma.moduleConfig.upsert({
          where: { key: mod.key },
          update: {},
          create: mod,
        })
      )
    )

    const modules = await prisma.moduleConfig.findMany({
      orderBy: { key: 'asc' },
    })

    res.json(modules)
  } catch (error) {
    console.error('[MODULES ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar configuracao de modulos' })
  }
})

// PUT /api/admin/modules/:key - Toggle module on/off (admin only)
router.put('/:key', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const key = String(req.params.key)
    const { enabled } = req.body

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Campo "enabled" deve ser boolean' })
    }

    // Prevent disabling critical modules
    const criticalModules = ['dashboard', 'trilhas', 'notificacoes', 'perfil']
    if (!enabled && criticalModules.includes(key)) {
      return res.status(400).json({ error: `O modulo "${key}" nao pode ser desativado` })
    }

    const module = await prisma.moduleConfig.upsert({
      where: { key },
      update: { enabled },
      create: { key, label: String(key), enabled },
    })

    await logActivity(req.userId!, 'Modulo Toggle', `${key}: ${enabled ? 'ativado' : 'desativado'}`)
    res.json(module)
  } catch (error) {
    console.error('[MODULE TOGGLE ERROR]', error)
    res.status(500).json({ error: 'Erro ao atualizar modulo' })
  }
})

// GET /api/admin/modules/enabled - Get only enabled module keys (public-ish, for sidebar)
router.get('/enabled', authenticate, async (req: AuthRequest, res) => {
  try {
    const modules = await prisma.moduleConfig.findMany({
      where: { enabled: true },
      select: { key: true },
    })

    res.json(modules.map(m => m.key))
  } catch (error) {
    console.error('[MODULES ENABLED ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar modulos ativos' })
  }
})

export default router
