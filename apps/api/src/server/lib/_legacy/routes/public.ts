import { Router } from "express";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";

const router = Router();

// GET /api/public/stats
router.get("/stats", async (_req, res) => {
	try {
		const [totalUsers, totalModulos, totalAulas, totalCertificates] = await Promise.all([
			drizzleDb.count("user"),
			drizzleDb.count("curso"),
			drizzleDb.count("aula"),
			drizzleDb.count("certificate"),
		]);

		res.json({
			alunos: totalUsers,
			horas: totalAulas * 2,
			notas: totalModulos,
			certificados: totalCertificates,
		});
	} catch (error) {
		logger.error("[PUBLIC STATS ERROR]", error);
		res.status(500).json({
			alunos: 0,
			horas: 0,
			notas: 0,
			certificados: 0,
		});
	}
});

// GET /api/public/config
router.get("/config", async (_req, res) => {
	try {
		res.json({
			xpPerLevel: 2000,
			version: "V27",
			platform: "Academia PayGas",
		});
	} catch (_error) {
		res.status(500).json({ error: "Erro ao buscar config" });
	}
});

export default router;
