import type { FastifyInstance, FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import { authenticate, authorize } from "../fastify-plugins/auth";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { gradeQuiz } from "../lib/quiz";
import { sendNotificationAlertEmail } from "../services/email";
import { awardPointsIfNotAwarded } from "../services/gamification";
import { logActivity } from "../services/log";
import { getStringParam } from "../utils/queryParams";

/**
 * CMS routes — migrated from Express routes/cms.ts.
 * Covers cursos, aulas, licoes, quizzes, quiz perguntas, quiz responses.
 */
const cmsRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
		const out: Record<string, T[]> = {};
		for (const item of arr) {
			const k = String(item[key]);
			if (!out[k]) out[k] = [];
			out[k].push(item);
		}
		return out;
	}

	// POST /api/cms/reorder
	fastify.post(
		"/reorder",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { tipo, ids } = request.body as {
					tipo: "curso" | "aula" | "quizPergunta";
					ids: string[];
				};

				if (!tipo || !Array.isArray(ids)) {
					return reply.code(400).send({ error: "tipo e ids[] são obrigatórios" });
				}

				const modelName =
					tipo === "curso" ? "curso" : tipo === "aula" ? "aula" : tipo === "quizPergunta" ? "quizPergunta" : null;
				if (!modelName) {
					return reply.code(400).send({ error: "tipo inválido" });
				}

				let affected = 0;
				for (let i = 0; i < ids.length; i++) {
					await drizzleDb.update(modelName, { id: ids[i] }, { ordem: i });
					affected++;
				}

				await logActivity(request.userId!, "Reordenar", `${tipo}: ${ids.length} itens`);
				return reply.send({ success: true, affected });
			} catch (error: any) {
				logger.error("[REORDER ERROR]", error);
				return reply.code(500).send({ error: error?.message || "Erro ao reordenar" });
			}
		},
	);

	// GET /api/cms/cursos - accessible to all authenticated users, filtered by role
	fastify.get("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const q = request.query as Record<string, string | undefined>;
			const page = Math.max(1, parseInt(q.page as string, 10) || 1);
			const limit = Math.min(100, Math.max(1, parseInt(q.limit as string, 10) || 20));
			const skip = (page - 1) * limit;

			const userRole = request.userRole;
			const isAdmin = userRole === "ADMIN";

			const [allModulos, allAulas, allProgressos] = await Promise.all([
				drizzleDb.findMany("curso", { orderBy: { ordem: "asc" } }),
				drizzleDb.findMany("aula", { select: { id: true, cursoId: true } }),
				drizzleDb.findMany("progresso", { select: { id: true, cursoId: true } }),
			]);

			const aulasByCurso = groupBy(allAulas, "cursoId");
			const progressosByCurso = allProgressos.reduce((acc: Record<string, number>, p: any) => {
				acc[p.cursoId] = (acc[p.cursoId] || 0) + 1;
				return acc;
			}, {});

			const cursos = allModulos
				.map((mod: any) => ({
					...mod,
					aulas: (aulasByCurso[mod.id] || []).map((a: any) => ({ id: a.id })),
					_count: {
						aulas: (aulasByCurso[mod.id] || []).length,
						progressos: progressosByCurso[mod.id] || 0,
					},
				}))
				.filter((mod: any) => {
					if (isAdmin) return true;
					if (!mod.rolesPermitidos) return true;
					const roles = mod.rolesPermitidos as unknown as string[];
					if (!Array.isArray(roles) || roles.length === 0) return true;
					return roles.includes(userRole!);
				});

			const filteredTotal = cursos.length;
			const paginatedModulos = cursos.slice(skip, skip + limit);

			return reply.send({
				data: paginatedModulos,
				pagination: {
					page,
					limit,
					total: filteredTotal,
					totalPages: Math.ceil(filteredTotal / limit),
				},
			});
		} catch (error) {
			logger.error("[ROUTE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar cursos" });
		}
	});

	// GET /api/cms/:id - Get single curso
	fastify.get("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const id = getStringParam((request.params as any).id);
			if (!id) return reply.code(400).send({ error: "ID inválido" });
			const curso = await drizzleDb.findUnique("curso", { id });
			if (!curso) return reply.code(404).send({ error: "Módulo não encontrado" });

			const [aulas, progressos] = await Promise.all([
				drizzleDb.findMany("aula", { where: { cursoId: id }, select: { id: true } }),
				drizzleDb.count("progresso", { cursoId: id }),
			]);

			return reply.send({
				...curso,
				aulas,
				_count: { aulas: aulas.length, progressos },
			});
		} catch (error) {
			logger.error("[ROUTE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar módulo" });
		}
	});

	// POST /api/cms/cursos
	fastify.post(
		"/",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const {
					titulo,
					descricao,
					ordem,
					videoUrl,
					videoInicio,
					videoFim,
					obrigatorio,
					autoCertificado,
					icone,
					certificadoTemplate,
					rolesPermitidos,
				} = request.body as any;
				if (!titulo) {
					return reply.code(400).send({ error: "Título é obrigatório" });
				}

				const maxOrdem = await drizzleDb.aggregate("curso", {
					_max: { ordem: true },
				});

				const curso = await drizzleDb.create("curso", {
					titulo,
					descricao: descricao || "",
					ordem: ordem ?? (maxOrdem._max.ordem ?? 0) + 1,
					icone: icone || null,
					videoUrl: videoUrl || null,
					videoInicio: videoInicio || null,
					videoFim: videoFim || null,
					obrigatorio: obrigatorio || false,
					autoCertificado: autoCertificado || false,
					certificadoTemplate: certificadoTemplate || null,
					rolesPermitidos: rolesPermitidos || null,
				});
				await logActivity(request.userId!, "Criar Curso", `Curso: ${titulo}`);
				return reply.code(201).send(curso);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao criar módulo" });
			}
		},
	);

	// PUT /api/cms/cursos/:id
	fastify.put(
		"/:id",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const {
					titulo,
					descricao,
					ordem,
					videoUrl,
					videoInicio,
					videoFim,
					obrigatorio,
					autoCertificado,
					icone,
					certificadoTemplate,
					rolesPermitidos,
				} = request.body as any;
				const id = getStringParam((request.params as any).id);
				if (!id) return reply.code(400).send({ error: "ID inválido" });
				const curso = await drizzleDb.update(
					"curso",
					{ id },
					{
						titulo,
						descricao,
						ordem,
						videoUrl,
						videoInicio,
						videoFim,
						obrigatorio,
						autoCertificado,
						icone,
						certificadoTemplate,
						rolesPermitidos,
					},
				);
				await logActivity(request.userId!, "Editar Curso", `Curso: ${curso.titulo}`);
				return reply.send(curso);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao atualizar módulo" });
			}
		},
	);

	// DELETE /api/cms/cursos/:id
	fastify.delete(
		"/:id",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const id = getStringParam((request.params as any).id);
				if (!id) return reply.code(400).send({ error: "ID inválido" });
				await drizzleDb.delete("curso", { id });
				await logActivity(request.userId!, "Excluir Curso", `Curso ID: ${id}`);
				return reply.send({ success: true });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao excluir módulo" });
			}
		},
	);

	// GET /api/cms/cursos/:id/aulas
	fastify.get("/:id/aulas", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const cursoId = getStringParam((request.params as any).id);
			if (!cursoId) return reply.code(400).send({ error: "ID inválido" });

			const cursoExists = await drizzleDb.findUnique("curso", { id: cursoId }, { select: { id: true } });
			if (!cursoExists) return reply.code(404).send({ error: "Módulo não encontrado" });

			const userRole = request.userRole;
			const isAdmin = userRole === "ADMIN";

			const aulasRaw = await drizzleDb.findMany("aula", {
				where: { cursoId },
				orderBy: { ordem: "asc" },
			});

			const aulaIds = aulasRaw.map((a: any) => a.id);

			const [quizzesRaw, licoesRaw, progressosRaw] = await Promise.all([
				drizzleDb.findMany("quiz", { where: { aulaId: { $in: aulaIds } } }),
				drizzleDb.findMany("licao", { where: { aulaId: { $in: aulaIds } }, orderBy: { ordem: "asc" } }),
				drizzleDb.findMany("progresso", {
					where: { aulaId: { $in: aulaIds }, userId: request.userId },
					select: { concluido: true, aulaId: true },
				}),
			]);

			const quizIds = quizzesRaw.map((q: any) => q.id);
			const quizPerguntasRaw = aulaIds.length
				? await drizzleDb.findMany("quizPergunta", {
						where: { quizId: { $in: quizIds } },
						orderBy: { ordem: "asc" },
					})
				: [];

			const licoesByAula = groupBy(licoesRaw, "aulaId");
			const progressosByAula = groupBy(progressosRaw, "aulaId");
			const quizByAula: Record<string, any> = {};
			for (const q of quizzesRaw) quizByAula[q.aulaId] = q;
			const perguntasByQuiz = groupBy(quizPerguntasRaw, "quizId");

			// Filter by role: admin sees all; others see aulas with no restriction or their role included
			const aulas = aulasRaw
				.filter((aula: any) => {
					if (isAdmin) return true;
					if (!aula.rolesPermitidos) return true;
					const roles = aula.rolesPermitidos as unknown as string[];
					if (!Array.isArray(roles) || roles.length === 0) return true;
					return roles.includes(userRole!);
				})
				.map((aula: any) => {
					const quiz = quizByAula[aula.id];
					if (quiz) {
						quiz.perguntas = perguntasByQuiz[quiz.id] || [];
					}
					return {
						...aula,
						quiz,
						licoes: licoesByAula[aula.id] || [],
						progressos: progressosByAula[aula.id] || [],
					};
				});

			// Auto-migrate: if aula has no ancoragemPoints but has VIDEO licoes with inicioSeg, convert them
			for (const a of aulas) {
				if (!a.ancoragemPoints && a.licoes.length > 0) {
					const videoLicoes = a.licoes.filter(
						(l: any) => l.tipo === "VIDEO" && l.inicioSeg != null && l.conteudo === a.videoUrl,
					);
					if (videoLicoes.length > 0) {
						const points = videoLicoes.map((l: any) => ({
							hours: Math.floor((l.inicioSeg || 0) / 3600),
							minutes: Math.floor(((l.inicioSeg || 0) % 3600) / 60),
							seconds: (l.inicioSeg || 0) % 60,
							titulo: l.titulo || "",
						}));
						try {
							await drizzleDb.update("aula", { id: a.id }, { ancoragemPoints: points });
							(a as any).ancoragemPoints = points;
						} catch {
							/* ignore */
						}
					}
				}
			}

			const result = aulas.map((a: any) => ({
				...a,
				concluido: a.progressos.length > 0 ? a.progressos[0].concluido : false,
				progressos: undefined,
			}));

			return reply.send(result);
		} catch (error) {
			logger.error("[ROUTE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar aulas" });
		}
	});

	// POST /api/cms/cursos/:id/aulas
	fastify.post(
		"/:id/aulas",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const {
					titulo,
					descricao,
					tipo,
					videoUrl,
					pdfUrl,
					videoInicio,
					videoFim,
					duracaoMin,
					obrigatorio,
					ancoragemPoints,
					rolesPermitidos,
					ordem,
				} = request.body as any;
				const cursoId = getStringParam((request.params as any).id);
				if (!cursoId) return reply.code(400).send({ error: "ID inválido" });

				const maxOrdem = await drizzleDb.aggregate("aula", {
					where: { cursoId },
					_max: { ordem: true },
				});

				const aula = await drizzleDb.create("aula", {
					cursoId,
					titulo,
					descricao: descricao || "",
					ordem: typeof ordem === "number" ? ordem : (maxOrdem._max.ordem ?? 0) + 1,
					tipo: tipo || "VIDEO",
					videoUrl: videoUrl || null,
					pdfUrl: pdfUrl || null,
					videoInicio: videoInicio || null,
					videoFim: videoFim || null,
					duracaoMin: duracaoMin || null,
					obrigatorio: obrigatorio || false,
					ancoragemPoints: ancoragemPoints || null,
					rolesPermitidos: rolesPermitidos || null,
				});
				await logActivity(request.userId!, "Criar Aula", `Aula: ${titulo}`);
				return reply.code(201).send(aula);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao criar aula" });
			}
		},
	);

	// PUT /api/cms/aulas/:id
	fastify.put(
		"/aulas/:id",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const {
					titulo,
					descricao,
					tipo,
					videoUrl,
					pdfUrl,
					videoInicio,
					videoFim,
					duracaoMin,
					ordem,
					obrigatorio,
					ancoragemPoints,
					rolesPermitidos,
				} = request.body as any;
				const id = getStringParam((request.params as any).id);
				if (!id) return reply.code(400).send({ error: "ID inválido" });
				const aula = await drizzleDb.update(
					"aula",
					{ id },
					{
						titulo,
						descricao,
						tipo,
						videoUrl,
						pdfUrl,
						videoInicio,
						videoFim,
						duracaoMin,
						ordem,
						obrigatorio,
						ancoragemPoints,
						rolesPermitidos,
					},
				);
				await logActivity(request.userId!, "Editar Aula", `Aula: ${aula.titulo}`);
				return reply.send(aula);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao atualizar aula" });
			}
		},
	);

	// DELETE /api/cms/aulas/:id
	fastify.delete(
		"/aulas/:id",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const id = getStringParam((request.params as any).id);
				if (!id) return reply.code(400).send({ error: "ID inválido" });
				await drizzleDb.delete("aula", { id });
				await logActivity(request.userId!, "Excluir Aula", `Aula ID: ${id}`);
				return reply.send({ success: true });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao excluir aula" });
			}
		},
	);

	// GET /api/cms/aulas/:aulaId/licoes
	fastify.get(
		"/aulas/:aulaId/licoes",
		{ preHandler: [authenticate] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const aulaId = getStringParam((request.params as any).aulaId);
				if (!aulaId) return reply.code(400).send({ error: "ID inválido" });

				const licoes = await drizzleDb.findMany("licao", {
					where: { aulaId },
					orderBy: { ordem: "asc" },
				});
				return reply.send(licoes);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar lições" });
			}
		},
	);

	// POST /api/cms/aulas/:aulaId/licoes
	fastify.post(
		"/aulas/:aulaId/licoes",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const aulaId = getStringParam((request.params as any).aulaId);
				if (!aulaId) return reply.code(400).send({ error: "ID inválido" });

				const { titulo, conteudo, tipo, duracaoMin, inicioSeg, fimSeg } = request.body as any;
				if (!titulo) return reply.code(400).send({ error: "Título é obrigatório" });

				const maxOrdem = await drizzleDb.aggregate("licao", {
					where: { aulaId },
					_max: { ordem: true },
				});

				const licao = await drizzleDb.create("licao", {
					aulaId,
					titulo,
					conteudo: conteudo || null,
					tipo: tipo || "TEXTO",
					duracaoMin: duracaoMin || null,
					inicioSeg: typeof inicioSeg === "number" ? inicioSeg : null,
					fimSeg: typeof fimSeg === "number" ? fimSeg : null,
					ordem: (maxOrdem._max.ordem ?? 0) + 1,
				});
				await logActivity(request.userId!, "Criar Licao", `Licao: ${titulo}`);
				return reply.code(201).send(licao);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao criar lição" });
			}
		},
	);

	// PUT /api/cms/licoes/:id
	fastify.put(
		"/licoes/:id",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const id = getStringParam((request.params as any).id);
				if (!id) return reply.code(400).send({ error: "ID inválido" });

				const { titulo, conteudo, tipo, ordem, duracaoMin, inicioSeg, fimSeg } = request.body as any;
				const licao = await drizzleDb.update(
					"licao",
					{ id },
					{
						titulo,
						conteudo,
						tipo,
						ordem,
						duracaoMin,
						...(typeof inicioSeg === "number" ? { inicioSeg } : {}),
						...(typeof fimSeg === "number" ? { fimSeg } : {}),
					},
				);
				await logActivity(request.userId!, "Editar Licao", `Licao: ${licao.titulo}`);
				return reply.send(licao);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao atualizar lição" });
			}
		},
	);

	// DELETE /api/cms/licoes/:id
	fastify.delete(
		"/licoes/:id",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const id = getStringParam((request.params as any).id);
				if (!id) return reply.code(400).send({ error: "ID inválido" });
				await drizzleDb.delete("licao", { id });
				await logActivity(request.userId!, "Excluir Licao", `Licao ID: ${id}`);
				return reply.send({ success: true });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao excluir lição" });
			}
		},
	);

	// POST /api/cms/cursos/:cursoId/quiz - Create quiz for an aula
	fastify.post(
		"/:cursoId/quiz",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { aulaId, titulo, autoGerarCertificado, notaMinima, rolesPermitidos } = request.body as any;
				if (!aulaId || !titulo) {
					return reply.code(400).send({ error: "aulaId e titulo são obrigatórios" });
				}

				const existing = await drizzleDb.findUnique("quiz", { aulaId });
				if (existing) {
					return reply.code(409).send({ error: "Esta aula já possui um quiz" });
				}

				const quiz = await drizzleDb.create("quiz", {
					aulaId,
					titulo,
					autoGerarCertificado: autoGerarCertificado || false,
					notaMinima: typeof notaMinima === "number" ? notaMinima : 7,
					rolesPermitidos: rolesPermitidos || null,
				});
				await logActivity(request.userId!, "Criar Quiz", `Quiz: ${titulo}`);
				return reply.code(201).send(quiz);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao criar quiz" });
			}
		},
	);

	// GET /api/cms/cursos/:cursoId/quiz/:aulaId - Get quiz with questions
	fastify.get(
		"/:cursoId/quiz/:aulaId",
		{ preHandler: [authenticate] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const aulaId = getStringParam((request.params as any).aulaId);
				if (!aulaId) return reply.code(400).send({ error: "ID inválido" });
				const quiz = await drizzleDb.findUnique("quiz", { aulaId });
				if (!quiz) {
					return reply.code(404).send({ error: "Quiz não encontrado" });
				}
				const perguntas = await drizzleDb.findMany("quizPergunta", {
					where: { quizId: quiz.id },
					orderBy: { ordem: "asc" },
				});
				return reply.send({ ...quiz, perguntas });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar quiz" });
			}
		},
	);

	// PUT /api/cms/cursos/quiz/:quizId - Update quiz
	fastify.put(
		"/quiz/:quizId",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { titulo, autoGerarCertificado, notaMinima, rolesPermitidos } = request.body as any;
				const quizId = getStringParam((request.params as any).quizId);
				if (!quizId) return reply.code(400).send({ error: "ID inválido" });
				const quiz = await drizzleDb.update(
					"quiz",
					{ id: quizId },
					{
						titulo,
						autoGerarCertificado,
						...(typeof notaMinima === "number" ? { notaMinima } : {}),
						rolesPermitidos,
					},
				);
				await logActivity(request.userId!, "Editar Quiz", `Quiz: ${quiz.titulo}`);
				return reply.send(quiz);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao atualizar quiz" });
			}
		},
	);

	// DELETE /api/cms/cursos/quiz/:quizId - Delete quiz
	fastify.delete(
		"/quiz/:quizId",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const quizId = getStringParam((request.params as any).quizId);
				if (!quizId) return reply.code(400).send({ error: "ID inválido" });
				await drizzleDb.delete("quiz", { id: quizId });
				await logActivity(request.userId!, "Excluir Quiz", `Quiz ID: ${quizId}`);
				return reply.send({ success: true });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao excluir quiz" });
			}
		},
	);

	// POST /api/cms/cursos/quiz/:quizId/perguntas - Add question to quiz
	fastify.post(
		"/quiz/:quizId/perguntas",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { pergunta, opcaoA, opcaoB, opcaoC, opcaoD, correta, ordem } = request.body as any;
				const quizId = getStringParam((request.params as any).quizId);
				if (!quizId) return reply.code(400).send({ error: "ID inválido" });
				if (!pergunta || !opcaoA || !opcaoB || !correta) {
					return reply.code(400).send({ error: "Pergunta, opção A, opção B e resposta correta são obrigatórias" });
				}

				const maxOrdem = await drizzleDb.aggregate("quizPergunta", {
					where: { quizId },
					_max: { ordem: true },
				});

				const newPergunta = await drizzleDb.create("quizPergunta", {
					quizId,
					pergunta,
					opcaoA,
					opcaoB,
					opcaoC: opcaoC || null,
					opcaoD: opcaoD || null,
					correta,
					ordem: typeof ordem === "number" ? ordem : (maxOrdem._max.ordem ?? 0) + 1,
				});
				return reply.code(201).send(newPergunta);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao criar pergunta" });
			}
		},
	);

	// PUT /api/cms/cursos/perguntas/:perguntaId - Update question
	fastify.put(
		"/perguntas/:perguntaId",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { pergunta, opcaoA, opcaoB, opcaoC, opcaoD, correta, ordem } = request.body as any;
				const perguntaId = getStringParam((request.params as any).perguntaId);
				if (!perguntaId) return reply.code(400).send({ error: "ID inválido" });
				const updated = await drizzleDb.update(
					"quizPergunta",
					{ id: perguntaId },
					{
						pergunta,
						opcaoA,
						opcaoB,
						opcaoC,
						opcaoD,
						correta,
						ordem,
					},
				);
				return reply.send(updated);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao atualizar pergunta" });
			}
		},
	);

	// DELETE /api/cms/cursos/perguntas/:perguntaId - Delete question
	fastify.delete(
		"/perguntas/:perguntaId",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const perguntaId = getStringParam((request.params as any).perguntaId);
				if (!perguntaId) return reply.code(400).send({ error: "ID inválido" });
				await drizzleDb.delete("quizPergunta", { id: perguntaId });
				return reply.send({ success: true });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao excluir pergunta" });
			}
		},
	);

	// POST /api/cms/cursos/quiz/:quizId/responder - Submit quiz answers
	fastify.post(
		"/quiz/:quizId/responder",
		{ preHandler: [authenticate] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { respostas } = request.body as any; // { perguntaId: 'A'|'B'|'C'|'D' }
				const quiz = await drizzleDb.findUnique("quiz", { id: (request.params as any).quizId });
				if (!quiz) {
					return reply.code(404).send({ error: "Quiz não encontrado" });
				}

				const perguntas = await drizzleDb.findMany("quizPergunta", { where: { quizId: quiz.id } });
				const quizWithPerguntas = { ...quiz, perguntas };

				const { correct, total, nota, concluido } = gradeQuiz(
					quizWithPerguntas.perguntas,
					respostas,
					quiz.notaMinima || 7,
				);

				const response = await drizzleDb.upsert(
					"quizResponse",
					{ quizId: quiz.id, userId: request.userId },
					{ quizId: quiz.id, userId: request.userId, nota, total, concluido, respostas: respostas || {} },
					{ nota, total, concluido, respostas: respostas || {} },
				);

				if (concluido) {
					if (correct > 0) {
						await awardPointsIfNotAwarded(request.userId!, "QUIZ_CORRECT", `QUIZ_CORRECT:quiz:${quiz.id}`);
					}
					await awardPointsIfNotAwarded(request.userId!, "QUIZ_PASS", `QUIZ_PASS:quiz:${quiz.id}`);
					await logActivity(request.userId!, "Quiz Aprovado", `Quiz: ${quiz.titulo} — Nota ${nota}/10`);

					// Mark lesson as completed only when quiz is passed
					const quizAula = await drizzleDb.findUnique("aula", { id: quiz.aulaId }, { select: { cursoId: true } });
					if (quizAula) {
						await drizzleDb.upsert(
							"progresso",
							{ cursoId: quizAula.cursoId, aulaId: quiz.aulaId, userId: request.userId },
							{ cursoId: quizAula.cursoId, aulaId: quiz.aulaId, userId: request.userId, concluido: true },
							{ concluido: true },
						);
					}

					// Notify gestor when ATENDENTE passes a quiz
					const quizUser = await drizzleDb.findUnique(
						"user",
						{ id: request.userId },
						{
							select: { id: true, nome: true, email: true, role: true, gestorId: true },
						},
					);
					if (quizUser?.role === "ATENDENTE" && quizUser.gestorId) {
						const gestor = await drizzleDb.findUnique(
							"user",
							{ id: quizUser.gestorId },
							{
								select: { id: true, nome: true, email: true },
							},
						);
						if (gestor) {
							const titulo = "Quiz Aprovado";
							const mensagem = `${quizUser.nome} aprovou no quiz "${quiz.titulo}" com nota ${nota}/10.`;
							drizzleDb
								.create("notification", { fromId: request.userId!, toId: gestor.id, titulo, mensagem })
								.catch(() => {});
							sendNotificationAlertEmail(gestor.email, gestor.nome || gestor.email, titulo).then((r) => {
								if (!r.success) logger.warn(`[EMAIL] Falha ao enviar quiz-notify para ${gestor.email}: ${r.error}`);
							});
						}
					}
				} else {
					await logActivity(request.userId!, "Quiz Reprovado", `Quiz: ${quiz.titulo} — Nota ${nota}/10`);
				}

				// Auto-generate certificate if: quiz passed + (autoGerarCertificado OR curso.autoCertificado) + ALL aulas completed
				if (concluido) {
					const aula = await drizzleDb.findUnique("aula", { id: quiz.aulaId });
					if (aula) {
						const curso = await drizzleDb.findUnique("curso", { id: aula.cursoId });
						if (curso) {
							const totalAulas = await drizzleDb.count("aula", { cursoId: aula.cursoId });
							if (quiz.autoGerarCertificado || curso.autoCertificado) {
								const allAulasCompleted = await drizzleDb.count("progresso", {
									cursoId: aula.cursoId,
									userId: request.userId,
									concluido: true,
								});

								if (allAulasCompleted >= totalAulas) {
									const certStatus = curso.autoCertificado ? "APPROVED" : "PENDING";
									try {
										await drizzleDb.upsert(
											"certificate",
											{ userId: request.userId, cursoId: aula.cursoId },
											{ userId: request.userId, cursoId: aula.cursoId, status: certStatus },
											{},
										);
										await awardPointsIfNotAwarded(request.userId!, "CERTIFICATE", `CERTIFICATE:curso:${aula.cursoId}`);
										await logActivity(request.userId!, "Certificado Gerado", `Curso: ${curso.titulo}`);

										// Notify gestor when ATENDENTE completes entire module
										const quizUser = await drizzleDb.findUnique(
											"user",
											{ id: request.userId },
											{
												select: { id: true, nome: true, role: true, gestorId: true },
											},
										);
										if (quizUser?.role === "ATENDENTE" && quizUser.gestorId) {
											const gestor = await drizzleDb.findUnique(
												"user",
												{ id: quizUser.gestorId },
												{
													select: { id: true, nome: true, email: true },
												},
											);
											if (gestor) {
												const titulo = "Curso Completo";
												const mensagem = `${quizUser.nome} completou o curso "${curso.titulo}" e recebeu o certificado.`;
												drizzleDb
													.create("notification", { fromId: request.userId!, toId: gestor.id, titulo, mensagem })
													.catch(() => {});
											}
										}
									} catch {
										// Certificate already exists (race condition), skip
									}
								}
							}
						}
					}
				}

				return reply.send({ nota, total, correct, concluido, aulaId: quiz.aulaId, response });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao enviar respostas" });
			}
		},
	);

	// GET /api/cms/cursos/quiz/:quizId/resultados - Get quiz results
	fastify.get(
		"/quiz/:quizId/resultados",
		{ preHandler: [authenticate] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const where: any = { quizId: (request.params as any).quizId };
				if (request.userRole !== "ADMIN") {
					where.userId = request.userId;
				}
				const responses = await drizzleDb.findMany("quizResponse", {
					where,
					orderBy: { createdAt: "desc" },
				});

				const userIds = [...new Set(responses.map((r: any) => r.userId).filter(Boolean))];
				const users = userIds.length
					? await drizzleDb.findMany("user", {
							where: { id: { in: userIds } },
							select: { id: true, nome: true, email: true },
						})
					: [];
				const userById: Record<string, any> = {};
				for (const u of users) userById[u.id] = u;

				const result = responses.map((r: any) => ({ ...r, user: userById[r.userId] || null }));
				return reply.send(result);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar resultados" });
			}
		},
	);

	// POST /api/cms/cursos/:id/open - Track module open
	fastify.post("/:id/open", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const id = getStringParam((request.params as any).id);
			if (!id) return reply.code(400).send({ error: "ID invalido" });

			const curso = await drizzleDb.findUnique("curso", { id });
			if (!curso) return reply.code(404).send({ error: "Curso nao encontrado" });

			await awardPointsIfNotAwarded(request.userId!, "MODULE_OPEN", `MODULE_OPEN:curso:${id}`);
			await logActivity(request.userId!, "Curso Aberto", `Curso: ${curso.titulo}`);

			return reply.send({ message: "Curso registrado" });
		} catch (error) {
			logger.error("[ROUTE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao registrar abertura do curso" });
		}
	});

	// POST /api/cms/cursos/aula/:aulaId/view - Track lesson view
	fastify.post(
		"/aula/:aulaId/view",
		{ preHandler: [authenticate] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const aulaId = getStringParam((request.params as any).aulaId);
				if (!aulaId) return reply.code(400).send({ error: "ID invalido" });

				const aula = await drizzleDb.findUnique("aula", { id: aulaId }, { select: { id: true, titulo: true } });
				if (!aula) return reply.code(404).send({ error: "Aula nao encontrada" });

				// Award LESSON_VIEW points
				await awardPointsIfNotAwarded(request.userId!, "LESSON_VIEW", `LESSON_VIEW:aula:${aulaId}`);
				await logActivity(request.userId!, "Licao Visualizada", `Aula: ${aula.titulo}`);

				return reply.send({ message: "Visualização registrada" });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao registrar visualização" });
			}
		},
	);

	// GET /api/cms/cursos/gamification/leaderboard
	fastify.get(
		"/gamification/leaderboard",
		{ preHandler: [authenticate] },
		async (_request: FastifyRequest, reply: FastifyReply) => {
			try {
				const users = await drizzleDb.findMany("user", {
					select: { id: true, nome: true, email: true, role: true, xp: true },
					orderBy: { xp: "desc" },
					take: 20,
				});

				const result = users.map((u: any, i: number) => ({
					...u,
					rank: i + 1,
					level: Math.floor(u.xp / 2000) + 1,
				}));

				return reply.send(result);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar leaderboard" });
			}
		},
	);

	// GET /api/cms/cursos/gamification/stats
	fastify.get(
		"/gamification/stats",
		{ preHandler: [authenticate] },
		async (_request: FastifyRequest, reply: FastifyReply) => {
			try {
				const totalXpResult = await drizzleDb.aggregate("user", {
					_sum: { xp: true },
					_avg: { xp: true },
					_count: { id: true },
				});

				const topActions = await drizzleDb.groupBy("pointsTransaction", {
					by: ["action"],
					_sum: { points: true },
					_count: { id: true },
					orderBy: { _sum: { points: "desc" } },
				});

				return reply.send({
					totalXpDistributed: totalXpResult._sum.xp || 0,
					averageXp: Math.round(totalXpResult._avg.xp || 0),
					totalUsers: totalXpResult._count.id,
					topActions,
				});
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar estatisticas de gamificacao" });
			}
		},
	);

	done();
};

export default cmsRoutes;
