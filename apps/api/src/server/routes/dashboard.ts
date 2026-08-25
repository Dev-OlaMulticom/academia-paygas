import { Router } from "express";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { authenticate } from "../middleware/auth";
import { getTeamPoints, getUserPoints } from "../services/gamification";

const router = Router();

// GET /api/dashboard
router.get("/", authenticate, async (req: any, res) => {
	try {
		const userId = req.userId;

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

		res.json({
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
		res.status(500).json({ error: "Erro ao buscar dashboard" });
	}
});

// GET /api/dashboard/leaderboard
router.get("/leaderboard", authenticate, async (req: any, res) => {
	try {
		const gestorId = req.userRole === "GESTOR" ? req.userId : undefined;
		const team = await getTeamPoints(gestorId);
		res.json(team);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar leaderboard" });
	}
});

export default router;
