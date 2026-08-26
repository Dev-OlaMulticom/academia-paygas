import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { JWT_SECRET } from "../fastify-plugins/auth";
import { isEmailConfigured, sendPasswordResetEmail, sendPayGasAccessEmail } from "../services/email";
import { awardLoginPointsDaily } from "../services/gamification";
import { logActivity } from "../services/log";
import {
	generateTemporaryPassword,
	lookupPayGasEmployee,
	PayGasApiError,
	type PayGasEmployee,
	sanitizeCpf,
	sanitizeEmail,
} from "../lib/paygas-client";

/**
 * Auth routes — migrated from Express routes/auth.ts + routes/paygas-access.ts.
 * POST /api/auth/login
 * GET  /api/auth/me
 * GET  /api/auth/verify-email
 * GET  /api/auth/email-status
 * POST /api/auth/forgot-password
 * POST /api/auth/reset-password
 * POST /api/auth/paygas/paygas-access
 * GET  /api/auth/paygas/paygas-api-status
 */
const authRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	async function getEstabelecimento(estabelecimentoId: string | null | undefined) {
		if (!estabelecimentoId) return null;
		const e = (await drizzleDb.findUnique("estabelecimento", { id: estabelecimentoId })) as any;
		return e
			? {
					id: e.id,
					nome: e.nome,
					cidade: e.cidade,
					uf: e.uf,
				}
			: null;
	}

	// POST /api/auth/login
	fastify.post("/login", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const { email, password } = request.body as any;
			if (!email || !password) {
				return reply.code(400).send({ error: "Email e senha são obrigatórios" });
			}

			const user = (await drizzleDb.findUnique("user", { email })) as any;
			if (!user) {
				logger.warn(`[AUTH LOGIN] Usuario nao encontrado: ${email}`);
				return reply.code(401).send({ error: "Credenciais inválidas" });
			}

			const validPassword = await bcrypt.compare(password, user.senha);
			if (!validPassword) {
				logger.warn(`[AUTH LOGIN] Senha incorreta para: ${email} (hash prefix: ${user.senha.substring(0, 7)})`);
				return reply.code(401).send({ error: "Credenciais inválidas" });
			}

			await drizzleDb.update("user", { id: user.id }, { lastLogin: new Date() });

			await awardLoginPointsDaily(user.id);

			await logActivity(user.id, "Login", `Acesso de ${user.email}`);

			const token = jwt.sign({ userId: user.id, role: user.role, gestorId: user.gestorId || null }, JWT_SECRET, {
				expiresIn: "24h",
			});

			const estabelecimento = await getEstabelecimento(user.estabelecimentoId);

			return reply.send({
				token,
				user: {
					id: user.id,
					email: user.email,
					nome: user.nome,
					role: user.role,
					xp: user.xp,
					gestorId: user.gestorId,
					perfil: user.perfil,
					estabelecimento,
				},
			});
		} catch (error) {
			logger.error("[AUTH LOGIN ERROR]", error);
			return reply.code(500).send({ error: "Erro interno do servidor" });
		}
	});

	// GET /api/auth/me
	fastify.get(
		"/me",
		{
			preHandler: [
				async (request: FastifyRequest, reply: FastifyReply) => {
					const authHeader = request.headers.authorization;
					if (!authHeader?.startsWith("Bearer ")) {
						reply.code(401);
						throw new Error("Token não fornecido");
					}
					const token = authHeader.split(" ")[1];
					try {
						const decoded = jwt.verify(token, JWT_SECRET) as {
							userId: string;
							role: string;
							gestorId?: string | null;
						};
						request.userId = decoded.userId;
						request.userRole = decoded.role;
					} catch {
						reply.code(401);
						throw new Error("Token inválido");
					}
				},
			],
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const user = (await drizzleDb.findUnique("user", { id: request.userId! })) as any;
				if (!user) return reply.code(404).send({ error: "Usuário não encontrado" });

				const estabelecimento = await getEstabelecimento(user.estabelecimentoId);

				return reply.send({
					id: user.id,
					email: user.email,
					nome: user.nome,
					role: user.role,
					xp: user.xp,
					gestorId: user.gestorId,
					perfil: user.perfil,
					estabelecimento,
					createdAt: user.createdAt,
					lastLogin: user.lastLogin,
				});
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro interno do servidor" });
			}
		},
	);

	// GET /api/auth/verify-email?token=xxx
	fastify.get("/verify-email", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const { token } = request.query as Record<string, string | undefined>;
			if (!token || typeof token !== "string") {
				return reply.code(400).send({ error: "Token de verificacao invalido" });
			}

			const user = (await drizzleDb.findFirst("user", { tokenVerificacao: token })) as any;

			if (!user) {
				return reply.code(404).send({ error: "Token invalido ou expirado" });
			}

			if (user.tokenExpiry && new Date() > user.tokenExpiry) {
				return reply.code(400).send({ error: "Token expirado. Solicite um novo." });
			}

			if (user.emailVerificado) {
				return reply.send({ message: "Email ja verificado", alreadyVerified: true });
			}

			await drizzleDb.update(
				"user",
				{ id: user.id },
				{
					emailVerificado: true,
					tokenVerificacao: null,
					tokenExpiry: null,
				},
			);

			return reply.send({ message: "Email verificado com sucesso!" });
		} catch (error) {
			logger.error("[ROUTE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao verificar email" });
		}
	});

	// GET /api/auth/email-status
	fastify.get("/email-status", async (_request: FastifyRequest, reply: FastifyReply) => {
		return reply.send(isEmailConfigured());
	});

	// POST /api/auth/forgot-password
	fastify.post("/forgot-password", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const { email } = request.body as any;
			if (!email) {
				return reply.code(400).send({ error: "Email é obrigatório" });
			}

			const user = (await drizzleDb.findUnique("user", { email })) as any;
			if (!user) {
				return reply.send({
					message: "Se o email estiver cadastrado, você receberá um código de redefinição.",
				});
			}

			const code = Math.floor(100000 + Math.random() * 900000).toString();
			const expiry = new Date(Date.now() + 15 * 60 * 1000);

			await drizzleDb.update("user", { id: user.id }, { tokenRecuperacao: code, tokenRecuperacaoExpiry: expiry });

			await sendPasswordResetEmail(user.email, user.nome || user.email, code).then((r) => {
				if (!r.success) logger.warn(`[AUTH] Falha email reset para ${user.email}: ${r.error}`);
			});

			await logActivity(user.id, "Solicitacao Reset Senha", `Email: ${user.email}`);

			return reply.send({
				message: "Se o email estiver cadastrado, você receberá um código de redefinição.",
			});
		} catch (error) {
			logger.error("[AUTH FORGOT PASSWORD ERROR]", error);
			return reply.code(500).send({ error: "Erro interno do servidor" });
		}
	});

	// POST /api/auth/reset-password
	fastify.post("/reset-password", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const { email, code, newPassword, confirmPassword } = request.body as any;

			if (!email || !code || !newPassword || !confirmPassword) {
				return reply.code(400).send({ error: "Todos os campos são obrigatórios" });
			}

			if (newPassword !== confirmPassword) {
				return reply.code(400).send({ error: "As senhas não coincidem" });
			}

			if (newPassword.length < 8) {
				return reply.code(400).send({ error: "A senha deve ter pelo menos 8 caracteres" });
			}

			const user = (await drizzleDb.findUnique("user", { email })) as any;
			if (!user || user.tokenRecuperacao !== code) {
				return reply.code(400).send({ error: "Código inválido ou email incorreto" });
			}

			if (user.tokenRecuperacaoExpiry && new Date() > user.tokenRecuperacaoExpiry) {
				await drizzleDb.update(
					"user",
					{ id: user.id },
					{ tokenRecuperacao: null, tokenRecuperacaoExpiry: null },
				);
				return reply.code(400).send({ error: "Código expirado. Solicite um novo." });
			}

			const hashedPassword = await bcrypt.hash(newPassword, 12);
			await drizzleDb.update("user", { id: user.id }, {
				senha: hashedPassword,
				tokenRecuperacao: null,
				tokenRecuperacaoExpiry: null,
			});

			await logActivity(user.id, "Senha Redefinida", "Senha redefinida via recuperacao");

			return reply.send({ message: "Senha redefinida com sucesso! Você já pode fazer login." });
		} catch (error) {
			logger.error("[AUTH RESET PASSWORD ERROR]", error);
			return reply.code(500).send({ error: "Erro interno do servidor" });
		}
	});

	// ─── PayGas Access (mounted under /api/auth/paygas) ───

	// GET /api/auth/paygas/paygas-api-status
	fastify.get("/paygas/paygas-api-status", async (_request: FastifyRequest, reply: FastifyReply) => {
		const configured = Boolean(process.env.PAYGAS_API_URL && process.env.PAYGAS_API_KEY);
		return reply.send({ configured });
	});

	// POST /api/auth/paygas/paygas-access
	fastify.post("/paygas/paygas-access", async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const cpfRaw: string | undefined = (request.body as any)?.cpf;
			const emailRaw: string | undefined = (request.body as any)?.email;

			const cpf = cpfRaw ? sanitizeCpf(cpfRaw) : undefined;
			const email = emailRaw ? sanitizeEmail(emailRaw) : undefined;

			if (!cpf && !email) {
				return reply.code(400).send({
					error: "Informe um CPF (11 dígitos) ou um e-mail válido.",
				});
			}
			if (cpfRaw && !cpf) {
				return reply.code(400).send({ error: "CPF inválido. Use 11 dígitos numéricos." });
			}
			if (emailRaw && !email) {
				return reply.code(400).send({ error: "E-mail inválido." });
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
					return reply.code(status).send({ error: err.message, code: err.code });
				}
				throw err;
			}

			if (!lookup.exists || !lookup.employee) {
				return reply.code(404).send({
					error: "Funcionário não encontrado no sistema PayGas. Verifique o CPF ou e-mail informado.",
				});
			}

			const employee: PayGasEmployee = lookup.employee;

			let user: any = await drizzleDb.findUnique("user", { email: employee.email });

			let isNewlyCreated = false;
			let temporaryPassword: string | null = null;

			if (!user) {
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
					user = await drizzleDb.findUnique("user", { email: employee.email });
					if (!user) throw createErr;
				}
			}

			await awardLoginPointsDaily(user.id);
			await logActivity(user.id, "Login PayGas", `Acesso via PayGas (${isNewlyCreated ? "novo" : "existente"})`);
			await drizzleDb.update("user", { id: user.id }, { lastLogin: new Date() });

			const token = jwt.sign({ userId: user.id, role: user.role, gestorId: user.gestorId || null }, JWT_SECRET, {
				expiresIn: "24h",
			});

			if (isNewlyCreated && temporaryPassword) {
				sendPayGasAccessEmail(user.email, user.nome, temporaryPassword)
					.then((r) => {
						if (!r.success) {
							logger.warn(`[PAY-GAS] Falha ao enviar credenciais para ${user.email}: ${r.error}`);
						}
					})
					.catch((err) => logger.warn("[PAY-GAS] Erro no envio de credenciais:", err?.message));
			}

			return reply.send({
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
			return reply.code(500).send({ error: "Erro interno ao processar acesso PayGas" });
		}
	});

	done();
};

export default authRoutes;
