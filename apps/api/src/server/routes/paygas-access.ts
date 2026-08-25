/**
 * Acesso PayGas — public endpoint (no auth required).
 *
 * Flow:
 *   1. Client sends { cpf?, email? } (at least one).
 *   2. Server validates and sanitises the input.
 *   3. Server calls the external PayGas API via lib/paygas-client.ts.
 *   4. If the employee exists in the external system:
 *        a. If their email is already registered in the Academia → log them in.
 *        b. Otherwise → auto-create a new ATENDENTE User with a temporary
 *           password, mark email as verified, and send the credentials via
 *           email. Then log them in.
 *   5. If the employee does NOT exist → return 404 USER_NOT_FOUND.
 *
 * Rate limited (5/hour) via the same registerLimiter the existing /api/usuarios
 * POST uses, registered in server/index.ts.
 */

import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import {
	generateTemporaryPassword,
	lookupPayGasEmployee,
	PayGasApiError,
	type PayGasEmployee,
	sanitizeCpf,
	sanitizeEmail,
} from "../lib/paygas-client";
import { JWT_SECRET } from "../middleware/auth";
import { sendPayGasAccessEmail } from "../services/email";
import { awardLoginPointsDaily } from "../services/gamification";
import { logActivity } from "../services/log";

const router = Router();

// Rate limiting: 5 attempts per hour (matches registerLimiter cadence).
// Applied only to the POST; status endpoint remains anonymous/unmetered.
const payGasLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 5,
	message: { error: "Demasiadas tentativas. Tente novamente em 1 hora." },
	standardHeaders: true,
	legacyHeaders: false,
});

// GET /auth/paygas/paygas-api-status
// Public diagnostic: returns whether the external API is configured.
// Does NOT leak credentials or topology.
router.get("/paygas-api-status", (_req, res) => {
	const configured = Boolean(process.env.PAYGAS_API_URL && process.env.PAYGAS_API_KEY);
	res.json({ configured });
});

// POST /auth/paygas/paygas-access
// Body: { cpf?: string, email?: string }
router.post("/paygas-access", payGasLimiter, async (req, res) => {
	try {
		const cpfRaw: string | undefined = req.body?.cpf;
		const emailRaw: string | undefined = req.body?.email;

		const cpf = cpfRaw ? sanitizeCpf(cpfRaw) : undefined;
		const email = emailRaw ? sanitizeEmail(emailRaw) : undefined;

		if (!cpf && !email) {
			return res.status(400).json({
				error: "Informe um CPF (11 dígitos) ou um e-mail válido.",
			});
		}
		if (cpfRaw && !cpf) {
			return res.status(400).json({ error: "CPF inválido. Use 11 dígitos numéricos." });
		}
		if (emailRaw && !email) {
			return res.status(400).json({ error: "E-mail inválido." });
		}

		let lookup: Awaited<ReturnType<typeof lookupPayGasEmployee>>;
		try {
			lookup = await lookupPayGasEmployee({
				cpf: cpf ?? undefined,
				email: email ?? undefined,
			});
		} catch (err: any) {
			if (err instanceof PayGasApiError) {
				const status = err.code === "PAYGAS_API_NOT_CONFIGURED" ? 503 : err.code === "PAYGAS_API_TIMEOUT" ? 504 : 502;
				return res.status(status).json({ error: err.message, code: err.code });
			}
			throw err;
		}

		if (!lookup.exists || !lookup.employee) {
			return res.status(404).json({
				error: "Funcionário não encontrado no sistema PayGas. Verifique o CPF ou e-mail informado.",
			});
		}

		const employee: PayGasEmployee = lookup.employee;

		// Find an existing user by email
		let user: any = await drizzleDb.findUnique("user", { email: employee.email });

		let isNewlyCreated = false;
		let temporaryPassword: string | null = null;

		if (!user) {
			// Auto-create ATENDENTE account
			temporaryPassword = generateTemporaryPassword();
			const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

			try {
				user = await drizzleDb.create("user", {
					email: employee.email,
					nome: employee.name,
					senha: hashedPassword,
					role: "ATENDENTE",
					emailVerificado: true,
				});
				isNewlyCreated = true;
			} catch (createErr: any) {
				// Race: somebody else just created it. Reload.
				user = await drizzleDb.findUnique("user", { email: employee.email });
				if (!user) throw createErr;
			}
		}

		// Award daily login points + activity log
		await awardLoginPointsDaily(user.id);
		await logActivity(user.id, "Login PayGas", `Acesso via PayGas (${isNewlyCreated ? "novo" : "existente"})`);

		// Update lastLogin
		await drizzleDb.update("user", { id: user.id }, { lastLogin: new Date() });

		// Sign JWT (24h)
		const token = jwt.sign({ userId: user.id, role: user.role, gestorId: user.gestorId || null }, JWT_SECRET, {
			expiresIn: "24h",
		});

		// Fire-and-forget email with credentials for new users.
		// Failure must not block login.
		if (isNewlyCreated && temporaryPassword) {
			sendPayGasAccessEmail(user.email, user.nome, temporaryPassword)
				.then((r) => {
					if (!r.success) {
						logger.warn(`[PAY-GAS] Falha ao enviar credenciais para ${user.email}: ${r.error}`);
					}
				})
				.catch((err) => logger.warn("[PAY-GAS] Erro no envio de credenciais:", err?.message));
		}

		res.json({
			token,
			user: {
				id: user.id,
				email: user.email,
				nome: user.nome,
				role: user.role,
				xp: user.xp ?? 0,
				gestorId: user.gestorId ?? null,
			},
			isNewlyCreated,
			message: isNewlyCreated
				? "Conta criada e acesso liberado. Enviamos suas credenciais por e-mail."
				: "Acesso liberado.",
		});
	} catch (error: any) {
		logger.error("[PAY-GAS ACCESS ERROR]", error);
		res.status(500).json({ error: "Erro interno ao processar acesso PayGas" });
	}
});

export default router;
