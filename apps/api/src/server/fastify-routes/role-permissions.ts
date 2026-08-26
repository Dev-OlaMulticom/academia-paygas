import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { authenticate, authorize } from "../fastify-plugins/auth";
import { getAllRoleConfigs, invalidateRoleCache } from "../services/role-permissions";

/**
 * Role Permissions routes — migrated from Express routes/role-permissions.ts.
 * GET requires auth; PUT/POST require ADMIN.
 */
const rolePermissionsRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	// GET /api/role-permissions — get current user's role permissions
	fastify.get(
		"/",
		{ preHandler: [authenticate] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const row = await drizzleDb.findUnique(
					"roleConfig",
					{ role: request.userRole },
					{
						select: { role: true, label: true, description: true, permissions: true },
					},
				);

				if (!row) {
					return reply.send({ role: request.userRole, label: request.userRole, permissions: [] });
				}

				return reply.send(row);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar permissões" });
			}
		},
	);

	// GET /api/role-permissions/all — get all role configs (admin)
	fastify.get(
		"/all",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (_request: FastifyRequest, reply: FastifyReply) => {
			try {
				const configs = await getAllRoleConfigs();
				return reply.send(configs);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar configurações de roles" });
			}
		},
	);

	// PUT /api/role-permissions/:role — update a role's permissions (admin)
	fastify.put(
		"/:role",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { role } = request.params as any;
				const { permissions, label, description, ativo, ordem } = request.body as any;

				// Validate role exists
				const existing = await drizzleDb.findUnique("roleConfig", { role });
				if (!existing) {
					return reply.code(404).send({ error: "Role não encontrada" });
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
				return reply.send(updated);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao atualizar permissões" });
			}
		},
	);

	// POST /api/role-permissions — create a new role config (admin)
	fastify.post(
		"/",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { role, label, description, permissions, ordem } = request.body as any;

				if (!role || !label) {
					return reply.code(400).send({ error: "role e label são obrigatórios" });
				}

				const existing = await drizzleDb.findUnique("roleConfig", { role });
				if (existing) {
					return reply.code(409).send({ error: "Role já existe" });
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
				return reply.code(201).send(created);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao criar role" });
			}
		},
	);

	done();
};

export default rolePermissionsRoutes;
