import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { JWT_SECRET, authenticate, AuthRequest } from '../middleware/auth'
import { getServerEncryptionKey } from '../middleware/encryption'
import { awardPoints } from '../services/gamification'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' })
    const validPassword = await bcrypt.compare(password, user.senha)
    if (!validPassword) return res.status(401).json({ error: 'Credenciais inválidas' })
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } })
    await awardPoints(user.id, 'LOGIN', 'Acesso a plataforma').catch(() => {})
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' })
    res.json({ token, user: { id: user.id, email: user.email, nome: user.nome, role: user.role, xp: user.xp, gestorId: user.gestorId } })
  } catch (error) {
    console.error('[AUTH LOGIN ERROR]', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, nome: true, role: true, xp: true, gestorId: true, createdAt: true, lastLogin: true },
    })
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json(user)
  } catch {
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query
    if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Token de verificacao invalido' })
    const user = await prisma.user.findFirst({ where: { tokenVerificacao: token } })
    if (!user) return res.status(404).json({ error: 'Token invalido ou expirado' })
    if (user.tokenExpiry && new Date() > user.tokenExpiry) return res.status(400).json({ error: 'Token expirado. Solicite um novo.' })
    if (user.emailVerificado) return res.json({ message: 'Email ja verificado', alreadyVerified: true })
    await prisma.user.update({ where: { id: user.id }, data: { emailVerificado: true, tokenVerificacao: null, tokenExpiry: null } })
    res.json({ message: 'Email verificado com sucesso!' })
  } catch {
    res.status(500).json({ error: 'Erro ao verificar email' })
  }
})

router.get('/config', (req, res) => {
  res.json({ encryptionKey: getServerEncryptionKey() })
})

export default router
