import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { PayGasSSOError, type PayGasSSOResponse, validateSSOTicketWithRaw } from "../lib/paygas-sso-client";
import { JWT_SECRET } from "../fastify-plugins/auth";
import { awardLoginPointsDaily } from "../services/gamification";
import { ensureGestorAssigned } from "../services/gestor-assignment";
import { logActivity } from "../services/log";
import { findOrCreateSSOUser } from "../services/sso-user-sync";

/**
 * SSO routes — migrated from Express routes/sso.ts.
 * GET /api/sso?ticket=xxx[&debug=1]
 */
const ssoRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
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
	fastify.get("/sso", async (request: FastifyRequest, reply: FastifyReply) => {
		const ticketRaw = (request.query as Record<string, string | undefined>).ticket;
		const debug = (request.query as Record<string, string | undefined>).debug === "1";

		if (!ticketRaw || typeof ticketRaw !== "string") {
			if (debug) {
				return reply.code(400).send({ error: { status: 400, message: "Ticket SSO não fornecido." } });
			}
			return reply.code(400).type("text/html").send(renderSSOError("Link inválido", "Ticket SSO não fornecido."));
		}

		const ticket = decodeURIComponent(ticketRaw).trim();
		if (!ticket) {
			if (debug) {
				return reply.code(400).send({ error: { status: 400, message: "Ticket SSO não fornecido." } });
			}
			return reply.code(400).type("text/html").send(renderSSOError("Link inválido", "Ticket SSO não fornecido."));
		}

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
					return reply.code(err.status).send({
						error: {
							status: err.status,
							message: err.message,
							retryAfter: err.retryAfter,
							raw: err.raw ?? null,
						},
					});
				}

				if (err.status === 401) {
					return reply
						.code(401)
						.type("text/html")
						.send(renderSSOError("Credenciais inválidas", "Erro de autenticação com o servidor SSO."));
				}
				if (err.status === 403) {
					return reply
						.code(403)
						.type("text/html")
						.send(renderSSOError("Acesso negado", "Você não tem permissão para acessar este recurso."));
				}
				if (err.status === 422) {
					return reply.code(422).type("text/html").send(
						renderSSOError(
							"Link expirado",
							"Seu link de acesso expirou ou já foi utilizado. Volte ao PayGas para gerar um novo.",
							{ label: "Voltar ao PayGas", url: "https://paygas.com.br" },
						),
					);
				}
				if (err.status === 429) {
					const retryAfter = err.retryAfter || 60;
					reply.header("Retry-After", String(retryAfter));
					return reply.code(429).type("text/html").send(renderSSOError("Muitas tentativas", `Tente novamente em ${retryAfter} segundos.`));
				}
				return reply
					.code(err.status)
					.type("text/html")
					.send(renderSSOError("Erro de comunicação", "Não foi possível conectar ao servidor. Tente novamente mais tarde."));
			}
			logger.error("[SSO] Erro inesperado na validação:", err);
			if (debug) {
				return reply.code(500).send({ error: { status: 500, message: "Erro interno inesperado." } });
			}
			return reply.code(500).type("text/html").send(renderSSOError("Erro interno", "Ocorreu um erro inesperado. Tente novamente."));
		}

		if (debug) {
			return reply.send(ssoRaw);
		}

		let user: Awaited<ReturnType<typeof findOrCreateSSOUser>>;
		try {
			user = await findOrCreateSSOUser(ssoData);
		} catch (err) {
			logger.error("[SSO] Erro ao criar/sincronizar usuário:", err);
			return reply
				.code(500)
				.type("text/html")
				.send(renderSSOError("Erro interno", "Ocorreu um erro ao processar seu acesso. Tente novamente."));
		}

		try {
			user = await ensureGestorAssigned(user);
		} catch (err) {
			logger.warn("[SSO] Erro ao atribuir gestor automaticamente:", err);
		}

		try {
			await awardLoginPointsDaily(user.id);
			await logActivity(user.id, "Login SSO", "Acesso via SSO PayGas");
			await drizzleDb.update("user", { id: user.id }, { lastLogin: new Date() });
		} catch (err) {
			logger.warn("[SSO] Erro ao registrar atividade:", err);
		}

		const token = jwt.sign({ userId: user.id, role: user.role, gestorId: user.gestorId || null }, JWT_SECRET, {
			expiresIn: "24h",
		});

		const appUrl = (process.env.APP_URL || "").replace(/\/+$/, "") || "";
		return reply.code(302).redirect(`${appUrl}/sso/callback?token=${encodeURIComponent(token)}`);
	});

	done();
};

export default ssoRoutes;
