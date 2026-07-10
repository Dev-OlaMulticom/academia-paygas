import nodemailer from "nodemailer";
import logger from "../lib/logger";

interface EmailAttachment {
	filename?: string;
	content?: unknown;
	path?: string;
	contentType?: string;
	cid?: string;
}

interface EmailOptions {
	to: string | string[];
	subject: string;
	html?: string;
	text?: string;
	attachments?: EmailAttachment[];
}

let transporter: nodemailer.Transporter | null = null;
let backupTransporter: nodemailer.Transporter | null = null;

const REQUIRED_ENV_VARS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function getPort(name: string, fallback: number): number {
	return parseInt(process.env[name] || String(fallback), 10);
}

function missingEnvVars(): string[] {
	return REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
}

function initializeTransporter(): nodemailer.Transporter | null {
	if (transporter) return transporter;

	if (missingEnvVars().length > 0) {
		logger.warn(`⚠️  SMTP configuration incomplete. Missing: ${missingEnvVars().join(", ")}`);
		return null;
	}

	transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: getPort("SMTP_PORT", 587),
		secure: process.env.SMTP_SECURE === "true",
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS,
		},
	});

	logger.info(`✅ SMTP primary: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
	return transporter;
}

function initializeBackupTransporter(): nodemailer.Transporter | null {
	if (backupTransporter) return backupTransporter;
	if (!process.env.SMTP_BACKUP_HOST) return null;

	backupTransporter = nodemailer.createTransport({
		host: process.env.SMTP_BACKUP_HOST,
		port: getPort("SMTP_BACKUP_PORT", 465),
		secure: process.env.SMTP_BACKUP_SECURE === "true",
		auth: {
			user: process.env.SMTP_BACKUP_USER,
			pass: process.env.SMTP_BACKUP_PASS,
		},
	});

	logger.info(`✅ SMTP backup: ${process.env.SMTP_BACKUP_HOST}:${process.env.SMTP_BACKUP_PORT}`);
	return backupTransporter;
}

export interface EmailResult {
	success: boolean;
	messageId?: string;
	error?: string;
}

function normalizeError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

async function sendWithRetry(
	getTransport: () => nodemailer.Transporter | null,
	label: string,
	mailOptions: Record<string, unknown>,
	monitorEmail: string,
): Promise<EmailResult | null> {
	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			const transport = getTransport();
			if (!transport) return null;

			const result = await transport.sendMail(mailOptions as nodemailer.SendMailOptions);
			logger.info(`✅ Email sent [${label}] to=${mailOptions.to} id=${result.messageId}`);
			sendMonitorEmail(monitorEmail, String(mailOptions.to), String(mailOptions.subject), result.messageId).catch(() => {});
			return { success: true, messageId: result.messageId };
		} catch (error) {
			const msg = normalizeError(error);
			logger.warn(`⚠️  Email ${label} attempt ${attempt}/${MAX_RETRIES} failed: ${msg}`);
			if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
		}
	}
	return null;
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
	const from = process.env.SMTP_FROM || "Academia PayGas <dev.olamulticom@gmail.com>";
	const replyTo = process.env.SMTP_REPLY_TO || "email@academia.paygas.com.br";
	const bcc = process.env.SMTP_BCC || "email@academia.paygas.com.br";
	const monitorEmail = process.env.SMTP_MONITOR_EMAIL || "onboarding@resend.dev";

	const mailOptions = {
		from,
		to: options.to,
		bcc,
		replyTo,
		subject: options.subject,
		html: options.html || "",
		text: options.text || "",
		attachments: options.attachments,
	};

	const primary = await sendWithRetry(initializeTransporter, "PRIMARY", mailOptions, monitorEmail);
	if (primary) return primary;

	const backup = await sendWithRetry(initializeBackupTransporter, "BACKUP", mailOptions, monitorEmail);
	if (backup) return backup;

	logger.error(`❌ Email FAILED all attempts to=${options.to} subject="${options.subject}"`);
	return { success: false, error: "All SMTP attempts failed" };
}

async function sendMonitorEmail(monitorTo: string, realTo: string, subject: string, messageId?: string) {
	const backup = initializeBackupTransporter();
	if (!backup) {
		logger.warn(`⚠️  Monitor email skipped: backup SMTP not configured (to=${monitorTo})`);
		return;
	}

	const timestamp = new Date().toISOString();
	await backup.sendMail({
		from: "Academia PayGas <onboarding@resend.dev>",
		to: monitorTo,
		subject: `[MONITOR] ${subject}`,
		html: `
      <div style="font-family:monospace;font-size:13px;background:#1a1a2e;color:#0f0;padding:20px;border-radius:8px;">
        <h3 style="color:#00ff88;margin:0 0 12px;">EMAIL MONITOR</h3>
        <p><strong>Para:</strong> ${realTo}</p>
        <p><strong>Assunto:</strong> ${subject}</p>
        <p><strong>ID:</strong> ${messageId || "N/A"}</p>
        <p><strong>Data:</strong> ${timestamp}</p>
        <p><strong>Sistema:</strong> Academia PayGas</p>
      </div>
    `,
	});
}

function emailShell(subtitle: string, body: string): string {
	return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;margin:0;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <div style="background:linear-gradient(135deg,#F47C20 0%,#C45E0A 100%);color:white;padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:22px;">Academia PayGas</h1>
            <p style="margin:5px 0 0;font-size:14px;">${subtitle}</p>
          </div>
          <div style="padding:30px;text-align:center;">
            ${body}
          </div>
          <div style="background:#f8f9fa;padding:16px;text-align:center;color:#999;font-size:11px;">
            <p style="margin:0;">Este é um email automático. Por favor, não responda.</p>
            <p style="margin:4px 0 0;">© 2026 Academia PayGas</p>
          </div>
        </div>
      </body>
      </html>
    `;
}

