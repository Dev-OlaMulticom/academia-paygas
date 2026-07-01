import { Router } from "express";
import { db } from "../lib/db";
import logger from "../lib/logger";
import { authenticate } from "../middleware/auth";
import { awardPointsIfNotAwarded } from "../services/gamification";
import { logActivity } from "../services/log";

const router = Router();

// GET /api/progresso
router.get("/", authenticate, async (req: any, res) => {
	try {
		const progresso = await db.findMany("progresso", {
			where: { userId: req.userId },
		});
		res.json(progresso);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar progresso" });
	}
});

// PUT /api/progresso
router.put("/", authenticate, async (req: any, res) => {
	try {
		const { moduloId, aulaId, concluido } = req.body;
		if (!moduloId || !aulaId) {
			return res.status(400).json({ error: "moduloId e aulaId são obrigatórios" });
		}

		const existing = await db.findFirst("progresso", {
			moduloId,
			aulaId,
			userId: req.userId,
		});

		const progresso = await db.upsert(
			"progresso",
			{ moduloId_aulaId_userId: { moduloId, aulaId, userId: req.userId } },
			{ moduloId, aulaId, userId: req.userId, concluido: concluido !== false },
			{ concluido: concluido !== false },
		);

		// Award points for lesson completion (only if newly completed)
		if (!existing?.concluido && concluido !== false) {
			const aula = (await db.findUnique("aula", { id: aulaId })) as any;
			await awardPointsIfNotAwarded(req.userId, "LESSON_COMPLETE", `LESSON_COMPLETE:aula:${aulaId}`);
			await logActivity(req.userId, "Aula Concluida", `Aula: ${aula?.titulo || aulaId}`);

			// Check if all aulas in the modulo are completed
			const modulo = (await db.findUnique("modulo", { id: moduloId })) as any;
			if (modulo) {
				const completedCount = await db.count("progresso", {
					moduloId,
					userId: req.userId,
					concluido: true,
				});

				if (completedCount >= modulo.aulas?.length) {
					await awardPointsIfNotAwarded(req.userId, "MODULE_COMPLETE", `MODULE_COMPLETE:modulo:${moduloId}`);
					await logActivity(req.userId, "Modulo Concluido", `Modulo: ${modulo.titulo}`);
				}
			}
		}

		res.json(progresso);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao atualizar progresso" });
	}
});

// GET /api/progresso/stats
router.get("/stats", authenticate, async (req: any, res) => {
	try {
		const totalAulas = await db.count("aula");
		const concluidas = await db.count("progresso", {
			userId: req.userId,
			concluido: true,
		});

		const modulosIniciados = await db.groupBy("progresso", {
			by: ["moduloId"],
			where: { userId: req.userId },
		});

		const user = (await db.findUnique("user", { id: req.userId })) as any;

		res.json({
			totalAulas,
			concluidas,
			percentual: totalAulas > 0 ? Math.round((concluidas / totalAulas) * 100) : 0,
			modulosIniciados: modulosIniciados.length,
			xp: user?.xp || 0,
		});
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar estatísticas" });
	}
});

// POST /api/progresso/restart-request — user requests restart of module/aula progress
router.post("/restart-request", authenticate, async (req: any, res) => {
	try {
		const { moduloId, aulaId } = req.body;
		if (!moduloId) return res.status(400).json({ error: "moduloId é obrigatório" });

		const user = (await db.findUnique("user", { id: req.userId })) as any;
		if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

		const modulo = (await db.findUnique("modulo", { id: moduloId })) as any;
		const moduloTitulo = modulo?.titulo || moduloId;

		// Determine recipient: gestor or admin
		let targetId = user.gestorId;
		let targetType = "GESTOR";
		if (!targetId) {
			// No gestor — find first admin
			const admin = await db.findFirst("user", { role: "ADMIN" }, { select: { id: true } });
			targetId = admin?.id || null;
			targetType = "ADMIN";
		}

		if (!targetId) {
			return res.status(400).json({ error: "Nenhum gestor ou administrador disponível para receber a solicitação" });
		}

		const scope = aulaId ? `aula "${moduloTitulo}"` : `modulo "${moduloTitulo}"`;
		const titulo = `Solicitação de Reinício`;
		const mensagem = `${user.nome} (${user.role}) solicitou reinício de progresso da ${scope}.`;

		await db.create("notification", {
			fromId: req.userId,
			toId: targetId,
			titulo,
			mensagem,
			data: JSON.stringify({
				type: "restart-request",
				moduloId,
				moduloTitulo,
				userId: req.userId,
				userName: user.nome,
			}),
		});

		await logActivity(req.userId, "Solicitação Reinício", `Solicitou reinício da ${scope}`);

		res.status(201).json({ success: true, sentTo: targetType });
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao enviar solicitação" });
	}
});

// PUT /api/progresso/restart — gestor/admin approves and restarts progress
router.put("/restart", authenticate, async (req: any, res) => {
	try {
		const { userId, moduloId, aulaId } = req.body;
		if (!userId || !moduloId) {
			return res.status(400).json({ error: "userId e moduloId são obrigatórios" });
		}

		const requester = (await db.findUnique("user", { id: req.userId })) as any;
		const targetUser = (await db.findUnique("user", { id: userId })) as any;
		if (!targetUser) return res.status(404).json({ error: "Usuário alvo não encontrado" });

		// Authorization: ADMIN can restart anyone, GESTOR only their team
		if (requester.role === "GESTOR" && targetUser.gestorId !== req.userId) {
			return res.status(403).json({ error: "Sem permissão para reiniciar este usuário" });
		}

		const where: any = { userId, moduloId };
		if (aulaId) where.aulaId = aulaId;

		// Logical restart: mark as restarted, increment count, set concluido=false
		const result = await db.updateMany("progresso", where, {
			concluido: false,
			reiniciado: true,
			restartCount: { increment: 1 },
		});

		const modulo = (await db.findUnique("modulo", { id: moduloId })) as any;
		const scope = aulaId ? `aula` : `modulo "${modulo?.titulo || moduloId}"`;
		await logActivity(req.userId, "Reinício Aprovado", `Reiniciou progresso de ${scope} para ${targetUser.nome}`);

		// Notify the user that their restart was approved
		await db.create("notification", {
			fromId: req.userId,
			toId: userId,
			titulo: "Reinício Aprovado",
			mensagem: `Seu pedido de reinício do ${scope} foi aprovado. Você pode recomeçar do zero.`,
		});

		res.json({ success: true, updated: result.count });
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao reiniciar progresso" });
	}
});

export default router;
