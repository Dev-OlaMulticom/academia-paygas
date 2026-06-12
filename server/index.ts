import express from 'express'
import cors from 'cors'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { encryptedPayload } from './middleware/encryption'
import authRoutes from './routes/auth'
import usuariosRoutes from './routes/usuarios'
import trilhasRoutes from './routes/trilhas'
import cmsRoutes from './routes/cms'
import certificatesRoutes from './routes/certificates'
import notificationsRoutes from './routes/notifications'
import progressoRoutes from './routes/progresso'
import dashboardRoutes from './routes/dashboard'
import docsRoutes from './routes/docs'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

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
app.use('/api/trilhas', trilhasRoutes)
app.use('/api/cms', cmsRoutes)
app.use('/api/modulos', cmsRoutes)
app.use('/api/certificates', certificatesRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/progresso', progressoRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/docs', docsRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', encrypted: true, timestamp: new Date().toISOString() })
})

// HTTPS
const certPath = path.resolve(__dirname, 'certs')
const keyFile = path.join(certPath, 'key.pem')
const certFile = path.join(certPath, 'cert.pem')

if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
  const httpsOptions = {
    key: fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile),
  }

  https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`🔒 HTTPS Server running on https://localhost:${PORT}`)
  })
} else {
  // Fallback to HTTP if no certs
  app.listen(PORT, () => {
    console.log(`🚀 HTTP Server running on http://localhost:${PORT} (no SSL certs found)`)
  })
}

export default app
