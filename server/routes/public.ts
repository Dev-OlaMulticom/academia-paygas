import { Router } from 'express'
import { prisma } from '../lib/prisma'

const router = Router()

// GET /api/public/stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalModulos, totalAulas, totalCertificates] = await Promise.all([
      prisma.user.count(),
      prisma.modulo.count(),
      prisma.aula.count(),
      prisma.certificate.count(),
    ])

    res.json({
      alunos: totalUsers,
      horas: totalAulas * 2,
      notas: totalModulos,
      certificados: totalCertificates,
    })
  } catch (error) {
    console.error('[PUBLIC STATS ERROR]', error)
    res.status(500).json({
      alunos: 0,
      horas: 0,
      notas: 0,
      certificados: 0,
    })
  }
})

// GET /api/public/config
router.get('/config', async (req, res) => {
  try {
    res.json({
      xpPerLevel: 2000,
      version: 'V27',
      platform: 'Academia PayGas',
    })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar config' })
  }
})

export default router
