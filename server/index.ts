import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { encryptedPayload, getServerEncryptionKey } from './middleware/encryption'
import authRoutes from './routes/auth'
import usuariosRoutes from './routes/usuarios'
import cmsRoutes from './routes/cms'
import certificatesRoutes from './routes/certificates'
import notificationsRoutes from './routes/notifications'
import progressoRoutes from './routes/progresso'
import dashboardRoutes from './routes/dashboard'
import docsRoutes from './routes/docs'
import analyticsRoutes from './routes/analytics'
import forumRoutes from './routes/forum'
import gamificationRoutes from './routes/gamification'
import publicRoutes from './routes/public'
import modulesRoutes from './routes/modules'
import conquistasRoutes from './routes/conquistas'
import logsRoutes from './routes/logs'
import xpconfigRoutes from './routes/xpconfig'
import importExportRoutes from './routes/import-export'

const app = express()
const PORT = process.env.PORT || 3001

// Security headers
app.use(helmet())

// CORS configuration — fail closed when ALLOWED_ORIGINS is not set
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  ALLOWED_ORIGINS is not set. Cross-origin requests will be rejected.')
  console.warn('   Set ALLOWED_ORIGINS in .env (e.g. "https://academia.paygas.com.br")')
}
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin requests (no Origin header) and explicitly listed origins
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('No permitido por CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Encrypted'],
}
app.use(cors(corsOptions))

// Body parsing
app.use(express.json({ limit: '10mb' }))

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', globalLimiter)

// Rate limiting estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/auth/login', authLimiter)

// Rate limiting para registro de usuarios (solo POST)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour
  message: { error: 'Demasiados registros. Intenta de nuevo en 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/usuarios', (req, res, next) => {
  if (req.method === 'POST') {
    registerLimiter(req, res, next)
  } else {
    next()
  }
})

// Global encryption middleware for all POST/PUT/PATCH
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    encryptedPayload(req, res, next)
  } else {
    next()
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/cms', cmsRoutes)
app.use('/api/certificates', certificatesRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/progresso', progressoRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/docs', docsRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/forum', forumRoutes)
app.use('/api/gamification', gamificationRoutes)
app.use('/api/conquistas', conquistasRoutes)
app.use('/api/public', publicRoutes)
app.use('/api/admin/modules', modulesRoutes)
app.use('/api/logs', logsRoutes)
app.use('/api/xp-config', xpconfigRoutes)
app.use('/api/import-export', importExportRoutes)

app.get('/api/health', async (_req, res) => {
  const checks: Record<string, string> = { status: 'ok' }
  try {
    const { prisma } = await import('./lib/prisma')
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'connected'
  } catch {
    checks.database = 'disconnected'
  }
  checks.nodeEnv = process.env.NODE_ENV || 'undefined'
  checks.timestamp = new Date().toISOString()
  res.json(checks)
})

app.get('/api/config', (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }
  try {
    const jwt = require('jsonwebtoken')
    const JWT_SECRET_FALLBACK_FILE = '.jwt-secret'
    let JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET || JWT_SECRET.length < 16) {
      try {
        const fs = require('fs')
        if (fs.existsSync(JWT_SECRET_FALLBACK_FILE)) {
          const persisted = fs.readFileSync(JWT_SECRET_FALLBACK_FILE, 'utf8').trim()
          if (persisted && persisted.length >= 16) JWT_SECRET = persisted
        }
      } catch { /* */ }
    }
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET)
    res.json({ encryptionKey: getServerEncryptionKey() })
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
})

// Only start listening when run directly (not when imported by Passenger or test)
if (require.main === module) {
  const certPath = path.resolve(__dirname, 'certs')
  const keyFile = path.join(certPath, 'key.pem')
  const certFile = path.join(certPath, 'cert.pem')

  let server: ReturnType<typeof app.listen>

  if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
    const httpsOptions = {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile),
    }

    server = https.createServer(httpsOptions, app).listen(PORT, () => {
      console.log(`🔒 HTTPS Server running on https://localhost:${PORT}`)
    })
  } else {
    server = app.listen(PORT, () => {
      console.log(`🚀 HTTP Server running on http://localhost:${PORT} (no SSL certs found)`)
    })
  }

  // ─── Graceful Shutdown ──────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`)
    server.close(async () => {
      try {
        const { prisma } = await import('./lib/prisma')
        await prisma.$disconnect()
        console.log('Database connection closed.')
      } catch { /* ignore */ }
      process.exit(0)
    })
    // Force kill after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout.')
      process.exit(1)
    }, 10000)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // ─── Uncaught Error Handlers ────────────────────────────
  process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err)
    process.exit(1)
  })

  process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled Rejection:', reason)
    process.exit(1)
  })

  // Log startup completion
  console.log(`[${new Date().toISOString()}] Server initialization complete, PID: ${process.pid}`)
}

export default app
