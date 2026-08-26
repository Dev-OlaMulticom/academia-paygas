import type { FastifyInstance, FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import { authenticate } from "../fastify-plugins/auth";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { awardPointsIfNotAwarded } from "../services/gamification";
import { logActivity } from "../services/log";

/**
 * Progresso routes — migrated from Express routes/progresso.ts.
 * All endpoints require authentication.
 */
const progressoRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	// GET /api/progresso
	fastify.get("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const progresso = await drizzleDb.findMany("progresso", {
				where: { userId: request.userId },
			});
			return reply.send(progresso);
		} catch (error) {
			logger.error("[ROUTE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar progresso" });
		}
	});

	// PUT /api/progresso
	fastify.put("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const { cursoId, aulaId, concluido } = request.body as any;
			if (!cursoId || !aulaId) {
				return reply.code(400).send({ error: "cursoId e aulaId são obrigatórios" });
			}

			const existing = await drizzleDb.findFirst("progresso", {
				cursoId,
				aulaId,
				userId: request.userId,
			});

			const progresso = await drizzleDb.upsert(
				"progresso",
				{ cursoId, aulaId, userId: request.userId },
				{ cursoId, aulaId, userId: request.userId, concluido: concluido !== false },
				{ concluido: concluido !== false },
			);

			// Award points for lesson completion (only if newly completed)
			if (!existing?.concluido && concluido !== false) {
				const aula = (await drizzleDb.findUnique("aula", { id: aulaId })) as any;
				await awardPointsIfNotAwarded(request.userId!, "LESSON_COMPLETE", `LESSON_COMPLETE:aula:${aulaId}`);
				await logActivity(request.userId!, "Aula Concluida", `Aula: ${aula?.titulo || aulaId}`);

				// Check if all aulas in the curso are completed
				const curso = (await drizzleDb.findUnique("curso", { id: cursoId })) as any;
				if (curso) {
					const completedCount = await drizzleDb.count("progresso", {
						cursoId,
						userId: request.userId,
						concluido: true,
					});

					const aulas = (await drizzleDb.findMany("aula", { where: { cursoId } })) as any[];

					if (completedCount >= aulas.length) {
						await awardPointsIfNotAwarded(request.userId!, "MODULE_COMPLETE", `MODULE_COMPLETE:curso:${cursoId}`);
						await logActivity(request.userId!, "Curso Concluido", `Curso: ${curso.titulo}`);
					}
				}
			}

			return reply.send(progresso);
		} catch (error) {
			logger.error("[ROUTE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao atualizar progresso" });
		}
	});

	// GET /api/progresso/stats
	fastify.get("/stats", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const totalAulas = await drizzleDb.count("aula");
			const concluidas = await drizzleDb.count("progresso", {
				userId: request.userId,
				concluido: true,
			});

			const cursosIniciados = await drizzleDb.groupBy("progresso", {
				by: ["cursoId"],
				where: { userId: request.userId },
			});

			const user = (await drizzleDb.findUnique("user", { id: request.userId })) as any;

			return reply.send({
				totalAulas,
				concluidas,
				percentual: totalAulas > 0 ? Math.round((concluidas / totalAulas) * 100) : 0,
				cursosIniciados: cursosIniciados.length,
				xp: user?.xp || 0,
			});
		} catch (error) {
			logger.error("[ROUTE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar estatísticas" });
		}
	});

	// POST /api/progresso/restart-request — user requests restart of module/aula progress
	fastify.post(
		"/restart-request",
		{ preHandler: [authenticate] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { cursoId, aulaId } = request.body as any;
				if (!cursoId) return reply.code(400).send({ error: "cursoId é obrigatório" });

				const user = (await drizzleDb.findUnique("user", { id: request.userId })) as any;
				if (!user) return reply.code(404).send({ error: "Usuário não encontrado" });

				const curso = (await drizzleDb.findUnique("curso", { id: cursoId })) as any;
				const cursoTitulo = curso?.titulo || cursoId;

				// Determine recipient: gestor or admin
				let targetId = user.gestorId;
				let targetType = "GESTOR";
				if (!targetId) {
					// No gestor — find first admin
					const admin = await drizzleDb.findFirst("user", { role: "ADMIN" }, { select: { id: true } });
					targetId = admin?.id || null;
					targetType = "ADMIN";
				}

				if (!targetId) {
					return reply
						.code(400)
						.send({ error: "Nenhum gestor ou administrador disponível para receber a solicitação" });
				}

				const scope = aulaId ? `aula "${cursoTitulo}"` : `curso "${cursoTitulo}"`;
				const titulo = "Solicitação de Reinício";
				const mensagem = `${user.nome} (${user.role}) solicitou reinício de progresso da ${scope}.`;

				await drizzleDb.create("notification", {
					fromId: request.userId,
					toId: targetId,
					titulo,
					mensagem,
					data: JSON.stringify({
						type: "restart-request",
						cursoId,
						cursoTitulo,
						userId: request.userId,
						userName: user.nome,
					}),
				});

				await logActivity(request.userId!, "Solicitação Reinício", `Solicitou reinício da ${scope}`);

				return reply.code(201).send({ success: true, sentTo: targetType });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao enviar solicitação" });
			}
		},
	);

	// PUT /api/progresso/restart — gestor/admin approves and restarts progress
	fastify.put("/restart", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const { userId, cursoId, aulaId } = request.body as any;
			if (!userId || !cursoId) {
				return reply.code(400).send({ error: "userId e cursoId são obrigatórios" });
			}

			const requester = (await drizzleDb.findUnique("user", { id: request.userId })) as any;
			const targetUser = (await drizzleDb.findUnique("user", { id: userId })) as any;
			if (!targetUser) return reply.code(404).send({ error: "Usuário alvo não encontrado" });

			// Authorization: ADMIN can restart anyone, GESTOR only their team
			if (requester.role === "GESTOR" && targetUser.gestorId !== request.userId) {
				return reply.code(403).send({ error: "Sem permissão para reiniciar este usuário" });
			}

			const where: any = { userId, cursoId };
			if (aulaId) where.aulaId = aulaId;

			// Logical restart: mark as restarted, increment count, set concluido=false
			const toRestart = await drizzleDb.findMany("progresso", { where });
			const updated = await Promise.all(
				toRestart.map((p: any) =>
					drizzleDb.update(
						"progresso",
						{ id: p.id },
						{
							concluido: false,
							reiniciado: true,
							restartCount: (p.restartCount ?? 0) + 1,
						},
					),
				),
			);

			const curso = (await drizzleDb.findUnique("curso", { id: cursoId })) as any;
			const scope = aulaId ? `aula` : `curso "${curso?.titulo || cursoId}"`;
			await logActivity(
				request.userId!,
				"Reinício Aprovado",
				`Reiniciou progresso de ${scope} para ${targetUser.nome}`,
			);

			// Notify the user that their restart was approved
			await drizzleDb.create("notification", {
				fromId: request.userId,
				toId: userId,
				titulo: "Reinício Aprovado",
				mensagem: `Seu pedido de reinício do ${scope} foi aprovado. Você pode recomeçar do zero.`,
			});

			return reply.send({ success: true, updated: updated.length });
		} catch (error) {
			logger.error("[ROUTE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao reiniciar progresso" });
		}
	});

	done();
};

export default progressoRoutes;
