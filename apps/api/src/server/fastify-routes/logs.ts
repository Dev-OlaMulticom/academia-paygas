import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { authenticate, authorize } from "../fastify-plugins/auth";
import { logActivity } from "../services/log";

/**
 * Logs routes — migrated from Express routes/logs.ts.
 * All endpoints require ADMIN.
 */
const logsRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	// GET /api/logs - List all activity logs (ADMIN only)
	// Query params: userId, startDate, endDate, acao, page, limit
	fastify.get(
		"/",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const q = request.query as Record<string, string | undefined>;
				const page = Math.max(1, parseInt(q.page as string, 10) || 1);
				const limit = Math.min(200, Math.max(1, parseInt(q.limit as string, 10) || 50));
				const skip = (page - 1) * limit;

				const where: any = {};

				if (q.userId) {
					where.userId = q.userId;
				}

				if (q.acao) {
					where.acao = { icontains: q.acao };
				}

				if (q.startDate || q.endDate) {
					where.createdAt = {};
					if (q.startDate) {
						where.createdAt.gte = new Date(q.startDate);
					}
					if (q.endDate) {
						where.createdAt.lte = new Date(`${q.endDate}T23:59:59.999Z`);
					}
				}

				const [logs, total] = (await Promise.all([
					drizzleDb.findMany("activityLog", {
						where,
						orderBy: { createdAt: "desc" },
						skip,
						take: limit,
					}),
					drizzleDb.count("activityLog", where),
				])) as [any[], number];

				const userIds = [...new Set(logs.map((l: any) => l.userId).filter(Boolean))];
				const users = userIds.length
					? (await drizzleDb.findMany("user", {
							where: { id: { in: userIds } },
							select: { id: true, nome: true, email: true, role: true },
					  })) as any[]
					: [];
				const userMap = new Map(users.map((u: any) => [u.id, u]));
				const logsWithUser = logs.map((l: any) => ({ ...l, user: userMap.get(l.userId) || null }));

				return reply.send({
					data: logsWithUser,
					pagination: {
						page,
						limit,
						total,
						totalPages: Math.ceil(total / limit),
					},
				});
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar logs de atividade" });
			}
		},
	);

	// GET /api/logs/users - List users with activity summary (ADMIN only)
	fastify.get(
		"/users",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (_request: FastifyRequest, reply: FastifyReply) => {
			try {
				const users = (await drizzleDb.findMany("user", {
					select: {
						id: true,
						nome: true,
						email: true,
						role: true,
						createdAt: true,
						lastLogin: true,
					},
					orderBy: { nome: "asc" },
				})) as any[];

				const activityCounts = (await drizzleDb.groupBy("activityLog", {
					by: ["userId"],
					_count: { id: true },
				})) as any[];
				const countMap = new Map(activityCounts.map((c: any) => [c.userId, c._count.id]));

				return reply.send(
					users.map((u: any) => ({
						...u,
						_count: { activityLogs: countMap.get(u.id) || 0 },
					})),
				);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar usuários" });
			}
		},
	);

	// DELETE /api/logs/:id - Delete a single activity log (ADMIN only)
	fastify.delete(
		"/:id",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const id = String((request.params as any).id);
				if (!id) return reply.code(400).send({ error: "ID inválido" });

				const existing = await drizzleDb.findUnique("activityLog", { id });
				if (!existing) return reply.code(404).send({ error: "Registro de log não encontrado" });

				await drizzleDb.delete("activityLog", { id });
				return reply.send({ success: true });
			} catch (error) {
				logger.error("[LOG DELETE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao excluir registro" });
			}
		},
	);

	// DELETE /api/logs - Bulk delete activity logs (ADMIN only)
	// Body: { userId?, acao?, startDate?, endDate? }
	// Requires at least one filter to prevent accidental wipe.
	fastify.delete(
		"/",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { userId, acao, startDate, endDate } = request.body as any;

				if (!userId && !acao && !startDate && !endDate) {
					return reply.code(400).send({
						error: "Aplique ao menos um filtro (userId, acao, startDate, endDate) para exclusão em massa",
					});
				}

				const where: any = {};
				if (userId) where.userId = userId;
				if (acao) where.acao = { icontains: acao };
				if (startDate || endDate) {
					where.createdAt = {};
					if (startDate) where.createdAt.gte = new Date(startDate);
					if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
				}

				const rows = (await drizzleDb.deleteMany("activityLog", where)) as any[];

				if (request.userId) {
					await logActivity(request.userId, "Excluir Logs", `Bulk delete: ${rows.length} registros`);
				}

				return reply.send({ success: true, deleted: rows.length });
			} catch (error) {
				logger.error("[LOG BULK DELETE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao excluir registros" });
			}
		},
	);

	// GET /api/logs/stats - Activity stats summary (ADMIN only)
	fastify.get(
		"/stats",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const q = request.query as Record<string, string | undefined>;
				const where: any = {};

				if (q.startDate || q.endDate) {
					where.createdAt = {};
					if (q.startDate) {
						where.createdAt.gte = new Date(q.startDate);
					}
					if (q.endDate) {
						where.createdAt.lte = new Date(`${q.endDate}T23:59:59.999Z`);
					}
				}

				const [totalLogs, byActionRaw, byUserRaw] = (await Promise.all([
					drizzleDb.count("activityLog", where),
					drizzleDb.groupBy("activityLog", {
						by: ["acao"],
						where,
						_count: { id: true },
					}),
					drizzleDb.groupBy("activityLog", {
						by: ["userId"],
						where,
						_count: { id: true },
					}),
				])) as [number, any[], any[]];

				const byAction = byActionRaw.sort((a, b) => b._count.id - a._count.id).slice(0, 20);
				const byUser = byUserRaw.sort((a, b) => b._count.id - a._count.id).slice(0, 10);

				const userIds = byUser.map((b: any) => b.userId);
				const users = (await drizzleDb.findMany("user", {
					where: { id: { in: userIds } },
					select: { id: true, nome: true, email: true, role: true },
				})) as any[];

				const userMap = new Map(users.map((u: any) => [u.id, u]));

				return reply.send({
					totalLogs,
					byAction: byAction.map((b: any) => ({ acao: b.acao, count: b._count.id })),
					byUser: byUser.map((b: any) => ({
						...(userMap.get(b.userId) || {}),
						count: b._count.id,
					})),
				});
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar estatísticas" });
			}
		},
	);

	done();
};

export default logsRoutes;
