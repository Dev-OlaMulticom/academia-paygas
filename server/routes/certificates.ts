import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { getStringParam } from '../utils/queryParams'

const router = Router()

// GET /api/certificates
router.get('/', authenticate, async (req: any, res) => {
  try {
    const where = req.userRole === 'ADMIN'
      ? {}
      : { userId: req.userId }

    const certs = await prisma.certificate.findMany({
      where,
      include: {
        modulo: { select: { titulo: true, descricao: true } },
        user: { select: { nome: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(certs)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar certificados' })
  }
})

// POST /api/certificates
router.post('/', authenticate, async (req: any, res) => {
  try {
    const { moduloId } = req.body
    const existing = await prisma.certificate.findFirst({
      where: { userId: req.userId, moduloId },
    })
    if (existing) return res.status(409).json({ error: 'Certificado já existe' })

    const cert = await prisma.certificate.create({
      data: { userId: req.userId, moduloId, status: 'PENDING' },
      include: { modulo: { select: { titulo: true } } },
    })
    res.status(201).json(cert)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar certificado' })
  }
})

// PUT /api/certificates/:id/approve
router.put('/:id/approve', authenticate, authorize('ADMIN'), async (req: any, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    const cert = await prisma.certificate.update({
      where: { id },
      data: { status: 'APPROVED', aprovadoPor: req.userId, aprovadoEm: new Date() },
    })
    res.json(cert)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao aprovar certificado' })
  }
})

// PUT /api/certificates/:id/issue
router.put('/:id/issue', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const id = getStringParam(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    const cert = await prisma.certificate.update({
      where: { id },
      data: { status: 'ISSUED' },
    })
    res.json(cert)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao emitir certificado' })
  }
})

export default router
