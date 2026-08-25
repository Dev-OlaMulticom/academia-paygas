import { Router } from "express";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { type AuthRequest, authenticate, authorize } from "../middleware/auth";
import { logActivity } from "../services/log";

const router = Router();

// Default module configs (inserted if not exists)
const DEFAULT_MODULES = [
	{ key: "dashboard", label: "Dashboard" },
	{ key: "trilhas", label: "Trilhas de Aprendizado" },
	{ key: "certificados", label: "Certificados" },
	{ key: "cms", label: "Gestao de Conteudo" },
	{ key: "equipe", label: "Equipes" },
	{ key: "usuarios", label: "Usuarios" },
	{ key: "relatorios", label: "Relatorios" },
	{ key: "notificacoes", label: "Notificacoes" },
	{ key: "perfil", label: "Meu Perfil" },
	{ key: "forum", label: "Forum" },
	{ key: "analytics", label: "Analytics" },
	{ key: "ranking", label: "Ranking Nacional" },
	{ key: "mapa", label: "Mapa Nacional" },
	{ key: "nacional", label: "Painel Nacional" },
	{ key: "conquistas", label: "Conquistas" },
];

// GET /api/admin/modules - Get all module configs (any authenticated user)
router.get("/", authenticate, async (_req: AuthRequest, res) => {
	try {
		// Ensure all default modules exist via DAL dual-write
		for (const mod of DEFAULT_MODULES) {
			await drizzleDb.upsert("moduleConfig", { key: mod.key }, mod, {});
		}

		const modules = await drizzleDb.findMany("moduleConfig", {
			orderBy: { key: "asc" },
		});

		res.json(modules);
	} catch (error) {
		logger.error("[MODULES ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar configuracao de cursos" });
	}
});

// PUT /api/admin/modules/:key - Toggle module on/off (admin only)
router.put("/:key", authenticate, authorize("ADMIN"), async (req: AuthRequest, res) => {
	try {
		const key = String(req.params.key);
		const { enabled } = req.body;

		if (typeof enabled !== "boolean") {
			return res.status(400).json({ error: 'Campo "enabled" deve ser boolean' });
		}

		// Prevent disabling critical modules
		const criticalModules = ["dashboard", "trilhas", "notificacoes", "perfil"];
		if (!enabled && criticalModules.includes(key)) {
			return res.status(400).json({ error: `O curso "${key}" nao pode ser desativado` });
		}

		const module = await drizzleDb.upsert("moduleConfig", { key }, { key, label: String(key), enabled }, { enabled });

		await logActivity(req.userId!, "Curso Toggle", `${key}: ${enabled ? "ativado" : "desativado"}`);
		res.json(module);
	} catch (error) {
		logger.error("[MODULE TOGGLE ERROR]", error);
		res.status(500).json({ error: "Erro ao atualizar curso" });
	}
});

// GET /api/admin/modules/enabled - Get only enabled module keys (public-ish, for sidebar)
router.get("/enabled", authenticate, async (_req: AuthRequest, res) => {
	try {
		const modules = await drizzleDb.findMany("moduleConfig", {
			where: { enabled: true },
			select: { key: true },
		});

		res.json(modules.map((m: any) => m.key));
	} catch (error) {
		logger.error("[MODULES ENABLED ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar cursos ativos" });
	}
});

export default router;
