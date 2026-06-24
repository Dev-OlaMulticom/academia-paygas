import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { prismaMysql } from '../lib/prisma-mysql'
import { JWT_SECRET, authenticate, AuthRequest } from '../middleware/auth'
import { sendPasswordResetEmail, isEmailConfigured } from '../services/email'
import { awardLoginPointsDaily } from '../services/gamification'
import { logActivity } from '../services/log'

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
      console.warn(`[AUTH LOGIN] Usuario nao encontrado: ${email}`)
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const validPassword = await bcrypt.compare(password, user.senha)
    if (!validPassword) {
      console.warn(`[AUTH LOGIN] Senha incorreta para: ${email} (hash prefix: ${user.senha.substring(0, 7)})`)
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Dual-write login timestamp to MySQL
    if (prismaMysql) {
      try {
        await prismaMysql.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        })
      } catch (error: any) {
        console.warn('[DUAL-WRITE] MySQL login update failed:', error?.message)
      }
    }

    // Award login points (max once per day)
    await awardLoginPointsDaily(user.id)

    await logActivity(user.id, 'Login', `Acesso de ${user.email}`)

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' })

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
        xp: user.xp,
        gestorId: user.gestorId,
      },
    })
  } catch (error) {
    console.error('[AUTH LOGIN ERROR]', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, nome: true, role: true, xp: true, gestorId: true, createdAt: true, lastLogin: true },
    })
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json(user)
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/auth/verify-email?token=xxx
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token de verificacao invalido' })
    }

    const user = await prisma.user.findFirst({
      where: { tokenVerificacao: token },
    })

    if (!user) {
      return res.status(404).json({ error: 'Token invalido ou expirado' })
    }

    // Check if token has expired
    if (user.tokenExpiry && new Date() > user.tokenExpiry) {
      return res.status(400).json({ error: 'Token expirado. Solicite um novo.' })
    }

    if (user.emailVerificado) {
      return res.json({ message: 'Email ja verificado', alreadyVerified: true })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificado: true,
        tokenVerificacao: null,
        tokenExpiry: null,
      },
    })

    // Dual-write email verification to MySQL
    if (prismaMysql) {
      try {
        await prismaMysql.user.update({
          where: { id: user.id },
          data: {
            emailVerificado: true,
            tokenVerificacao: null,
            tokenExpiry: null,
          },
        })
      } catch (error: any) {
        console.warn('[DUAL-WRITE] MySQL email verify failed:', error?.message)
      }
    }

    res.json({ message: 'Email verificado com sucesso!' })
  } catch (error) {
    console.error('[ROUTE ERROR]', error)
    res.status(500).json({ error: 'Erro ao verificar email' })
  }
})

// GET /api/auth/email-status — check if SMTP is configured
router.get('/email-status', (_req, res) => {
  res.json(isEmailConfigured())
})

// POST /api/auth/forgot-password — send reset code to email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // Silently succeed to prevent email enumeration
      return res.json({ message: 'Se o email estiver cadastrado, você receberá um código de redefinição.' })
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiry = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenRecuperacao: code, tokenRecuperacaoExpiry: expiry },
    })

    // Dual-write recovery token to MySQL
    if (prismaMysql) {
      try {
        await prismaMysql.user.update({
          where: { id: user.id },
          data: { tokenRecuperacao: code, tokenRecuperacaoExpiry: expiry },
        })
      } catch (error: any) {
        console.warn('[DUAL-WRITE] MySQL forgot-password token failed:', error?.message)
      }
    }

    await sendPasswordResetEmail(user.email, user.nome || user.email, code).catch((err) => {
      console.error('[AUTH] Erro ao enviar email de redefinicao:', err)
    })

    await logActivity(user.id, 'Solicitacao Reset Senha', `Email: ${user.email}`)

    res.json({ message: 'Se o email estiver cadastrado, você receberá um código de redefinição.' })
  } catch (error) {
    console.error('[AUTH FORGOT PASSWORD ERROR]', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /api/auth/reset-password — verify code and set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body

    if (!email || !code || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'As senhas não coincidem' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.tokenRecuperacao !== code) {
      return res.status(400).json({ error: 'Código inválido ou email incorreto' })
    }

    if (user.tokenRecuperacaoExpiry && new Date() > user.tokenRecuperacaoExpiry) {
      // Clear expired token
      await prisma.user.update({
        where: { id: user.id },
        data: { tokenRecuperacao: null, tokenRecuperacaoExpiry: null },
      })
      // Dual-write expired token clear to MySQL
      if (prismaMysql) {
        try {
          await prismaMysql.user.update({
            where: { id: user.id },
            data: { tokenRecuperacao: null, tokenRecuperacaoExpiry: null },
          })
        } catch (error: any) {
          console.warn('[DUAL-WRITE] MySQL token clear failed:', error?.message)
        }
      }
      return res.status(400).json({ error: 'Código expirado. Solicite um novo.' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { senha: hashedPassword, tokenRecuperacao: null, tokenRecuperacaoExpiry: null },
    })

    // Dual-write password reset to MySQL
    if (prismaMysql) {
      try {
        await prismaMysql.user.update({
          where: { id: user.id },
          data: { senha: hashedPassword, tokenRecuperacao: null, tokenRecuperacaoExpiry: null },
        })
      } catch (error: any) {
        console.warn('[DUAL-WRITE] MySQL password reset failed:', error?.message)
      }
    }

    await logActivity(user.id, 'Senha Redefinida', 'Senha redefinida via recuperacao')

    res.json({ message: 'Senha redefinida com sucesso! Você já pode fazer login.' })
  } catch (error) {
    console.error('[AUTH RESET PASSWORD ERROR]', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
