import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { authenticate, authorize } from "../fastify-plugins/auth";
import { sendNotificationAlertEmail } from "../services/email";
import { getStringParam } from "../utils/queryParams";

/**
 * Notifications routes — migrated from Express routes/notifications.ts.
 * All endpoints require authentication.
 */
const notificationsRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	// GET /api/notifications/unread-count
	fastify.get(
		"/unread-count",
		{ preHandler: [authenticate] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const count = await drizzleDb.count("notification", { toId: request.userId, lida: false });
				return reply.send({ count });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao contar notificações" });
			}
		},
	);

	// GET /api/notifications
	fastify.get("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const notifs = await drizzleDb.findMany("notification", {
				where: { toId: request.userId },
				orderBy: { createdAt: "desc" },
			});
			return reply.send(notifs);
		} catch (error) {
			logger.error("[ROUTE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar notificações" });
		}
	});

	// POST /api/notifications — send to user(s)
	fastify.post(
		"/",
		{ preHandler: [authenticate, authorize("ADMIN", "GESTOR")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { toId, toRole, toTeam, titulo, mensagem } = request.body as any;
				if (!titulo || !mensagem) {
					return reply.code(400).send({ error: "Título e mensagem são obrigatórios" });
				}

				const fromId = request.userId!;
				let targetUserIds: string[] = [];

				if (toTeam && request.userRole === "GESTOR") {
					const members = (await drizzleDb.findMany("user", { where: { gestorId: fromId } })) as any[];
					targetUserIds = members.map((m: any) => m.id);
				} else if (toId === "all" && request.userRole === "ADMIN") {
					const users = (await drizzleDb.findMany("user", { where: { id: { ne: fromId } } })) as any[];
					targetUserIds = users.map((u: any) => u.id);
				} else if (toRole && request.userRole === "ADMIN") {
					const validRoles = ["ADMIN", "GESTOR", "ATENDENTE"];
					if (!validRoles.includes(toRole)) {
						return reply.code(400).send({ error: "Perfil inválido" });
					}
					const users = (await drizzleDb.findMany("user", { where: { role: toRole, id: { ne: fromId } } })) as any[];
					targetUserIds = users.map((u: any) => u.id);
				} else if (toId && toId !== "all") {
					const targetUser = (await drizzleDb.findUnique("user", { id: toId })) as any;
					if (!targetUser) return reply.code(404).send({ error: "Usuário não encontrado" });

					if (request.userRole === "GESTOR" && targetUser.gestorId !== fromId) {
						return reply.code(403).send({ error: "Sem permissão para enviar a este usuário" });
					}
					targetUserIds = [toId];
				} else {
					return reply.code(400).send({ error: "Destinatário inválido" });
				}

				if (targetUserIds.length === 0) {
					return reply.code(400).send({ error: "Nenhum destinatário encontrado" });
				}

				await drizzleDb.createMany(
					"notification",
					targetUserIds.map((userId) => ({
						fromId,
						toId: userId,
						titulo,
						mensagem,
					})),
				);

				// Send email alerts asynchronously (fire-and-forget)
				const users = (await drizzleDb.findMany("user", {
					where: { id: { in: targetUserIds } },
				})) as any[];
				for (const u of users) {
					sendNotificationAlertEmail(u.email, u.nome || u.email, titulo).then((r) => {
						if (!r.success) logger.warn(`[EMAIL] Falha notif para ${u.email}: ${r.error}`);
					});
				}

				return reply.code(201).send({ success: true, sent: targetUserIds.length });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao enviar notificação" });
			}
		},
	);

	// PUT /api/notifications/:id/read
	fastify.put(
		"/:id/read",
		{ preHandler: [authenticate] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const id = getStringParam((request.params as any).id);
				if (!id) return reply.code(400).send({ error: "ID invalido" });

				const notif = (await drizzleDb.findUnique("notification", { id })) as any;
				if (!notif) return reply.code(404).send({ error: "Notificación no encontrada" });
				if (notif.toId !== request.userId) return reply.code(403).send({ error: "Sem permissao" });

				const updated = await drizzleDb.update("notification", { id }, { lida: true });
				return reply.send(updated);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao marcar como lida" });
			}
		},
	);

	// PUT /api/notifications/read-all
	fastify.put(
		"/read-all",
		{ preHandler: [authenticate] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				await drizzleDb.updateMany("notification", { toId: request.userId, lida: false }, { lida: true });
				return reply.send({ success: true });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao marcar todas como lidas" });
			}
		},
	);

	// DELETE /api/notifications/:id - Owner or ADMIN can delete.
	fastify.delete(
		"/:id",
		{ preHandler: [authenticate] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const id = getStringParam((request.params as any).id);
				if (!id) return reply.code(400).send({ error: "ID invalido" });

				const notif = (await drizzleDb.findUnique("notification", { id })) as any;
				if (!notif) return reply.code(404).send({ error: "Notificación no encontrada" });

				const isOwner = notif.toId === request.userId;
				const isAdmin = request.userRole === "ADMIN";
				if (!isOwner && !isAdmin) {
					return reply.code(403).send({ error: "Sem permissao" });
				}

				await drizzleDb.delete("notification", { id });
				return reply.send({ success: true });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao excluir notificação" });
			}
		},
	);

	done();
};

export default notificationsRoutes;
