import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { authenticate, authorize } from "../fastify-plugins/auth";
import { logActivity } from "../services/log";

/**
 * Modules routes — migrated from Express routes/modules.ts.
 * GET requires auth; PUT requires ADMIN.
 */
const modulesRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	// Default module configs (inserted if not exists)
	const DEFAULT_MODULES = [
		{ key: "dashboard", label: "Dashboard" },
		{ key: "trilhas", label: "Trilhas de Aprendizado" },
		{ key: "certificados", label: "Certificados" },
		{ key: "cms", label: "Gestao de Conteudo" },
		{ key: "equipe", label: "Equipes" },
		{ key: "usuarios", label: "Usuarios" },
		{ key: "relatorios", label: "Relatorios" },
		{ key: "notificacoes", label: "Notificacoes" },
		{ key: "perfil", label: "Meu Perfil" },
		{ key: "forum", label: "Forum" },
		{ key: "analytics", label: "Analytics" },
		{ key: "ranking", label: "Ranking Nacional" },
		{ key: "mapa", label: "Mapa Nacional" },
		{ key: "nacional", label: "Painel Nacional" },
		{ key: "conquistas", label: "Conquistas" },
	];

	// GET /api/admin/modules/enabled - Get only enabled module keys
	fastify.get(
		"/enabled",
		{ preHandler: [authenticate] },
		async (_request: FastifyRequest, reply: FastifyReply) => {
			try {
				const modules = await drizzleDb.findMany("moduleConfig", {
					where: { enabled: true },
					select: { key: true },
				});
				return reply.send(modules.map((m: any) => m.key));
			} catch (error) {
				logger.error("[MODULES ENABLED ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar cursos ativos" });
			}
		},
	);

	// GET /api/admin/modules - Get all module configs (any authenticated user)
	fastify.get("/", { preHandler: [authenticate] }, async (_request: FastifyRequest, reply: FastifyReply) => {
		try {
			// Ensure all default modules exist via DAL dual-write
			for (const mod of DEFAULT_MODULES) {
				await drizzleDb.upsert("moduleConfig", { key: mod.key }, mod, {});
			}

			const modules = await drizzleDb.findMany("moduleConfig", {
				orderBy: { key: "asc" },
			});

			return reply.send(modules);
		} catch (error) {
			logger.error("[MODULES ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar configuracao de cursos" });
		}
	});

	// PUT /api/admin/modules/:key - Toggle module on/off (admin only)
	fastify.put(
		"/:key",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const key = String((request.params as any).key);
				const { enabled } = request.body as any;

				if (typeof enabled !== "boolean") {
					return reply.code(400).send({ error: 'Campo "enabled" deve ser boolean' });
				}

				// Prevent disabling critical modules
				const criticalModules = ["dashboard", "trilhas", "notificacoes", "perfil"];
				if (!enabled && criticalModules.includes(key)) {
					return reply.code(400).send({ error: `O curso "${key}" nao pode ser desativado` });
				}

				const module = await drizzleDb.upsert("moduleConfig", { key }, { key, label: String(key), enabled }, { enabled });

				await logActivity(request.userId!, "Curso Toggle", `${key}: ${enabled ? "ativado" : "desativado"}`);
				return reply.send(module);
			} catch (error) {
				logger.error("[MODULE TOGGLE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao atualizar curso" });
			}
		},
	);

	done();
};

export default modulesRoutes;