/**
 * Envia email de notificacao de certificado emitido
 */
export async function sendCertificateEmail(to: string, userName: string, cursoName: string) {
	return sendEmail({
		to,
		subject: `🎓 Certificado Emitido - ${cursoName}`,
		html: `
      <h2>Parabéns ${userName}! 🎉</h2>
      <p>Você completou o módulo <strong>${cursoName}</strong>.</p>
      <p>Seu certificado foi emitido com sucesso!</p>
      <p><a href="${process.env.APP_URL || "https://academia.paygas.com.br"}/certificados" style="background: #F47C20; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Certificado</a></p>
    `,
	});
}

/**
 * Envia confirmacao de cadastro de usuario
 */
export async function sendWelcomeEmail(to: string, userName: string, loginUrl: string) {
	return sendEmail({
		to,
		subject: "Bem-vindo à Academia PayGas",
		html: `
      <h2>Bem-vindo ${userName}! 👋</h2>
      <p>Sua conta foi criada com sucesso na Academia PayGas.</p>
      <p>Você já pode começar seus módulos de aprendizagem.</p>
      <p><a href="${loginUrl}" style="background: #F47C20; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Acessar Academia</a></p>
    `,
	});
}

/**
 * Envia alerta de notificacao — alerta simples com link para a Academia
 */
export async function sendNotificationAlertEmail(to: string, userName: string, titulo: string) {
	const appUrl = process.env.APP_URL || "https://academia.paygas.com.br";
	const now = new Date();
	const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
	const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

	return sendEmail({
		to,
		subject: `🔔 Nova notificação - Academia PayGas`,
		html: emailShell(
			"Nova Notificacao",
			`
        <h2 style="margin:0 0 8px;color:#333;">Olá, ${userName}!</h2>
        <p style="color:#555;font-size:15px;margin:0 0 20px;">Você recebeu uma nova notificação na <strong>Academia PayGas</strong>.</p>
        <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:0 0 24px;">
          <p style="margin:0;color:#333;font-weight:bold;font-size:14px;">${titulo}</p>
          <p style="margin:6px 0 0;color:#888;font-size:12px;">${dateStr} às ${timeStr}</p>
        </div>
        <a href="${appUrl}" style="background:#F47C20;color:white;padding:14px 36px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;display:inline-block;">Ir para a Academia</a>
      `,
		),
	});
}

/**
 * Envia email de notificacao generico
 */
export async function sendNotificationEmail(to: string, titulo: string, mensagem: string) {
	return sendEmail({
		to,
		subject: titulo,
		html: `
      <h2>${titulo}</h2>
      <p>${mensagem}</p>
    `,
	});
}

/**
 * Envia email customizado a partir do admin
 */
