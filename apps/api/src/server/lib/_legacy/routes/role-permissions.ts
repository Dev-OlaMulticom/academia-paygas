/**
 * Role Permissions routes.
 *
 * GET /api/role-permissions — current user's role permissions (authenticated)
 * GET /api/role-permissions/all — all role configs (admin only)
 * PUT /api/role-permissions/:role — update a role's permissions (admin only)
 */
import { Router } from "express";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { authenticate, authorize } from "../middleware/auth";
import { getAllRoleConfigs, invalidateRoleCache } from "../services/role-permissions";

const router = Router();

// GET /api/role-permissions — get current user's role permissions
router.get("/", authenticate, async (req: any, res) => {
	try {
		const row = await drizzleDb.findUnique(
			"roleConfig",
			{ role: req.userRole },
			{
				select: { role: true, label: true, description: true, permissions: true },
			},
		);

		if (!row) {
			return res.json({ role: req.userRole, label: req.userRole, permissions: [] });
		}

		res.json(row);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar permissões" });
	}
});

// GET /api/role-permissions/all — get all role configs (admin)
router.get("/all", authenticate, authorize("ADMIN"), async (_req, res) => {
	try {
		const configs = await getAllRoleConfigs();
		res.json(configs);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar configurações de roles" });
	}
});

// PUT /api/role-permissions/:role — update a role's permissions (admin)
router.put("/:role", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const { role } = req.params;
		const { permissions, label, description, ativo, ordem } = req.body;

		// Validate role exists
		const existing = await drizzleDb.findUnique("roleConfig", { role });
		if (!existing) {
			return res.status(404).json({ error: "Role não encontrada" });
		}

		const updated = await drizzleDb.update(
			"roleConfig",
			{ role },
			{
				...(permissions !== undefined ? { permissions } : {}),
				...(label !== undefined ? { label } : {}),
				...(description !== undefined ? { description } : {}),
				...(ativo !== undefined ? { ativo } : {}),
				...(ordem !== undefined ? { ordem } : {}),
			},
		);

		invalidateRoleCache();
		res.json(updated);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao atualizar permissões" });
	}
});

// POST /api/role-permissions — create a new role config (admin)
router.post("/", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const { role, label, description, permissions, ordem } = req.body;

		if (!role || !label) {
			return res.status(400).json({ error: "role e label são obrigatórios" });
		}

		const existing = await drizzleDb.findUnique("roleConfig", { role });
		if (existing) {
			return res.status(409).json({ error: "Role já existe" });
		}

		const created = await drizzleDb.create("roleConfig", {
			role,
			label,
			description: description || null,
			permissions: permissions || [],
			ativo: true,
			ordem: ordem || 99,
		});

		invalidateRoleCache();
		res.status(201).json(created);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao criar role" });
	}
});

export default router;
