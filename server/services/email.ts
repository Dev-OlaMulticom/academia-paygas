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
let backupTransporter: nodemailer.Transporter | null = null

function initializeTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter

  const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']
  const missing = requiredEnvVars.filter(v => !process.env[v])

  if (missing.length > 0) {
    console.warn(`⚠️  SMTP configuration incomplete. Missing: ${missing.join(', ')}`)
    return null
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  console.log(`✅ SMTP primary: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`)
  return transporter
}

function initializeBackupTransporter(): nodemailer.Transporter | null {
  if (backupTransporter) return backupTransporter
  if (!process.env.SMTP_BACKUP_HOST) return null

  backupTransporter = nodemailer.createTransport({
    host: process.env.SMTP_BACKUP_HOST,
    port: parseInt(process.env.SMTP_BACKUP_PORT || '465', 10),
    secure: process.env.SMTP_BACKUP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_BACKUP_USER,
      pass: process.env.SMTP_BACKUP_PASS,
    },
  })

  console.log(`✅ SMTP backup: ${process.env.SMTP_BACKUP_HOST}:${process.env.SMTP_BACKUP_PORT}`)
  return backupTransporter
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}


export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const from = process.env.SMTP_FROM || 'Academia PayGas <dev.olamulticom@gmail.com>'
  const replyTo = process.env.SMTP_REPLY_TO || 'email@academia.paygas.com.br'
  const bcc = process.env.SMTP_BCC || 'email@academia.paygas.com.br'
  const monitorEmail = process.env.SMTP_MONITOR_EMAIL || 'onboarding@resend.dev'
  const MAX_RETRIES = 2

  const mailOptions = {
    from,
    to: options.to,
    bcc,
    replyTo,
    subject: options.subject,
    html: options.html || '',
    text: options.text || '',
  }

  // Try primary SMTP
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const transport = initializeTransporter()
      if (!transport) break

      const result = await transport.sendMail(mailOptions)
      console.log(`✅ Email sent [PRIMARY] to=${options.to} id=${result.messageId}`)
      sendMonitorEmail(monitorEmail, String(options.to), options.subject, result.messageId).catch(() => {})
      return { success: true, messageId: result.messageId }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.warn(`⚠️  Email PRIMARY attempt ${attempt}/${MAX_RETRIES} failed: ${msg}`)
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000))
    }
  }

  // Fallback to backup SMTP
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const backup = initializeBackupTransporter()
      if (!backup) {
        console.error(`❌ No SMTP transport available. Primary failed, backup not configured.`)
        return { success: false, error: 'No SMTP transport available' }
      }

      const result = await backup.sendMail(mailOptions)
      console.log(`✅ Email sent [BACKUP] to=${options.to} id=${result.messageId}`)
      sendMonitorEmail(monitorEmail, String(options.to), options.subject, result.messageId).catch(() => {})
      return { success: true, messageId: result.messageId }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.warn(`⚠️  Email BACKUP attempt ${attempt}/${MAX_RETRIES} failed: ${msg}`)
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000))
    }
  }

  console.error(`❌ Email FAILED all attempts to=${options.to} subject="${options.subject}"`)
  return { success: false, error: 'All SMTP attempts failed' }
}

async function sendMonitorEmail(monitorTo: string, realTo: string, subject: string, messageId?: string) {
  const backup = initializeBackupTransporter()
  if (!backup) return

  const timestamp = new Date().toISOString()
  await backup.sendMail({
    from: 'Academia PayGas <onboarding@resend.dev>',
    to: monitorTo,
    subject: `[MONITOR] ${subject}`,
    html: `
      <div style="font-family:monospace;font-size:13px;background:#1a1a2e;color:#0f0;padding:20px;border-radius:8px;">
        <h3 style="color:#00ff88;margin:0 0 12px;">EMAIL MONITOR</h3>
        <p><strong>Para:</strong> ${realTo}</p>
        <p><strong>Asunto:</strong> ${subject}</p>
        <p><strong>ID:</strong> ${messageId || 'N/A'}</p>
        <p><strong>Fecha:</strong> ${timestamp}</p>
        <p><strong>Sistema:</strong> Academia PayGas</p>
      </div>
    `,
  })
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
 * Send custom email from admin
 */
export async function sendCustomEmail(to: string, subject: string, htmlBody: string) {
  return sendEmail({
    to,
    subject,
    html: htmlBody,
  })
}

/**
 * Check if SMTP is configured
 */
export function isEmailConfigured(): { configured: boolean; host?: string; port?: number } {
  const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']
  const missing = requiredEnvVars.filter(v => !process.env[v])
  if (missing.length > 0) {
    return { configured: false }
  }
  return {
    configured: true,
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
  }
}

/**
 * Send password reset code email
 */
export async function sendPasswordResetEmail(to: string, userName: string, code: string) {
  const appUrl = process.env.APP_URL || 'https://academia.paygas.com.br'

  return sendEmail({
    to,
    subject: '🔑 Redefinir senha - Academia PayGas',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;margin:0;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <div style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);color:white;padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:22px;">Academia PayGas</h1>
            <p style="margin:5px 0 0;font-size:14px;">Redefinição de Senha</p>
          </div>
          <div style="padding:30px;text-align:center;">
            <h2 style="margin:0 0 8px;color:#333;">Olá, ${userName}!</h2>
            <p style="color:#555;font-size:15px;margin:0 0 20px;">Você solicitou a redefinição da sua senha. Use o código abaixo:</p>
            <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin:0 0 24px;">
              <p style="margin:0;color:#333;font-size:32px;font-weight:bold;letter-spacing:8px;">${code}</p>
              <p style="margin:8px 0 0;color:#888;font-size:12px;">Este código expira em 15 minutos</p>
            </div>
            <p style="color:#666;font-size:13px;margin:0 0 16px;">Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.</p>
            <a href="${appUrl}/login" style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;padding:14px 36px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;display:inline-block;">Ir para o Login</a>
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