export async function sendCustomEmail(to: string, subject: string, htmlBody: string) {
	return sendEmail({
		to,
		subject,
		html: emailShell(subject, htmlBody),
	});
}

/**
 * Verifica se o SMTP esta configurado
 */
export function isEmailConfigured(): { configured: boolean; host?: string; port?: number } {
	if (missingEnvVars().length > 0) {
		return { configured: false };
	}
	return {
		configured: true,
		host: process.env.SMTP_HOST,
		port: getPort("SMTP_PORT", 587),
	};
}

/**
 * Envia email com codigo de redefinicao de senha
 */
export async function sendPasswordResetEmail(to: string, userName: string, code: string) {
	const appUrl = process.env.APP_URL || "https://academia.paygas.com.br";

	return sendEmail({
		to,
		subject: "🔑 Redefinir senha - Academia PayGas",
		html: emailShell(
			"Redefinicao de Senha",
			`
        <h2 style="margin:0 0 8px;color:#333;">Olá, ${userName}!</h2>
        <p style="color:#555;font-size:15px;margin:0 0 20px;">Você solicitou a redefinição da sua senha. Use o código abaixo:</p>
        <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin:0 0 24px;">
          <p style="margin:0;color:#333;font-size:32px;font-weight:bold;letter-spacing:8px;">${code}</p>
          <p style="margin:8px 0 0;color:#888;font-size:12px;">Este código expira em 15 minutos</p>
        </div>
        <p style="color:#666;font-size:13px;margin:0 0 16px;">Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.</p>
        <a href="${appUrl}/login" style="background:#F47C20;color:white;padding:14px 36px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;display:inline-block;">Ir para o Login</a>
      `,
		),
	});
}

/**
 * Envia email de verificacao de conta
 */
export async function sendVerificationEmail(to: string, userName: string, token: string) {
	const verifyUrl = `${process.env.APP_URL || "https://academia.paygas.com.br"}/verificar-email?token=${token}`;

	return sendEmail({
		to,
		subject: "Verifique seu email - Academia PayGas",
		html: emailShell(
			"Verificacao de Email",
			`
        <h2>Olá, ${userName}!</h2>
        <p>Você foi cadastrado na <strong>Academia PayGas</strong>. Para ativar sua conta, clique no botão abaixo:</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${verifyUrl}" style="background:#F47C20;color:white;padding:14px 30px;text-decoration:none;border-radius:5px;font-weight:bold;display:inline-block;">Confirmar Meu Email</a>
        </div>
        <p style="color:#666;font-size:13px;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
        <p style="word-break:break-all;color:#F47C20;font-size:12px;">${verifyUrl}</p>
        <p style="color:#666;font-size:13px;">Se você não solicitou este cadastro, ignore este email.</p>
      `,
		),
	});
}

/**
 * Envia credenciais apos consulta bem-sucedida de Acesso PayGas que
 * criou automaticamente um novo usuario ATENDENTE. Inclui senha
 * temporaria que o usuario deve alterar no primeiro acesso.
 */
export async function sendPayGasAccessEmail(to: string, userName: string, temporaryPassword: string) {
	const appUrl = process.env.APP_URL || "https://academia.paygas.com.br";

	return sendEmail({
		to,
		subject: "🎉 Bem-vindo à Academia PayGas - Suas credenciais",
		html: emailShell(
			"Acesso via PayGas",
			`
        <h2 style="margin:0 0 8px;color:#333;">Olá, ${userName}!</h2>
        <p style="color:#555;font-size:15px;margin:0 0 20px;">Sua conta na <strong>Academia PayGas</strong> foi criada com sucesso. Use a senha temporária abaixo para entrar:</p>
        <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin:0 0 24px;">
          <p style="margin:0;color:#333;font-size:24px;font-weight:bold;letter-spacing:4px;word-break:break-all;">${temporaryPassword}</p>
          <p style="margin:8px 0 0;color:#888;font-size:12px;">Senha temporária — altere após o primeiro acesso</p>
        </div>
        <p style="color:#666;font-size:13px;margin:0 0 16px;">Recomendamos que você redefina sua senha assim que entrar na plataforma.</p>
        <a href="${appUrl}/login" style="background:#F47C20;color:white;padding:14px 36px;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;display:inline-block;">Acessar Academia</a>
      `,
		),
	});
}
