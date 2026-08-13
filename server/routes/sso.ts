import { Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "../lib/db";
import logger from "../lib/logger";
import { PayGasSSOError, type PayGasSSOResponse, validateSSOTicketWithRaw } from "../lib/paygas-sso-client";
import { JWT_SECRET } from "../middleware/auth";
import { awardLoginPointsDaily } from "../services/gamification";
import { ensureGestorAssigned } from "../services/gestor-assignment";
import { logActivity } from "../services/log";
import { findOrCreateSSOUser } from "../services/sso-user-sync";

const router = Router();

function renderSSOError(title: string, message: string, action?: { label: string; url: string }): string {
	return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — Academia PayGas</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f5f5;color:#333}
    .card{background:#fff;padding:2.5rem;border-radius:16px;max-width:440px;width:90%;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.08)}
    h1{color:#F47C20;font-size:1.4rem;margin-bottom:.75rem}
    p{color:#666;line-height:1.6;margin-bottom:1.5rem}
    .btn{display:inline-block;padding:.75rem 2rem;background:#F47C20;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:.95rem;transition:background .2s}
    .btn:hover{background:#e06b10}
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    ${action ? `<a class="btn" href="${action.url}">${action.label}</a>` : ""}
  </div>
</body>
</html>`;
}

// GET /api/sso?ticket=xxx[&debug=1]
router.get("/sso", async (req, res) => {
	const ticketRaw = req.query.ticket;
	const debug = req.query.debug === "1";

	if (!ticketRaw || typeof ticketRaw !== "string") {
		if (debug) {
			return res.status(400).json({ error: { status: 400, message: "Ticket SSO não fornecido." } });
		}
		return res.status(400).send(renderSSOError("Link inválido", "Ticket SSO não fornecido."));
	}

	const ticket = decodeURIComponent(ticketRaw).trim();
	if (!ticket) {
		if (debug) {
			return res.status(400).json({ error: { status: 400, message: "Ticket SSO não fornecido." } });
		}
		return res.status(400).send(renderSSOError("Link inválido", "Ticket SSO não fornecido."));
	}

	// Validate ticket against PayGas API (never log the ticket)
	let ssoData: PayGasSSOResponse;
	let ssoRaw: unknown;
	try {
		const result = await validateSSOTicketWithRaw(ticket);
		ssoData = result.data;
		ssoRaw = result.raw;
	} catch (err: unknown) {
		if (err instanceof PayGasSSOError) {
			logger.warn(`[SSO] Validação falhou: HTTP ${err.status}`);

			if (debug) {
				return res.status(err.status).json({
					error: {
						status: err.status,
						message: err.message,
						retryAfter: err.retryAfter,
						raw: err.raw ?? null,
					},
				});
			}

			if (err.status === 401) {
				return res
					.status(401)
					.send(renderSSOError("Credenciais inválidas", "Erro de autenticação com o servidor SSO."));
			}
			if (err.status === 403) {
				return res
					.status(403)
					.send(renderSSOError("Acesso negado", "Você não tem permissão para acessar este recurso."));
			}
			if (err.status === 422) {
				return res
					.status(422)
					.send(
						renderSSOError(
							"Link expirado",
							"Seu link de acesso expirou ou já foi utilizado. Volte ao PayGas para gerar um novo.",
							{ label: "Voltar ao PayGas", url: "https://paygas.com.br" },
						),
					);
			}
			if (err.status === 429) {
				const retryAfter = err.retryAfter || 60;
				res.set("Retry-After", String(retryAfter));
				return res.status(429).send(renderSSOError("Muitas tentativas", `Tente novamente em ${retryAfter} segundos.`));
			}
			// 502/503/504
			return res
				.status(err.status)
				.send(
					renderSSOError("Erro de comunicação", "Não foi possível conectar ao servidor. Tente novamente mais tarde."),
				);
		}
		// Unexpected error
		logger.error("[SSO] Erro inesperado na validação:", err);
		if (debug) {
			return res.status(500).json({ error: { status: 500, message: "Erro interno inesperado." } });
		}
		return res.status(500).send(renderSSOError("Erro interno", "Ocorreu um erro inesperado. Tente novamente."));
	}

	// Debug mode: return the raw PayGas response as JSON and stop (no login).
	if (debug) {
		return res.status(200).json(ssoRaw);
	}

	// Find or create user by sub
	let user: Awaited<ReturnType<typeof findOrCreateSSOUser>>;
	try {
		user = await findOrCreateSSOUser(ssoData);
	} catch (err) {
		logger.error("[SSO] Erro ao criar/sincronizar usuário:", err);
		return res
			.status(500)
			.send(renderSSOError("Erro interno", "Ocorreu um erro ao processar seu acesso. Tente novamente."));
	}

	// Assign a gestor automatically when missing — the frontend blocks access to
	// the courses for ATENDENTE users without a gestor.
	try {
		user = await ensureGestorAssigned(user);
	} catch (err) {
		logger.warn("[SSO] Erro ao atribuir gestor automaticamente:", err);
	}

	// Auth ceremony (same pattern as paygas-access.ts)
	try {
		await awardLoginPointsDaily(user.id);
		await logActivity(user.id, "Login SSO", "Acesso via SSO PayGas");
		await db.update("user", { id: user.id }, { lastLogin: new Date() });
	} catch (err) {
		// Non-blocking: log but don't fail the login
		logger.warn("[SSO] Erro ao registrar atividade:", err);
	}

	// Sign JWT (24h)
	const token = jwt.sign({ userId: user.id, role: user.role, gestorId: user.gestorId || null }, JWT_SECRET, {
		expiresIn: "24h",
	});

	// Redirect to frontend callback
	const appUrl = (process.env.APP_URL || "").replace(/\/+$/, "") || "";
	res.redirect(302, `${appUrl}/sso/callback?token=${encodeURIComponent(token)}`);
});

export default router;
