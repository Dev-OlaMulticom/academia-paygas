import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { authenticate } from "../fastify-plugins/auth";
import { getTeamPoints, getUserPoints } from "../services/gamification";

/**
 * Dashboard routes — migrated from Express routes/dashboard.ts.
 * All endpoints require authentication.
 */
const dashboardRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	// GET /api/dashboard
	fastify.get("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const userId = request.userId!;

			const [
				totalModulos,
				cursosComProgresso,
				totalCertificados,
				totalAulas,
				aulasConcluidas,
				totalQuizzes,
				recentActivity,
				userPoints,
			] = await Promise.all([
				drizzleDb.count("curso"),
				drizzleDb.groupBy("progresso", {
					by: ["cursoId"],
					where: { userId, concluido: true },
				}),
				drizzleDb.count("certificate", { userId, status: "ISSUED" }),
				drizzleDb.count("aula"),
				drizzleDb.count("progresso", { userId, concluido: true }),
				drizzleDb.count("quizResponse", { userId, concluido: true }),
				drizzleDb.findMany("activityLog", {
					where: { userId },
					take: 5,
					orderBy: { createdAt: "desc" },
				}),
				getUserPoints(userId),
			]);

			const cursosConcluidos = cursosComProgresso.length;

			return reply.send({
				totalModulos,
				cursosConcluidos,
				totalCertificados,
				totalAulas,
				aulasConcluidas,
				totalQuizzes,
				percentual: totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0,
				xp: userPoints.totalXp,
				level: userPoints.level,
				recentActivity,
				pointsByAction: userPoints.byAction,
			});
		} catch (error) {
			logger.error("[ROUTE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar dashboard" });
		}
	});

	// GET /api/dashboard/leaderboard
	fastify.get("/leaderboard", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const gestorId = request.userRole === "GESTOR" ? request.userId : undefined;
			const team = await getTeamPoints(gestorId);
			return reply.send(team);
		} catch (error) {
			logger.error("[ROUTE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar leaderboard" });
		}
	});

	done();
};

export default dashboardRoutes;
