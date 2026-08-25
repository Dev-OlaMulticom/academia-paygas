import type { FastifyInstance, FastifyPluginCallback, FastifyRequest } from "fastify";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { authenticate, authorize } from "../fastify-plugins/auth";

/**
 * Conquistas routes — migrated from Express routes/conquistas.ts.
 * GET requires auth; POST/PUT require ADMIN/GESTOR; DELETE requires ADMIN.
 */
const conquistasRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	// GET /api/conquistas — list all conquistas (all roles)
	fastify.get("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply) => {
		try {
			const userId = request.userId!;
			const userRole = request.userRole!;

			const conquistas = await drizzleDb.findMany("conquista", {
				orderBy: { ordem: "asc" },
			});

			if (userRole === "ATENDENTE") {
				const user = await drizzleDb.findUnique("user", { id: userId });
				const userXp = user?.xp || 0;
				const userConquistas = await drizzleDb.findMany("userConquista", { where: { userId } });
				const earnedIds = new Set(userConquistas.map((uc: any) => uc.conquistaId));

				const filtered = conquistas
					.filter((c: any) => c.ativo)
					.map((c: any) => ({
						...c,
						earned: earnedIds.has(c.id),
						dataConquista: userConquistas.find((uc: any) => uc.conquistaId === c.id)?.dataConquista || null,
						progresso: userXp >= c.pontosMinimos ? 100 : Math.round((userXp / Math.max(c.pontosMinimos, 1)) * 100),
						disponivel: userXp >= c.pontosMinimos,
					}));

				return reply.send(filtered);
			}

			const result = conquistas.map((c: any) => ({
				...c,
				earned: false,
				dataConquista: null,
				progresso: 0,
				disponivel: true,
			}));

			return reply.send(result);
		} catch (error) {
			logger.error("[CONQUISTAS LIST ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar conquistas" });
		}
	});

	// POST /api/conquistas — create conquista (ADMIN, GESTOR)
	fastify.post(
		"/",
		{ preHandler: [authenticate, authorize("ADMIN", "GESTOR")] },
		async (request: FastifyRequest, reply) => {
			try {
				const { titulo, descricao, icone, cor, pontosMinimos, xpRecompensa, ativo, ordem } = request.body as any;
				if (!titulo || !descricao) {
					return reply.code(400).send({ error: "Titulo e descricao sao obrigatorios" });
				}
				const conquista = await drizzleDb.create("conquista", {
					titulo,
					descricao,
					icone: icone || "🏆",
					cor: cor || "#F47C20",
					pontosMinimos: pontosMinimos || 0,
					xpRecompensa: xpRecompensa || 0,
					ativo: ativo !== false,
					ordem: ordem || 0,
				});
				return reply.code(201).send(conquista);
			} catch (error) {
				logger.error("[CONQUISTA CREATE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao criar conquista" });
			}
		},
	);

	// PUT /api/conquistas/:id — update conquista (ADMIN, GESTOR)
	fastify.put(
		"/:id",
		{ preHandler: [authenticate, authorize("ADMIN", "GESTOR")] },
		async (request: FastifyRequest, reply) => {
			try {
				const { titulo, descricao, icone, cor, pontosMinimos, xpRecompensa, ativo, ordem } = request.body as any;
				const id = (request.params as any).id as string;
				if (!id) return reply.code(400).send({ error: "ID inválido" });
				const conquista = await drizzleDb.update(
					"conquista",
					{ id },
					{
						...(titulo !== undefined && { titulo }),
						...(descricao !== undefined && { descricao }),
						...(icone !== undefined && { icone }),
						...(cor !== undefined && { cor }),
						...(pontosMinimos !== undefined && { pontosMinimos }),
						...(xpRecompensa !== undefined && { xpRecompensa }),
						...(ativo !== undefined && { ativo }),
						...(ordem !== undefined && { ordem }),
					},
				);
				return reply.send(conquista);
			} catch (error) {
				logger.error("[CONQUISTA UPDATE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao atualizar conquista" });
			}
		},
	);

	// DELETE /api/conquistas/:id — delete conquista (ADMIN only)
	fastify.delete(
		"/:id",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply) => {
			try {
				const id = (request.params as any).id as string;
				if (!id) return reply.code(400).send({ error: "ID inválido" });
				await drizzleDb.deleteMany("userConquista", { conquistaId: id });
				await drizzleDb.delete("conquista", { id });
				return reply.send({ success: true });
			} catch (error) {
				logger.error("[CONQUISTA DELETE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao excluir conquista" });
			}
		},
	);

	// GET /api/conquistas/my — user's earned conquistas
	fastify.get("/my", { preHandler: [authenticate] }, async (request: FastifyRequest, reply) => {
		try {
			const userId = request.userId!;
			const [userConquistas, allConquistas] = await Promise.all([
				drizzleDb.findMany("userConquista", { where: { userId } }),
				drizzleDb.findMany("conquista"),
			]);
			const conquistaById = new Map(allConquistas.map((c: any) => [c.id, c]));
			return reply.send(
				userConquistas.map((uc: any) => {
					const c = conquistaById.get(uc.conquistaId);
					return {
						...c,
						dataConquista: uc.dataConquista,
					};
				}),
			);
		} catch (error) {
			logger.error("[MY CONQUISTAS ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar conquistas do usuario" });
		}
	});

	done();
};

export default conquistasRoutes;
