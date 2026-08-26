import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { type AuthRequest, authenticate, JWT_SECRET } from "../middleware/auth";
import { isEmailConfigured, sendPasswordResetEmail } from "../services/email";
import { awardLoginPointsDaily } from "../services/gamification";
import { logActivity } from "../services/log";
import payGasRoutes from "./paygas-access";

const router = Router();

// Mount Acesso PayGas routes under /api/auth/paygas-*
router.use("/paygas", payGasRoutes);

async function getEstabelecimento(estabelecimentoId: string | null | undefined) {
	if (!estabelecimentoId) return null;
	const e = await drizzleDb.findUnique("estabelecimento", { id: estabelecimentoId });
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
router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ error: "Email e senha são obrigatórios" });
		}

		const user = (await drizzleDb.findUnique("user", { email })) as any;
		if (!user) {
			logger.warn(`[AUTH LOGIN] Usuario nao encontrado: ${email}`);
			return res.status(401).json({ error: "Credenciais inválidas" });
		}

		const validPassword = await bcrypt.compare(password, user.senha);
		if (!validPassword) {
			logger.warn(`[AUTH LOGIN] Senha incorreta para: ${email} (hash prefix: ${user.senha.substring(0, 7)})`);
			return res.status(401).json({ error: "Credenciais inválidas" });
		}

		await drizzleDb.update("user", { id: user.id }, { lastLogin: new Date() });

		// Award login points (max once per day)
		await awardLoginPointsDaily(user.id);

		await logActivity(user.id, "Login", `Acesso de ${user.email}`);

		const token = jwt.sign({ userId: user.id, role: user.role, gestorId: user.gestorId || null }, JWT_SECRET, {
			expiresIn: "24h",
		});

		const estabelecimento = await getEstabelecimento(user.estabelecimentoId);

		res.json({
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
		res.status(500).json({ error: "Erro interno do servidor" });
	}
});

// GET /api/auth/me
router.get("/me", authenticate, async (req: AuthRequest, res) => {
	try {
		const user = (await drizzleDb.findUnique("user", { id: req.userId! })) as any;
		if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

		const estabelecimento = await getEstabelecimento(user.estabelecimentoId);

		res.json({
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
		res.status(500).json({ error: "Erro interno do servidor" });
	}
});

// GET /api/auth/verify-email?token=xxx
router.get("/verify-email", async (req, res) => {
	try {
		const { token } = req.query;
		if (!token || typeof token !== "string") {
			return res.status(400).json({ error: "Token de verificacao invalido" });
		}

		const user = (await drizzleDb.findFirst("user", { tokenVerificacao: token })) as any;

		if (!user) {
			return res.status(404).json({ error: "Token invalido ou expirado" });
		}

		// Check if token has expired
		if (user.tokenExpiry && new Date() > user.tokenExpiry) {
			return res.status(400).json({ error: "Token expirado. Solicite um novo." });
		}

		if (user.emailVerificado) {
			return res.json({ message: "Email ja verificado", alreadyVerified: true });
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

		res.json({ message: "Email verificado com sucesso!" });
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao verificar email" });
	}
});

// GET /api/auth/email-status — check if SMTP is configured
router.get("/email-status", (_req, res) => {
	res.json(isEmailConfigured());
});

// POST /api/auth/forgot-password — send reset code to email
router.post("/forgot-password", async (req, res) => {
	try {
		const { email } = req.body;
		if (!email) {
			return res.status(400).json({ error: "Email é obrigatório" });
		}

		const user = (await drizzleDb.findUnique("user", { email })) as any;
		if (!user) {
			// Silently succeed to prevent email enumeration
			return res.json({ message: "Se o email estiver cadastrado, você receberá um código de redefinição." });
		}

		const code = Math.floor(100000 + Math.random() * 900000).toString();
		const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

		await drizzleDb.update(
			"user",
			{ id: user.id },
			{
				tokenRecuperacao: code,
				tokenRecuperacaoExpiry: expiry,
			},
		);

		await sendPasswordResetEmail(user.email, user.nome || user.email, code).then((r) => {
			if (!r.success) logger.warn(`[AUTH] Falha email reset para ${user.email}: ${r.error}`);
		});

		await logActivity(user.id, "Solicitacao Reset Senha", `Email: ${user.email}`);

		res.json({ message: "Se o email estiver cadastrado, você receberá um código de redefinição." });
	} catch (error) {
		logger.error("[AUTH FORGOT PASSWORD ERROR]", error);
		res.status(500).json({ error: "Erro interno do servidor" });
	}
});

// POST /api/auth/reset-password — verify code and set new password
router.post("/reset-password", async (req, res) => {
	try {
		const { email, code, newPassword, confirmPassword } = req.body;

		if (!email || !code || !newPassword || !confirmPassword) {
			return res.status(400).json({ error: "Todos os campos são obrigatórios" });
		}

		if (newPassword !== confirmPassword) {
			return res.status(400).json({ error: "As senhas não coincidem" });
		}

		if (newPassword.length < 8) {
			return res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres" });
		}

		const user = (await drizzleDb.findUnique("user", { email })) as any;
		if (!user || user.tokenRecuperacao !== code) {
			return res.status(400).json({ error: "Código inválido ou email incorreto" });
		}

		if (user.tokenRecuperacaoExpiry && new Date() > user.tokenRecuperacaoExpiry) {
			// Clear expired token
			await drizzleDb.update(
				"user",
				{ id: user.id },
				{
					tokenRecuperacao: null,
					tokenRecuperacaoExpiry: null,
				},
			);
			return res.status(400).json({ error: "Código expirado. Solicite um novo." });
		}

		const hashedPassword = await bcrypt.hash(newPassword, 12);
		await drizzleDb.update(
			"user",
			{ id: user.id },
			{
				senha: hashedPassword,
				tokenRecuperacao: null,
				tokenRecuperacaoExpiry: null,
			},
		);

		await logActivity(user.id, "Senha Redefinida", "Senha redefinida via recuperacao");

		res.json({ message: "Senha redefinida com sucesso! Você já pode fazer login." });
	} catch (error) {
		logger.error("[AUTH RESET PASSWORD ERROR]", error);
		res.status(500).json({ error: "Erro interno do servidor" });
	}
});

export default router;
