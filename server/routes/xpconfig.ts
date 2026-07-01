import { Router } from "express";
import { db } from "../lib/db";
import logger from "../lib/logger";
import { prisma } from "../lib/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// GET /api/xp-config - Get all XP configuration
router.get("/", authenticate, async (_req, res) => {
	try {
		const configs = await prisma.xPConfig.findMany({
			orderBy: { action: "asc" },
		});
		res.json(configs);
	} catch (error) {
		logger.error("[XP CONFIG ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar configuração de XP" });
	}
});

// PUT /api/xp-config/:action - Update XP points for an action (ADMIN only)
router.put("/:action", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const action = String(req.params.action);
		const { points, label, description } = req.body;

		if (typeof points !== "number" || points < 0) {
			return res.status(400).json({ error: "points deve ser um número não negativo" });
		}

		const config = await db.upsert(
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

		res.json(config);
	} catch (error) {
		logger.error("[XP CONFIG UPDATE ERROR]", error);
		res.status(500).json({ error: "Erro ao atualizar configuração de XP" });
	}
});

// POST /api/xp-config - Create a new XP config entry (ADMIN only)
router.post("/", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const { action, label, points, description } = req.body;

		if (!action || !label || typeof points !== "number") {
			return res.status(400).json({ error: "action, label e points são obrigatórios" });
		}

		const existing = await prisma.xPConfig.findUnique({ where: { action } });
		if (existing) {
			return res.status(409).json({ error: "Esta ação já existe" });
		}

		const config = await db.create("xPConfig", {
			action,
			label,
			points,
			description: description || null,
		});

		res.status(201).json(config);
	} catch (error) {
		logger.error("[XP CONFIG CREATE ERROR]", error);
		res.status(500).json({ error: "Erro ao criar configuração de XP" });
	}
});

// DELETE /api/xp-config/:action - Remove an XP config entry (ADMIN only).
// Existing PointsTransaction rows keep the action string for historical
// purposes; only the configuration that controls new awards is removed.
router.delete("/:action", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const action = String(req.params.action);

		const existing = await prisma.xPConfig.findUnique({ where: { action } });
		if (!existing) {
			return res.status(404).json({ error: "Ação de XP não encontrada" });
		}

		await db.delete("xPConfig", { action });
		res.json({ success: true, action });
	} catch (error) {
		logger.error("[XP CONFIG DELETE ERROR]", error);
		res.status(500).json({ error: "Erro ao excluir configuração de XP" });
	}
});

export default router;
