import { Router } from "express";
import { db } from "../lib/db";
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
			modulosComProgresso,
			totalCertificados,
			totalAulas,
			aulasConcluidas,
			totalQuizzes,
			recentActivity,
			userPoints,
		] = await Promise.all([
			db.count("modulo"),
			db.groupBy("progresso", {
				by: ["moduloId"],
				where: { userId, concluido: true },
			}),
			db.count("certificate", { userId, status: "ISSUED" }),
			db.count("aula"),
			db.count("progresso", { userId, concluido: true }),
			db.count("quizResponse", { userId, concluido: true }),
			db.findMany("activityLog", {
				where: { userId },
				take: 5,
				orderBy: { createdAt: "desc" },
			}),
			getUserPoints(userId),
		]);

		const modulosConcluidos = modulosComProgresso.length;

		res.json({
			totalModulos,
			modulosConcluidos,
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
