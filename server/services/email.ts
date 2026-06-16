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
    console.error('❌ Error sending email:', error instanceof Error ? error.message : error)
    return false
  }
}

/**
 * Send certificate notification email
 */
export async function sendCertificateEmail(to: string, userName: string, trilhaName: string) {
  return sendEmail({
    to,
    subject: `🎓 Certificado Emitido - ${trilhaName}`,
    html: `
      <h2>Parabéns ${userName}! 🎉</h2>
      <p>Você completou a trilha <strong>${trilhaName}</strong>.</p>
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
      <p>Você já pode começar suas trilhas de aprendizagem.</p>
      <p><a href="${loginUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Acessar Academia</a></p>
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
