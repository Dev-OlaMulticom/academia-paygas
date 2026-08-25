import type { FastifyInstance, FastifyPluginCallback } from "fastify";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";

/**
 * GET /api/public/stats
 * Public stats — no auth required.
 */
const publicRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	fastify.get("/stats", async (_request, reply) => {
		try {
			const [totalUsers, totalModulos, totalAulas, totalCertificates] = await Promise.all([
				drizzleDb.count("user"),
				drizzleDb.count("curso"),
				drizzleDb.count("aula"),
				drizzleDb.count("certificate"),
			]);

			return reply.send({
				alunos: totalUsers,
				horas: totalAulas * 2,
				notas: totalModulos,
				certificados: totalCertificates,
			});
		} catch (error) {
			logger.error("[PUBLIC STATS ERROR]", error);
			return reply.code(500).send({
				alunos: 0,
				horas: 0,
				notas: 0,
				certificados: 0,
			});
		}
	});

	fastify.get("/config", async (_request, reply) => {
		try {
			return reply.send({
				xpPerLevel: 2000,
				version: "V27",
				platform: "Academia PayGas",
			});
		} catch (_error) {
			return reply.code(500).send({ error: "Erro ao buscar config" });
		}
	});

	done();
};

export default publicRoutes;
