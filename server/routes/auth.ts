import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { JWT_SECRET, authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const validPassword = await bcrypt.compare(password, user.senha)
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' })

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
      },
    })
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, nome: true, role: true, createdAt: true, lastLogin: true },
    })
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
