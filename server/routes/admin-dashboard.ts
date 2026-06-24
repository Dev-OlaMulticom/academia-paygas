import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'
import { sendCustomEmail } from '../services/email'
import { logActivity } from '../services/log'

const router = Router()

// GET /api/admin/dashboard — consolidated admin dashboard data
router.get('/', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res) => {
  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      totalModulos,
      totalAulas,
      totalCertificates,
      quizzesAprovados,
      totalNotifications,
      usersThisMonth,
      progressThisMonth,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.modulo.count(),
      prisma.aula.count(),
      prisma.certificate.count(),
      prisma.quizResponse.count({ where: { concluido: true } }),
      prisma.notification.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.progresso.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ])

    const acessosRecentes = await prisma.activityLog.findMany({
      where: { acao: 'Login' },
      include: { user: { select: { id: true, nome: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const atividadesRecentes = await prisma.activityLog.findMany({
      include: { user: { select: { id: true, nome: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const modulos = await prisma.modulo.findMany({
      include: {
        aulas: {
          include: {
            progressos: { select: { id: true, concluido: true } },
          },
        },
      },
    })

    const cursosRecentes = modulos.map(m => {
      const totalAcessos = m.aulas.reduce((sum, a) => sum + a.progressos.length, 0)
      const totalConcluidos = m.aulas.reduce((sum, a) => sum + a.progressos.filter(p => p.concluido).length, 0)
      return {
        id: m.id,
        titulo: m.titulo,
        totalAulas: m.aulas.length,
        acessos: totalAcessos,
        concluidos: totalConcluidos,
        percentual: totalAcessos > 0 ? Math.round((totalConcluidos / totalAcessos) * 100) : 0,
      }
    }).sort((a, b) => b.acessos - a.acessos).slice(0, 10)

    const acoesEmail = await prisma.activityLog.groupBy({
      by: ['acao'],
      where: {
        acao: { contains: 'email', mode: 'insensitive' },
      },
      _count: { id: true },
    })

    res.json({
      resumoGeral: {
        totalUsers,
        totalModulos,
        totalAulas,
        totalCertificates,
        quizzesAprovados,
        totalNotifications,
        usersThisMonth,
        progressThisMonth,
      },
      acessosRecentes,
      atividadesRecentes,
      cursosRecentes,
      emailsStats: {
        total: acoesEmail.reduce((sum, a) => sum + a._count.id, 0),
        byAction: acoesEmail.map(a => ({ acao: a.acao, count: a._count.id })),
      },
    })
  } catch (error) {
    console.error('[ADMIN DASHBOARD ERROR]', error)
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard admin' })
  }
})

// POST /api/admin/dashboard/send-email — send custom email to user
router.post('/send-email', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { userId, assunto, mensagem } = req.body

    if (!userId || !assunto || !mensagem) {
      return res.status(400).json({ error: 'userId, assunto e mensagem são obrigatórios' })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nome: true },
    })

    if (!targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;margin:0;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <div style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:22px;">Academia PayGas</h1>
            <p style="margin:5px 0 0;font-size:14px;">Mensagem do Administrador</p>
          </div>
          <div style="padding:30px;">
            <h2 style="margin:0 0 8px;color:#333;">Olá, ${targetUser.nome || targetUser.email}!</h2>
            <div style="color:#555;font-size:15px;line-height:1.6;white-space:pre-wrap;">${mensagem}</div>
          </div>
          <div style="background:#f8f9fa;padding:16px;text-align:center;color:#999;font-size:11px;">
            <p style="margin:0;">Este é um email automático da Academia PayGas.</p>
            <p style="margin:4px 0 0;">© 2026 PayGas - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `

    const sent = await sendCustomEmail(targetUser.email, assunto, htmlBody)

    if (sent) {
      await logActivity(req.userId!, 'Email Enviado', `Para: ${targetUser.email} | Assunto: ${assunto}`)
      res.json({ success: true, message: `Email enviado para ${targetUser.email}` })
    } else {
      res.status(500).json({ success: false, error: 'Falha ao enviar email. Verifique a configuração SMTP.' })
    }
  } catch (error) {
    console.error('[ADMIN SEND EMAIL ERROR]', error)
    res.status(500).json({ error: 'Erro ao enviar email' })
  }
})

export default router
