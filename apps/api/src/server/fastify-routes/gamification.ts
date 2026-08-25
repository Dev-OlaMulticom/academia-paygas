import type { FastifyInstance, FastifyPluginCallback, FastifyRequest } from "fastify";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { authenticate } from "../fastify-plugins/auth";

const GAMIFICATION_ACHIEVEMENTS = [
	{
		id: "1",
		titulo: "Primeiro Passo",
		descricao: "Complete sua primeira aula",
		tipo: "AULA",
		meta: 1,
		xp: 100,
		icone: "🎯",
		cor: "#10b981",
	},
	{
		id: "2",
		titulo: "Foguete",
		descricao: "Alcance nível 5",
		tipo: "NIVEL",
		meta: 5,
		xp: 250,
		icone: "🚀",
		cor: "#3b82f6",
	},
	{
		id: "3",
		titulo: "Mestre do Filtro",
		descricao: "Complete todas as aulas do filtro",
		tipo: "CURSO",
		meta: 4,
		xp: 500,
		icone: "🏆",
		cor: "#f59e0b",
	},
	{
		id: "4",
		titulo: "Cientista de Dados",
		descricao: "Acerte 90% dos quizzes",
		tipo: "QUIZ",
		meta: 90,
		xp: 300,
		icone: "📊",
		cor: "#8b5cf6",
	},
	{
		id: "5",
		titulo: "Especialista",
		descricao: "Complete 5 módulos",
		tipo: "CURSO",
		meta: 5,
		xp: 750,
		icone: "⭐",
		cor: "#06b6d4",
	},
	{
		id: "6",
		titulo: "Lenda",
		descricao: "Alcance nível 20",
		tipo: "NIVEL",
		meta: 20,
		xp: 1000,
		icone: "👑",
		cor: "#ec4899",
	},
	{
		id: "7",
		titulo: "Guerreiro",
		descricao: "7 dias seguidos estudando",
		tipo: "STREAK",
		meta: 7,
		xp: 400,
		icone: "🔥",
		cor: "#ef4444",
	},
	{
		id: "8",
		titulo: "Colaborador",
		descricao: "Ajude 3 colegas no fórum",
		tipo: "FORUM",
		meta: 3,
		xp: 350,
		icone: "🤝",
		cor: "#14b8a6",
	},
];

/**
 * Gamification routes — migrated from Express routes/gamification.ts.
 * All endpoints require authentication.
 */
const gamificationRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	// GET /api/gamification/achievements
	fastify.get("/achievements", { preHandler: [authenticate] }, async (request: FastifyRequest, reply) => {
		try {
			const userId = request.userId!;

			const [totalAulasConcluidas, totalModulosConcluidos, totalQuizzes, user] = await Promise.all([
				drizzleDb.count("progresso", { userId, concluido: true }),
				drizzleDb
					.groupBy("progresso", { by: ["aulaId"], where: { userId, concluido: true } })
					.then((groups) => {
						const aulaIds = groups.map((g: any) => g.aulaId);
						return drizzleDb.findMany("aula", { where: { id: { in: aulaIds } }, select: { cursoId: true } });
					})
					.then((aulas: any[]) => new Set(aulas.map((a: any) => a.cursoId)).size),
				drizzleDb.count("quizResponse", { userId, concluido: true }),
				drizzleDb.findUnique("user", { id: userId }, { select: { xp: true, level: true } }),
			]);

			const results = GAMIFICATION_ACHIEVEMENTS.map((a) => {
				let progress = 0;
				let earned = false;

				switch (a.tipo) {
					case "AULA":
						progress = Math.min(totalAulasConcluidas, a.meta);
						earned = totalAulasConcluidas >= a.meta;
						break;
					case "NIVEL":
						progress = Math.min(user?.level || 0, a.meta);
						earned = (user?.level || 0) >= a.meta;
						break;
					case "CURSO":
						progress = Math.min(totalModulosConcluidos, a.meta);
						earned = totalModulosConcluidos >= a.meta;
						break;
					case "QUIZ":
						progress = totalQuizzes > 0 ? Math.round((totalQuizzes / Math.max(totalAulasConcluidas, 1)) * 100) : 0;
						earned = progress >= a.meta;
						break;
					case "STREAK":
						progress = 1;
						earned = false;
						break;
					case "FORUM":
						progress = 0;
						earned = false;
						break;
				}

				return {
					...a,
					earned,
					dataConquista: earned ? new Date().toISOString() : null,
					progresso: Math.round((progress / a.meta) * 100),
				};
			});

			return reply.send(results);
		} catch (error) {
			logger.error("[ACHIEVEMENTS ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar conquistas" });
		}
	});

	// GET /api/gamification/leaderboard
	fastify.get("/leaderboard", { preHandler: [authenticate] }, async (_request, reply) => {
		try {
			const users = await drizzleDb.findMany("user", {
				select: {
					id: true,
					nome: true,
					role: true,
					xp: true,
					level: true,
					avatarUrl: true,
					state: true,
				},
				orderBy: { xp: "desc" },
				take: 20,
			});

			const result = users.map((u: any, i: number) => ({
				pos: i + 1,
				userId: u.id,
				nome: u.nome,
				cargo: u.role,
				estado: u.state || "SP",
				xp: u.xp,
				nivel: u.level,
				avatar: u.avatarUrl,
			}));

			return reply.send(result);
		} catch (error) {
			logger.error("[LEADERBOARD ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar leaderboard" });
		}
	});

	// GET /api/gamification/stats
	fastify.get("/stats", { preHandler: [authenticate] }, async (request: FastifyRequest, reply) => {
		try {
			const userId = request.userId!;
			const user = await drizzleDb.findUnique("user", { id: userId }, { select: { xp: true, level: true } });

			const totalAulasConcluidas = await drizzleDb.count("progresso", { userId, concluido: true });
			const totalAulasGlobal = await drizzleDb.count("aula");

			const XP_PER_LEVEL = 2000;
			return reply.send({
				xpTotal: user?.xp || 0,
				nivelAtual: user?.level || 1,
				proximoNivel: (user?.level || 1) + 1,
				xpProximoNivel: XP_PER_LEVEL,
				xpRestante: XP_PER_LEVEL - ((user?.xp || 0) % XP_PER_LEVEL),
				aulasConcluidas: totalAulasConcluidas,
				percentualConclusao: totalAulasGlobal > 0 ? Math.round((totalAulasConcluidas / totalAulasGlobal) * 100) : 0,
				streak: 1,
			});
		} catch (error) {
			logger.error("[GAMIFICATION STATS ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar stats de gamificação" });
		}
	});

	done();
};

export default gamificationRoutes;
