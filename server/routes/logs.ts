import { Router } from "express";
import { db } from "../lib/db";
import logger from "../lib/logger";
import { authenticate, authorize } from "../middleware/auth";
import { logActivity } from "../services/log";

const router = Router();

// GET /api/logs - List all activity logs (ADMIN only)
// Query params: userId, startDate, endDate, acao, page, limit
router.get("/", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
		const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
		const skip = (page - 1) * limit;

		const where: any = {};

		if (req.query.userId) {
			where.userId = req.query.userId;
		}

		if (req.query.acao) {
			where.acao = { contains: req.query.acao, mode: "insensitive" };
		}

		if (req.query.startDate || req.query.endDate) {
			where.createdAt = {};
			if (req.query.startDate) {
				where.createdAt.gte = new Date(req.query.startDate as string);
			}
			if (req.query.endDate) {
				where.createdAt.lte = new Date(`${req.query.endDate as string}T23:59:59.999Z`);
			}
		}

		const [logs, total] = await Promise.all([
			db.findMany("activityLog", {
				where,
				include: {
					user: {
						select: { id: true, nome: true, email: true, role: true },
					},
				},
				orderBy: { createdAt: "desc" },
				skip,
				take: limit,
			}),
			db.count("activityLog", where),
		]);

		res.json({
			data: logs,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar logs de atividade" });
	}
});

// GET /api/logs/users - List users with activity summary (ADMIN only)
router.get("/users", authenticate, authorize("ADMIN"), async (_req: any, res) => {
	try {
		const users = await db.findMany("user", {
			select: {
				id: true,
				nome: true,
				email: true,
				role: true,
				createdAt: true,
				lastLogin: true,
				_count: { select: { activityLogs: true } },
			},
			orderBy: { nome: "asc" },
		});

		res.json(users);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar usuários" });
	}
});

// DELETE /api/logs/:id - Delete a single activity log (ADMIN only)
router.delete("/:id", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const id = String(req.params.id);
		if (!id) return res.status(400).json({ error: "ID inválido" });

		const existing = await db.findUnique("activityLog", { id });
		if (!existing) return res.status(404).json({ error: "Registro de log não encontrado" });

		await db.delete("activityLog", { id });
		res.json({ success: true });
	} catch (error) {
		logger.error("[LOG DELETE ERROR]", error);
		res.status(500).json({ error: "Erro ao excluir registro" });
	}
});

// DELETE /api/logs - Bulk delete activity logs (ADMIN only)
// Body: { userId?, acao?, startDate?, endDate? }
// Requires at least one filter to prevent accidental wipe.
router.delete("/", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const { userId, acao, startDate, endDate } = req.body || {};

		if (!userId && !acao && !startDate && !endDate) {
			return res.status(400).json({
				error: "Aplique ao menos um filtro (userId, acao, startDate, endDate) para exclusão em massa",
			});
		}

		const where: any = {};
		if (userId) where.userId = userId;
		if (acao) where.acao = { contains: acao, mode: "insensitive" };
		if (startDate || endDate) {
			where.createdAt = {};
			if (startDate) where.createdAt.gte = new Date(startDate);
			if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
		}

		const result = await db.deleteMany("activityLog", where);

		if (req.userId) {
			await logActivity(req.userId, "Excluir Logs", `Bulk delete: ${result.count} registros`);
		}

		res.json({ success: true, deleted: result.count });
	} catch (error) {
		logger.error("[LOG BULK DELETE ERROR]", error);
		res.status(500).json({ error: "Erro ao excluir registros" });
	}
});

// GET /api/logs/stats - Activity stats summary (ADMIN only)
router.get("/stats", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const where: any = {};

		if (req.query.startDate || req.query.endDate) {
			where.createdAt = {};
			if (req.query.startDate) {
				where.createdAt.gte = new Date(req.query.startDate as string);
			}
			if (req.query.endDate) {
				where.createdAt.lte = new Date(`${req.query.endDate as string}T23:59:59.999Z`);
			}
		}

		const [totalLogs, byAction, byUser] = await Promise.all([
			db.count("activityLog", where),
			db.groupBy("activityLog", {
				by: ["acao"],
				where,
				_count: { id: true },
				orderBy: { _count: { id: "desc" } },
				take: 20,
			}),
			db.groupBy("activityLog", {
				by: ["userId"],
				where,
				_count: { id: true },
				orderBy: { _count: { id: "desc" } },
				take: 10,
			}),
		]);

		const userIds = byUser.map((b: any) => b.userId);
		const users = await db.findMany("user", {
			where: { id: { in: userIds } },
			select: { id: true, nome: true, email: true, role: true },
		});

		const userMap = new Map(users.map((u: any) => [u.id, u]));

		res.json({
			totalLogs,
			byAction: byAction.map((b: any) => ({ acao: b.acao, count: b._count.id })),
			byUser: byUser.map((b: any) => ({
				...(userMap.get(b.userId) || {}),
				count: b._count.id,
			})),
		});
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar estatísticas" });
	}
});

export default router;
