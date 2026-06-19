import nodemailer from 'nodemailer'

/**
 * SMTP Email Service
 * Configures email sending using environment variables
 */

interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
}

let transporter: nodemailer.Transporter | null = null

function initializeTransporter() {
  if (transporter) return transporter

  // Validate required SMTP configuration
  const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']
  const missing = requiredEnvVars.filter(v => !process.env[v])

  if (missing.length > 0) {
    console.warn(`⚠️  SMTP configuration incomplete. Missing: ${missing.join(', ')}`)
    console.warn('Email sending will be disabled.')
    return null
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  console.log('✅ SMTP transporter configured successfully')
  return transporter
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const MAX_RETRIES = 3

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const transport = initializeTransporter()
      if (!transport) {
        console.warn('⚠️  SMTP not configured, email not sent')
        return false
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@academia-paygas.com',
        to: options.to,
        subject: options.subject,
        html: options.html || '',
        text: options.text || '',
      }

      const result = await transport.sendMail(mailOptions)
      console.log(`✅ Email sent: ${result.messageId}`)
      return true
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (attempt < MAX_RETRIES) {
        console.warn(`⚠️  Email attempt ${attempt}/${MAX_RETRIES} failed: ${msg}. Retrying...`)
        await new Promise(r => setTimeout(r, 1000 * attempt))
      } else {
        console.error(`❌ Error sending email after ${MAX_RETRIES} attempts: ${msg}`)
      }
    }
  }
  return false
}

/**
 * Send certificate notification email
 */
export async function sendCertificateEmail(to: string, userName: string, moduloName: string) {
  return sendEmail({
    to,
    subject: `🎓 Certificado Emitido - ${moduloName}`,
    html: `
      <h2>Parabéns ${userName}! 🎉</h2>
      <p>Você completou o módulo <strong>${moduloName}</strong>.</p>
      <p>Seu certificado foi emitido com sucesso!</p>
      <p><a href="${process.env.APP_URL || 'https://academia.paygas.com.br'}/certificados" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Certificado</a></p>
    `,
  })
}

/**
 * Send user registration confirmation
 */
export async function sendWelcomeEmail(to: string, userName: string, loginUrl: string) {
  return sendEmail({
    to,
    subject: 'Bem-vindo à Academia PayGas',
    html: `
      <h2>Bem-vindo ${userName}! 👋</h2>
      <p>Sua conta foi criada com sucesso na Academia PayGas.</p>
      <p>Você já pode começar seus módulos de aprendizagem.</p>
      <p><a href="${loginUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Acessar Academia</a></p>
    `,
  })
}

/**
 * Send notification alert email — simple alert with link to Academy
 */
export async function sendNotificationAlertEmail(
  to: string,
  userName: string,
  titulo: string
) {
  const appUrl = process.env.APP_URL || 'https://academia.paygas.com.br'
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return sendEmail({
    to,
    subject: `🔔 Nova notificação - Academia PayGas`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;margin:0;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <div style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:22px;">Academia PayGas</h1>
            <p style="margin:5px 0 0;font-size:14px;">Nova Notificação</p>
          </div>
          <div style="padding:30px;text-align:center;">
            <h2 style="margin:0 0 8px;color:#333;">Olá, ${userName}!</h2>
            <p style="color:#555;font-size:15px;margin:0 0 20px;">Você recebeu uma nova notificação na <strong>Academia PayGas</strong>.</p>
            <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:0 0 24px;">
              <p style="margin:0;color:#333;font-weight:bold;font-size:14px;">${titulo}</p>
              <p style="margin:6px 0 0;color:#888;font-size:12px;">${dateStr} às ${timeStr}</p>
            </div>
            <a href="${appUrl}" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:14px 36px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;display:inline-block;">Ir para a Academia</a>
          </div>
          <div style="background:#f8f9fa;padding:16px;text-align:center;color:#999;font-size:11px;">
            <p style="margin:0;">Este é um email automático. Por favor, não responda.</p>
            <p style="margin:4px 0 0;">© 2026 Academia PayGas</p>
          </div>
        </div>
      </body>
      </html>
    `,
  })
}

/**
 * Send notification email
 */
export async function sendNotificationEmail(
  to: string,
  titulo: string,
  mensagem: string
) {
  return sendEmail({
    to,
    subject: titulo,
    html: `
      <h2>${titulo}</h2>
      <p>${mensagem}</p>
    `,
  })
}

/**
 * Send email verification link
 */
export async function sendVerificationEmail(to: string, userName: string, token: string) {
  const verifyUrl = `${process.env.APP_URL || 'https://academia.paygas.com.br'}/verificar-email?token=${token}`

  return sendEmail({
    to,
    subject: 'Verifique seu email - Academia PayGas',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;">
            <h1 style="margin:0;">Academia PayGas</h1>
            <p style="margin:5px 0 0;">Verificacao de Email</p>
          </div>
          <div style="padding:30px;">
            <h2>Ola, ${userName}!</h2>
            <p>Voce foi cadastrado na <strong>Academia PayGas</strong>. Para ativar sua conta, clique no botao abaixo:</p>
            <div style="text-align:center;margin:30px 0;">
              <a href="${verifyUrl}" style="background:#667eea;color:white;padding:14px 30px;text-decoration:none;border-radius:5px;font-weight:bold;display:inline-block;">Confirmar Meu Email</a>
            </div>
            <p style="color:#666;font-size:13px;">Se o botao nao funcionar, copie e cole o link abaixo no seu navegador:</p>
            <p style="word-break:break-all;color:#667eea;font-size:12px;">${verifyUrl}</p>
            <p style="color:#666;font-size:13px;">Se voce nao solicitou este cadastro, ignore este email.</p>
          </div>
          <div style="background:#f8f9fa;padding:20px;text-align:center;color:#666;font-size:12px;">
            <p>Este e um email automatico. Por favor, nao responda.</p>
            <p>2026 Academia PayGas - Sistema de Ensino Online</p>
          </div>
        </div>
      </body>
      </html>
    `,
  })
}
