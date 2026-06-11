import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth'
import usuariosRoutes from './routes/usuarios'
import trilhasRoutes from './routes/trilhas'
import cmsRoutes from './routes/cms'
import certificatesRoutes from './routes/certificates'
import notificationsRoutes from './routes/notifications'
import progressoRoutes from './routes/progresso'
import dashboardRoutes from './routes/dashboard'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/trilhas', trilhasRoutes)
app.use('/api/cms', cmsRoutes)
app.use('/api/modulos', cmsRoutes)
app.use('/api/certificates', certificatesRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/progresso', progressoRoutes)
app.use('/api/dashboard', dashboardRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})

export default app
