import type { FastifyInstance, FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import { authenticate } from "../fastify-plugins/auth";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { getTeamXp, getUserXp } from "../services/gamification";

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
				userXp,
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
				getUserXp(userId),
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
				xp: userXp.totalXp,
				level: userXp.level,
				recentActivity,
				xpByAction: userXp.byAction,
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
			const team = await getTeamXp(gestorId);
			return reply.send(team);
		} catch (error) {
			logger.error("[ROUTE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar leaderboard" });
		}
	});

	done();
};

export default dashboardRoutes;
