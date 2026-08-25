import type { FastifyInstance, FastifyPluginCallback, FastifyRequest } from "fastify";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { authenticate, authorize } from "../fastify-plugins/auth";

/**
 * XP Config routes — migrated from Express routes/xpconfig.ts.
 * GET requires auth; POST/PUT/DELETE require ADMIN.
 */
const xpconfigRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	// GET /api/xp-config - Get all XP configuration
	fastify.get("/", { preHandler: [authenticate] }, async (_request, reply) => {
		try {
			const configs = await drizzleDb.findMany("xPConfig", {
				orderBy: { action: "asc" },
			});
			return reply.send(configs);
		} catch (error) {
			logger.error("[XP CONFIG ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar configuração de XP" });
		}
	});

	// PUT /api/xp-config/:action - Update XP points for an action (ADMIN only)
	fastify.put(
		"/:action",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply) => {
			try {
				const action = String((request.params as any).action);
				const { points, label, description } = request.body as any;

				if (typeof points !== "number" || points < 0) {
					return reply.code(400).send({ error: "points deve ser um número não negativo" });
				}

				const config = await drizzleDb.upsert(
					"xPConfig",
					{ action },
					{
						action,
						label: label || action,
						points,
						description: description || null,
					},
					{
						points,
						...(label ? { label } : {}),
						...(description !== undefined ? { description } : {}),
					},
				);

				return reply.send(config);
			} catch (error) {
				logger.error("[XP CONFIG UPDATE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao atualizar configuração de XP" });
			}
		},
	);

	// POST /api/xp-config - Create a new XP config entry (ADMIN only)
	fastify.post(
		"/",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply) => {
			try {
				const { action, label, points, description } = request.body as any;

				if (!action || !label || typeof points !== "number") {
					return reply.code(400).send({ error: "action, label e points são obrigatórios" });
				}

				const existing = await drizzleDb.findUnique("xPConfig", { action });
				if (existing) {
					return reply.code(409).send({ error: "Esta ação já existe" });
				}

				const config = await drizzleDb.create("xPConfig", {
					action,
					label,
					points,
					description: description || null,
				});

				return reply.code(201).send(config);
			} catch (error) {
				logger.error("[XP CONFIG CREATE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao criar configuração de XP" });
			}
		},
	);

	// DELETE /api/xp-config/:action - Remove an XP config entry (ADMIN only)
	fastify.delete(
		"/:action",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply) => {
			try {
				const action = String((request.params as any).action);

				const existing = await drizzleDb.findUnique("xPConfig", { action });
				if (!existing) {
					return reply.code(404).send({ error: "Ação de XP não encontrada" });
				}

				await drizzleDb.delete("xPConfig", { action });
				return reply.send({ success: true, action });
			} catch (error) {
				logger.error("[XP CONFIG DELETE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao excluir configuração de XP" });
			}
		},
	);

	done();
};

export default xpconfigRoutes;
