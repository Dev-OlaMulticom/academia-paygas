import { Router } from "express";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { type AuthRequest, authenticate, authorize } from "../middleware/auth";
import { getStringParam } from "../utils/queryParams";

const router = Router();

// GET /api/conquistas — list all conquistas (all roles)
router.get("/", authenticate, async (req: AuthRequest, res) => {
	try {
		const userId = req.userId!;
		const userRole = req.userRole!;

		const conquistas = await drizzleDb.findMany("conquista", {
			orderBy: { ordem: "asc" },
		});

		if (userRole === "ATENDENTE") {
			const user = await drizzleDb.findUnique("user", { id: userId });
			const userXp = user?.xp || 0;
			const userConquistas = await drizzleDb.findMany("userConquista", { where: { userId } });
			const earnedIds = new Set(userConquistas.map((uc: any) => uc.conquistaId));

			const filtered = conquistas
				.filter((c: any) => c.ativo)
				.map((c: any) => ({
					...c,
					earned: earnedIds.has(c.id),
					dataConquista: userConquistas.find((uc: any) => uc.conquistaId === c.id)?.dataConquista || null,
					progresso: userXp >= c.pontosMinimos ? 100 : Math.round((userXp / Math.max(c.pontosMinimos, 1)) * 100),
					disponivel: userXp >= c.pontosMinimos,
				}));

			return res.json(filtered);
		}

		const result = conquistas.map((c: any) => ({
			...c,
			earned: false,
			dataConquista: null,
			progresso: 0,
			disponivel: true,
		}));

		res.json(result);
	} catch (error) {
		logger.error("[CONQUISTAS LIST ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar conquistas" });
	}
});

// POST /api/conquistas — create conquista (ADMIN, GESTOR)
router.post("/", authenticate, authorize("ADMIN", "GESTOR"), async (req: AuthRequest, res) => {
	try {
		const { titulo, descricao, icone, cor, pontosMinimos, xpRecompensa, ativo, ordem } = req.body;
		if (!titulo || !descricao) {
			return res.status(400).json({ error: "Titulo e descricao sao obrigatorios" });
		}
		const conquista = await drizzleDb.create("conquista", {
			titulo,
			descricao,
			icone: icone || "🏆",
			cor: cor || "#F47C20",
			pontosMinimos: pontosMinimos || 0,
			xpRecompensa: xpRecompensa || 0,
			ativo: ativo !== false,
			ordem: ordem || 0,
		});
		res.status(201).json(conquista);
	} catch (error) {
		logger.error("[CONQUISTA CREATE ERROR]", error);
		res.status(500).json({ error: "Erro ao criar conquista" });
	}
});

// PUT /api/conquistas/:id — update conquista (ADMIN, GESTOR)
router.put("/:id", authenticate, authorize("ADMIN", "GESTOR"), async (req: AuthRequest, res) => {
	try {
		const { titulo, descricao, icone, cor, pontosMinimos, xpRecompensa, ativo, ordem } = req.body;
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "ID inválido" });
		const conquista = await drizzleDb.update(
			"conquista",
			{ id },
			{
				...(titulo !== undefined && { titulo }),
				...(descricao !== undefined && { descricao }),
				...(icone !== undefined && { icone }),
				...(cor !== undefined && { cor }),
				...(pontosMinimos !== undefined && { pontosMinimos }),
				...(xpRecompensa !== undefined && { xpRecompensa }),
				...(ativo !== undefined && { ativo }),
				...(ordem !== undefined && { ordem }),
			},
		);
		res.json(conquista);
	} catch (error) {
		logger.error("[CONQUISTA UPDATE ERROR]", error);
		res.status(500).json({ error: "Erro ao atualizar conquista" });
	}
});

// DELETE /api/conquistas/:id — delete conquista (ADMIN only)
router.delete("/:id", authenticate, authorize("ADMIN"), async (req: AuthRequest, res) => {
	try {
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "ID inválido" });
		await drizzleDb.deleteMany("userConquista", { conquistaId: id });
		await drizzleDb.delete("conquista", { id });
		res.json({ success: true });
	} catch (error) {
		logger.error("[CONQUISTA DELETE ERROR]", error);
		res.status(500).json({ error: "Erro ao excluir conquista" });
	}
});

// GET /api/conquistas/my — user's earned conquistas
router.get("/my", authenticate, async (req: AuthRequest, res) => {
	try {
		const userId = req.userId!;
		const [userConquistas, allConquistas] = await Promise.all([
			drizzleDb.findMany("userConquista", { where: { userId } }),
			drizzleDb.findMany("conquista"),
		]);
		const conquistaById = new Map(allConquistas.map((c: any) => [c.id, c]));
		res.json(
			userConquistas.map((uc: any) => {
				const c = conquistaById.get(uc.conquistaId);
				return {
					...c,
					dataConquista: uc.dataConquista,
				};
			}),
		);
	} catch (error) {
		logger.error("[MY CONQUISTAS ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar conquistas do usuario" });
	}
});

export default router;
