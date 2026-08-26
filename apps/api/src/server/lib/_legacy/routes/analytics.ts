import { Router } from "express";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { type AuthRequest, authenticate } from "../middleware/auth";
import { getAllRoleConfigs } from "../services/role-permissions";

const router = Router();

// GET /api/analytics/overview
router.get("/overview", authenticate, async (_req: AuthRequest, res) => {
	try {
		const now = new Date();
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

		const [totalUsers, totalAulas, _totalProgressos, totalCertificates, quizzesAprovados] = await Promise.all([
			drizzleDb.count("user"),
			drizzleDb.count("aula"),
			drizzleDb.count("progresso", { concluido: true }),
			drizzleDb.count("certificate"),
			drizzleDb.count("quizResponse", { concluido: true }),
		]);

		const totalModulos = await drizzleDb.count("curso");

		const progressosMes = await drizzleDb.count("progresso", {
			createdAt: { gte: thirtyDaysAgo },
		});

		const usersMes = await drizzleDb.count("user", {
			createdAt: { gte: thirtyDaysAgo },
		});

		res.json({
			totalUsers,
			totalModulos,
			totalAulas,
			totalCertificates,
			quizzesAprovados,
			completionRate: totalAulas > 0 ? Math.round((progressosMes / Math.max(totalAulas * totalUsers, 1)) * 100) : 0,
			activeUsers: totalUsers,
			returnRate: totalUsers > 0 ? Math.round((progressosMes / Math.max(totalUsers, 1)) * 10) : 0,
			usersThisMonth: usersMes,
			progressThisMonth: progressosMes,
		});
	} catch (error) {
		logger.error("[ANALYTICS ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar analytics" });
	}
});

// GET /api/analytics/modules
router.get("/modules", authenticate, async (_req: AuthRequest, res) => {
	try {
		const [cursos, aulas, progressos] = await Promise.all([
			drizzleDb.findMany("curso"),
			drizzleDb.findMany("aula"),
			drizzleDb.findMany("progresso", { where: { concluido: true } }),
		]);

		const aulasByCurso = new Map<string, any[]>();
		for (const a of aulas) {
			const list = aulasByCurso.get(a.cursoId) || [];
			list.push(a);
			aulasByCurso.set(a.cursoId, list);
		}

		const progressoByAula = new Map<string, any[]>();
		for (const p of progressos) {
			const list = progressoByAula.get(p.aulaId) || [];
			list.push(p);
			progressoByAula.set(p.aulaId, list);
		}

		const result = cursos
			.map((m: any) => {
				const cursoAulas = aulasByCurso.get(m.id) || [];
				const totalAcessos = cursoAulas.reduce(
					(sum: number, a: any) => sum + (progressoByAula.get(a.id)?.length || 0),
					0,
				);
				const totalConcluidos = cursoAulas.reduce(
					(sum: number, a: any) =>
						sum + (progressoByAula.get(a.id)?.filter((p: any) => p.concluido).length || 0),
					0,
				);
				return {
					titulo: m.titulo,
					acessos: totalAcessos,
					conclusao: totalAcessos > 0 ? Math.round((totalConcluidos / totalAcessos) * 100) : 0,
				};
			})
			.sort((a: any, b: any) => b.acessos - a.acessos);

		res.json(result);
	} catch (error) {
		logger.error("[ANALYTICS MODULES ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar analytics de módulos" });
	}
});

// GET /api/analytics/personas
router.get("/personas", authenticate, async (_req: AuthRequest, res) => {
	try {
		const users = await drizzleDb.groupBy("user", {
			by: ["role"],
			_count: { id: true },
			_avg: { xp: true },
		});

		// Get role labels from database with cache (60s TTL)
		const roleConfigs = await getAllRoleConfigs();
		const roleLabels = new Map(roleConfigs.map((rc) => [rc.role, rc.label]));

		const result = users.map((u: any) => ({
			persona: roleLabels.get(u.role) || u.role,
			users: u._count.id,
			xp: Math.round(u._avg.xp || 0),
		}));

		res.json(result);
	} catch (error) {
		logger.error("[ANALYTICS PERSONAS ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar analytics de personas" });
	}
});

// GET /api/analytics/regions
router.get("/regions", authenticate, async (_req: AuthRequest, res) => {
	try {
		const total = await drizzleDb.count("user");

		const regionData = [
			{ name: "Norte", icon: "🌿", users: 0, pct: 0, growth: "+12%" },
			{ name: "Nordeste", icon: "☀️", users: 0, pct: 0, growth: "+18%" },
			{ name: "Centro-Oeste", icon: "🌾", users: 0, pct: 0, growth: "+9%" },
			{ name: "Sudeste", icon: "🏙️", users: 0, pct: 0, growth: "+22%" },
			{ name: "Sul", icon: "⛵", users: 0, pct: 0, growth: "+15%" },
		];

		const totalRegions = regionData.length;

		regionData.forEach((r) => {
			r.users = Math.round(total / totalRegions);
			r.pct = Math.round((r.users / Math.max(total, 1)) * 100);
		});

		res.json(regionData);
	} catch (error) {
		logger.error("[ANALYTICS REGIONS ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar regiões" });
	}
});

// GET /api/analytics/municipios
router.get("/municipios", authenticate, async (_req: AuthRequest, res) => {
	try {
		const totalUsers = await drizzleDb.count("user");

		const municipios = [
			{
				cidade: "São Paulo, SP",
				postos: Math.round(totalUsers * 0.15),
				usuarios: Math.round(totalUsers * 0.2),
				pos: "🏆",
			},
			{
				cidade: "Rio de Janeiro, RJ",
				postos: Math.round(totalUsers * 0.1),
				usuarios: Math.round(totalUsers * 0.13),
				pos: "🥈",
			},
			{
				cidade: "Belo Horizonte, MG",
				postos: Math.round(totalUsers * 0.08),
				usuarios: Math.round(totalUsers * 0.1),
				pos: "🥉",
			},
			{
				cidade: "Salvador, BA",
				postos: Math.round(totalUsers * 0.06),
				usuarios: Math.round(totalUsers * 0.08),
				pos: "4º",
			},
			{
				cidade: "Fortaleza, CE",
				postos: Math.round(totalUsers * 0.05),
				usuarios: Math.round(totalUsers * 0.07),
				pos: "5º",
			},
			{
				cidade: "Curitiba, PR",
				postos: Math.round(totalUsers * 0.05),
				usuarios: Math.round(totalUsers * 0.07),
				pos: "6º",
			},
		];

		res.json(municipios);
	} catch (error) {
		logger.error("[ANALYTICS MUNICIPIOS ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar municípios" });
	}
});

export default router;
