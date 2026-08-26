import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { authenticate, authorize } from "../fastify-plugins/auth";
import { logActivity } from "../services/log";
import { getStringParam } from "../utils/queryParams";

/**
 * Certificates routes — migrated from Express routes/certificates.ts.
 * All endpoints require authentication.
 */
const certificatesRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	// GET /api/certificates
	fastify.get("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const q = request.query as Record<string, string | undefined>;
			const page = Math.max(1, parseInt(q.page as string, 10) || 1);
			const limit = Math.min(100, Math.max(1, parseInt(q.limit as string, 10) || 20));
			const skip = (page - 1) * limit;

			let where: any = {};

			if (request.userRole === "ADMIN") {
				// Admin sees all certificates
				where = {};
			} else if (request.userRole === "GESTOR") {
				// Gestor sees own + team members' certificates
				const teamMembers = await drizzleDb.findMany("user", {
					where: { gestorId: request.userId },
					select: { id: true },
				});
				const teamIds = teamMembers.map((m: any) => m.id);
				where = { userId: { in: [request.userId, ...teamIds] } };
			} else {
				// ATENDENTE sees only own
				where = { userId: request.userId };
			}

			const [certs, total] = await Promise.all([
				drizzleDb.findMany("certificate", {
					where,
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				drizzleDb.count("certificate", where),
			]);

			const userIds = [...new Set(certs.map((c: any) => c.userId))];
			const cursoIds = [...new Set(certs.map((c: any) => c.cursoId))];

			const [users, cursos] = await Promise.all([
				userIds.length
					? drizzleDb.findMany("user", {
							where: { id: { in: userIds } },
							select: { id: true, nome: true, email: true, role: true, gestorId: true },
					  })
					: [],
				cursoIds.length
					? drizzleDb.findMany("curso", {
							where: { id: { in: cursoIds } },
							select: { id: true, titulo: true, icone: true, certificadoTemplate: true },
					  })
					: [],
			]);

			const userById = new Map(users.map((u: any) => [u.id, u]));
			const cursoById = new Map(cursos.map((c: any) => [c.id, c]));

			const data = certs.map((cert: any) => ({
				...cert,
				user: userById.get(cert.userId) || null,
				curso: cursoById.get(cert.cursoId) || null,
			}));

			return reply.send({
				data,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		} catch (error) {
			logger.error("[ROUTE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar certificados" });
		}
	});

	// POST /api/certificates
	fastify.post("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const { cursoId } = request.body as any;
			const userId = request.userId!;
			if (!cursoId) return reply.code(400).send({ error: "cursoId é obrigatório" });

			const curso = (await drizzleDb.findUnique("curso", { id: cursoId })) as any;
			if (!curso) return reply.code(404).send({ error: "Módulo não encontrado" });

			const aulas = (await drizzleDb.findMany("aula", { where: { cursoId } })) as any[];
			const completedCount = await drizzleDb.count("progresso", {
				cursoId,
				userId,
				concluido: true,
			});
			if (completedCount < aulas.length) {
				return reply.code(400).send({ error: "Complete todas as aulas antes de solicitar o certificado" });
			}

			// Atomic upsert to prevent race condition duplicates
			const certStatus = curso.autoCertificado ? "APPROVED" : "PENDING";
			const cert = (await drizzleDb.upsert(
				"certificate",
				{ userId, cursoId },
				{ userId, cursoId, status: certStatus },
				{},
			)) as any;

			await logActivity(userId, "Certificado Solicitado", `Curso: ${curso.titulo}`);
			return reply.code(201).send(cert);
		} catch (error) {
			logger.error("[ROUTE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao criar certificado" });
		}
	});

	// PUT /api/certificates/:id/approve
	fastify.put(
		"/:id/approve",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const id = getStringParam((request.params as any).id);
				if (!id) return reply.code(400).send({ error: "ID inválido" });

				const existing = (await drizzleDb.findUnique("certificate", { id })) as any;
				if (!existing) return reply.code(404).send({ error: "Certificado não encontrado" });
				if (existing.status !== "PENDING") {
					return reply.code(400).send({
						error: `Não é possível aprovar um certificado com status "${existing.status}". Apenas certificados PENDING podem ser aprovados.`,
					});
				}

				const cert = (await drizzleDb.update(
					"certificate",
					{ id },
					{
						status: "APPROVED",
						aprovadoPor: request.userId,
						aprovadoEm: new Date(),
					},
				)) as any;

				await logActivity(request.userId!, "Certificado Aprovado", `Certificado: ${id}`);
				return reply.send(cert);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao aprovar certificado" });
			}
		},
	);

	// PUT /api/certificates/:id/issue
	fastify.put(
		"/:id/issue",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const id = getStringParam((request.params as any).id);
				if (!id) return reply.code(400).send({ error: "ID inválido" });

				const existing = (await drizzleDb.findUnique("certificate", { id })) as any;
				if (!existing) return reply.code(404).send({ error: "Certificado não encontrado" });
				if (existing.status !== "APPROVED") {
					return reply.code(400).send({
						error: `Não é possível emitir um certificado com status "${existing.status}". Apenas certificados APPROVED podem ser emitidos.`,
					});
				}

				const cert = (await drizzleDb.update("certificate", { id }, { status: "ISSUED" })) as any;

				await logActivity(request.userId!, "Certificado Emitido", `Certificado: ${id}`);
				return reply.send(cert);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao emitir certificado" });
			}
		},
	);

	done();
};

export default certificatesRoutes;
