import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { prismaMysql } from '../lib/prisma-mysql'
import { authenticate, authorize } from '../middleware/auth'
import { getStringParam } from '../utils/queryParams'
import { logActivity } from '../services/log'

const router = Router()

// GET /api/certificates
router.get('/', authenticate, async (req: any, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const skip = (page - 1) * limit

    const where = req.userRole === 'ADMIN'
      ? {}
      : { userId: req.userId }

    const [certs, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        include: {
          modulo: { select: { titulo: true, descricao: true, icone: true, certificadoTemplate: true } },
          user: { select: { nome: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.certificate.count({ where }),
    ])

    res.json({
      data: certs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar certificados' })
  }
})

// POST /api/certificates
router.post('/', authenticate, async (req: any, res) => {
  try {
    const { moduloId } = req.body
    if (!moduloId) return res.status(400).json({ error: 'moduloId é obrigatório' })

    const modulo = await prisma.modulo.findUnique({
      where: { id: moduloId },
      include: { aulas: true },
    })
    if (!modulo) return res.status(404).json({ error: 'Módulo não encontrado' })

    const completedCount = await prisma.progresso.count({
      where: { moduloId, userId: req.userId, concluido: true },
    })
    if (completedCount < modulo.aulas.length) {
      return res.status(400).json({ error: 'Complete todas as aulas antes de solicitar o certificado' })
    }

    // Atomic upsert to prevent race condition duplicates
    const certStatus = modulo.autoCertificado ? 'APPROVED' : 'PENDING'
    const cert = await prisma.certificate.upsert({
      where: {
        userId_moduloId: { userId: req.userId, moduloId },
      },
      update: {},
      create: { userId: req.userId, moduloId, status: certStatus },
      include: { modulo: { select: { titulo: true } } },
    })

    // Dual-write certificate to MySQL
    if (prismaMysql) {
      try {
        await prismaMysql.certificate.upsert({
          where: {
            userId_moduloId: { userId: req.userId, moduloId },
          },
          update: {},
          create: { userId: req.userId, moduloId, status: certStatus as any },
        })
      } catch (error: any) {
        console.warn('[DUAL-WRITE] MySQL certificate upsert failed:', error?.message)
      }
    }

    await logActivity(req.userId, 'Certificado Solicitado', `Modulo: ${cert.modulo.titulo}`)
    res.status(201).json(cert)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao criar certificado' })
  }
})

// PUT /api/certificates/:id/approve
router.put('/:id/approve', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    const existing = await prisma.certificate.findUnique({ where: { id }, select: { status: true } })
    if (!existing) return res.status(404).json({ error: 'Certificado não encontrado' })
    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: `Não é possível aprovar um certificado com status "${existing.status}". Apenas certificados PENDING podem ser aprovados.` })
    }

    const cert = await prisma.certificate.update({
      where: { id },
      data: { status: 'APPROVED', aprovadoPor: req.userId, aprovadoEm: new Date() },
      include: { user: { select: { nome: true } }, modulo: { select: { titulo: true } } },
    })

    // Dual-write certificate approval to MySQL
    if (prismaMysql) {
      try {
        await prismaMysql.certificate.update({
          where: { id },
          data: { status: 'APPROVED', aprovadoPor: req.userId, aprovadoEm: new Date() },
        })
      } catch (error: any) {
        console.warn('[DUAL-WRITE] MySQL certificate approve failed:', error?.message)
      }
    }

    await logActivity(req.userId!, 'Certificado Aprovado', `Modulo: ${cert.modulo.titulo} — User: ${cert.user.nome}`)
    res.json(cert)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao aprovar certificado' })
  }
})

// PUT /api/certificates/:id/issue
router.put('/:id/issue', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    const existing = await prisma.certificate.findUnique({ where: { id }, select: { status: true } })
    if (!existing) return res.status(404).json({ error: 'Certificado não encontrado' })
    if (existing.status !== 'APPROVED') {
      return res.status(400).json({ error: `Não é possível emitir um certificado com status "${existing.status}". Apenas certificados APPROVED podem ser emitidos.` })
    }

    const cert = await prisma.certificate.update({
      where: { id },
      data: { status: 'ISSUED' },
      include: { user: { select: { nome: true } }, modulo: { select: { titulo: true } } },
    })

    // Dual-write certificate issuance to MySQL
    if (prismaMysql) {
      try {
        await prismaMysql.certificate.update({
          where: { id },
          data: { status: 'ISSUED' },
        })
      } catch (error: any) {
        console.warn('[DUAL-WRITE] MySQL certificate issue failed:', error?.message)
      }
    }

    await logActivity(req.userId!, 'Certificado Emitido', `Modulo: ${cert.modulo.titulo} — User: ${cert.user.nome}`)
    res.json(cert)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao emitir certificado' })
  }
})

export default router
