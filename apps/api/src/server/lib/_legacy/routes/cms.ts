import { Router } from "express";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { gradeQuiz } from "../lib/quiz";
import { authenticate, authorize } from "../middleware/auth";
import { sendNotificationAlertEmail } from "../services/email";
import { awardPointsIfNotAwarded } from "../services/gamification";
import { logActivity } from "../services/log";
import { getStringParam } from "../utils/queryParams";

const router = Router();

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
	const out: Record<string, T[]> = {};
	for (const item of arr) {
		const k = String(item[key]);
		if (!out[k]) out[k] = [];
		out[k].push(item);
	}
	return out;
}

// POST /api/cms/reorder - Reordenar itens atribuindo ordens sequenciais (0,1,2,...)
// Usado pelo drag-and-drop nas tabelas de cursos/aulas/perguntas.
router.post("/reorder", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const { tipo, ids } = req.body as {
			tipo: "curso" | "aula" | "quizPergunta";
			ids: string[];
		};

		if (!tipo || !Array.isArray(ids)) {
			return res.status(400).json({ error: "tipo e ids[] são obrigatórios" });
		}

		const modelName =
			tipo === "curso" ? "curso" : tipo === "aula" ? "aula" : tipo === "quizPergunta" ? "quizPergunta" : null;
		if (!modelName) {
			return res.status(400).json({ error: "tipo inválido" });
		}

		let affected = 0;
		for (let i = 0; i < ids.length; i++) {
			await drizzleDb.update(modelName, { id: ids[i] }, { ordem: i });
			affected++;
		}

		await logActivity(req.userId!, "Reordenar", `${tipo}: ${ids.length} itens`);
		res.json({ success: true, affected });
	} catch (error: any) {
		logger.error("[REORDER ERROR]", error);
		res.status(500).json({ error: error?.message || "Erro ao reordenar" });
	}
});

// GET /api/cms/cursos - accessible to all authenticated users, filtered by role
router.get("/", authenticate, async (req: any, res) => {
	try {
		const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
		const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
		const skip = (page - 1) * limit;

		const userRole = req.userRole;
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
				// Filter by role: admin sees all; others see modules with no restriction or their role included
				if (isAdmin) return true;
				if (!mod.rolesPermitidos) return true;
				const roles = mod.rolesPermitidos as unknown as string[];
				if (!Array.isArray(roles) || roles.length === 0) return true;
				return roles.includes(userRole);
			});

		const filteredTotal = cursos.length;
		const paginatedModulos = cursos.slice(skip, skip + limit);

		res.json({
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
		res.status(500).json({ error: "Erro ao buscar cursos" });
	}
});

// GET /api/cms/:id - Get single curso
router.get("/:id", authenticate, async (req: any, res) => {
	try {
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "ID inválido" });
		const curso = await drizzleDb.findUnique("curso", { id });
		if (!curso) return res.status(404).json({ error: "Módulo não encontrado" });

		const [aulas, progressos] = await Promise.all([
			drizzleDb.findMany("aula", { where: { cursoId: id }, select: { id: true } }),
			drizzleDb.count("progresso", { cursoId: id }),
		]);

		res.json({
			...curso,
			aulas,
			_count: { aulas: aulas.length, progressos },
		});
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar módulo" });
	}
});

// POST /api/cms/cursos
router.post("/", authenticate, authorize("ADMIN"), async (req: any, res) => {
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
		} = req.body;
		if (!titulo) {
			return res.status(400).json({ error: "Título é obrigatório" });
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
		await logActivity(req.userId!, "Criar Curso", `Curso: ${titulo}`);
		res.status(201).json(curso);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao criar módulo" });
	}
});

// PUT /api/cms/cursos/:id
router.put("/:id", authenticate, authorize("ADMIN"), async (req: any, res) => {
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
		} = req.body;
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "ID inválido" });
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
		await logActivity(req.userId!, "Editar Curso", `Curso: ${curso.titulo}`);
		res.json(curso);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao atualizar módulo" });
	}
});

// DELETE /api/cms/cursos/:id
router.delete("/:id", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "ID inválido" });
		await drizzleDb.delete("curso", { id });
		await logActivity(req.userId!, "Excluir Curso", `Curso ID: ${id}`);
		res.json({ success: true });
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao excluir módulo" });
	}
});

// GET /api/cursos/:id/aulas
router.get("/:id/aulas", authenticate, async (req: any, res) => {
	try {
		const cursoId = getStringParam(req.params.id);
		if (!cursoId) return res.status(400).json({ error: "ID inválido" });

		const cursoExists = await drizzleDb.findUnique("curso", { id: cursoId }, { select: { id: true } });
		if (!cursoExists) return res.status(404).json({ error: "Módulo não encontrado" });

		const userRole = req.userRole;
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
				where: { aulaId: { $in: aulaIds }, userId: req.userId },
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
		let aulas = aulasRaw
			.filter((aula: any) => {
				if (isAdmin) return true;
				if (!aula.rolesPermitidos) return true;
				const roles = aula.rolesPermitidos as unknown as string[];
				if (!Array.isArray(roles) || roles.length === 0) return true;
				return roles.includes(userRole);
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

		res.json(result);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar aulas" });
	}
});

// POST /api/cursos/:id/aulas
router.post("/:id/aulas", authenticate, authorize("ADMIN"), async (req: any, res) => {
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
		} = req.body;
		const cursoId = getStringParam(req.params.id);
		if (!cursoId) return res.status(400).json({ error: "ID inválido" });

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
		await logActivity(req.userId!, "Criar Aula", `Aula: ${titulo}`);
		res.status(201).json(aula);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao criar aula" });
	}
});

// PUT /api/aulas/:id
router.put("/aulas/:id", authenticate, authorize("ADMIN"), async (req: any, res) => {
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
		} = req.body;
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "ID inválido" });
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
		await logActivity(req.userId!, "Editar Aula", `Aula: ${aula.titulo}`);
		res.json(aula);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao atualizar aula" });
	}
});

// DELETE /api/aulas/:id
router.delete("/aulas/:id", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "ID inválido" });
		await drizzleDb.delete("aula", { id });
		await logActivity(req.userId!, "Excluir Aula", `Aula ID: ${id}`);
		res.json({ success: true });
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao excluir aula" });
	}
});

// ==================== LICAO ENDPOINTS ====================

// GET /api/cms/aulas/:aulaId/licoes
router.get("/aulas/:aulaId/licoes", authenticate, async (req: any, res) => {
	try {
		const aulaId = getStringParam(req.params.aulaId);
		if (!aulaId) return res.status(400).json({ error: "ID inválido" });

		const licoes = await drizzleDb.findMany("licao", {
			where: { aulaId },
			orderBy: { ordem: "asc" },
		});
		res.json(licoes);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar lições" });
	}
});

// POST /api/cms/aulas/:aulaId/licoes
router.post("/aulas/:aulaId/licoes", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const aulaId = getStringParam(req.params.aulaId);
		if (!aulaId) return res.status(400).json({ error: "ID inválido" });

		const { titulo, conteudo, tipo, duracaoMin, inicioSeg, fimSeg } = req.body;
		if (!titulo) return res.status(400).json({ error: "Título é obrigatório" });

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
		await logActivity(req.userId!, "Criar Licao", `Licao: ${titulo}`);
		res.status(201).json(licao);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao criar lição" });
	}
});

// PUT /api/cms/licoes/:id
router.put("/licoes/:id", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "ID inválido" });

		const { titulo, conteudo, tipo, ordem, duracaoMin, inicioSeg, fimSeg } = req.body;
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
		await logActivity(req.userId!, "Editar Licao", `Licao: ${licao.titulo}`);
		res.json(licao);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao atualizar lição" });
	}
});

// DELETE /api/cms/licoes/:id
router.delete("/licoes/:id", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "ID inválido" });
		await drizzleDb.delete("licao", { id });
		await logActivity(req.userId!, "Excluir Licao", `Licao ID: ${id}`);
		res.json({ success: true });
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao excluir lição" });
	}
});

// ==================== QUIZ ENDPOINTS ====================

// POST /api/cursos/:cursoId/quiz - Create quiz for an aula
router.post("/:cursoId/quiz", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const { aulaId, titulo, autoGerarCertificado, notaMinima, rolesPermitidos } = req.body;
		if (!aulaId || !titulo) {
			return res.status(400).json({ error: "aulaId e titulo são obrigatórios" });
		}

		const existing = await drizzleDb.findUnique("quiz", { aulaId });
		if (existing) {
			return res.status(409).json({ error: "Esta aula já possui um quiz" });
		}

		const quiz = await drizzleDb.create("quiz", {
			aulaId,
			titulo,
			autoGerarCertificado: autoGerarCertificado || false,
			notaMinima: typeof notaMinima === "number" ? notaMinima : 7,
			rolesPermitidos: rolesPermitidos || null,
		});
		await logActivity(req.userId!, "Criar Quiz", `Quiz: ${titulo}`);
		res.status(201).json(quiz);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao criar quiz" });
	}
});

// GET /api/cursos/:cursoId/quiz/:aulaId - Get quiz with questions
router.get("/:cursoId/quiz/:aulaId", authenticate, async (req: any, res) => {
	try {
		const aulaId = getStringParam(req.params.aulaId);
		if (!aulaId) return res.status(400).json({ error: "ID inválido" });
		const quiz = await drizzleDb.findUnique("quiz", { aulaId });
		if (!quiz) {
			return res.status(404).json({ error: "Quiz não encontrado" });
		}
		const perguntas = await drizzleDb.findMany("quizPergunta", {
			where: { quizId: quiz.id },
			orderBy: { ordem: "asc" },
		});
		res.json({ ...quiz, perguntas });
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar quiz" });
	}
});

// PUT /api/cursos/quiz/:quizId - Update quiz
router.put("/quiz/:quizId", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const { titulo, autoGerarCertificado, notaMinima, rolesPermitidos } = req.body;
		const quizId = getStringParam(req.params.quizId);
		if (!quizId) return res.status(400).json({ error: "ID inválido" });
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
		await logActivity(req.userId!, "Editar Quiz", `Quiz: ${quiz.titulo}`);
		res.json(quiz);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao atualizar quiz" });
	}
});

// DELETE /api/cursos/quiz/:quizId - Delete quiz
router.delete("/quiz/:quizId", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const quizId = getStringParam(req.params.quizId);
		if (!quizId) return res.status(400).json({ error: "ID inválido" });
		await drizzleDb.delete("quiz", { id: quizId });
		await logActivity(req.userId!, "Excluir Quiz", `Quiz ID: ${quizId}`);
		res.json({ success: true });
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao excluir quiz" });
	}
});

// POST /api/cursos/quiz/:quizId/perguntas - Add question to quiz
router.post("/quiz/:quizId/perguntas", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const { pergunta, opcaoA, opcaoB, opcaoC, opcaoD, correta, ordem } = req.body;
		const quizId = getStringParam(req.params.quizId);
		if (!quizId) return res.status(400).json({ error: "ID inválido" });
		if (!pergunta || !opcaoA || !opcaoB || !correta) {
			return res.status(400).json({ error: "Pergunta, opção A, opção B e resposta correta são obrigatórias" });
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
		res.status(201).json(newPergunta);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao criar pergunta" });
	}
});

// PUT /api/cursos/perguntas/:perguntaId - Update question
router.put("/perguntas/:perguntaId", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const { pergunta, opcaoA, opcaoB, opcaoC, opcaoD, correta, ordem } = req.body;
		const perguntaId = getStringParam(req.params.perguntaId);
		if (!perguntaId) return res.status(400).json({ error: "ID inválido" });
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
		res.json(updated);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao atualizar pergunta" });
	}
});

// DELETE /api/cursos/perguntas/:perguntaId - Delete question
router.delete("/perguntas/:perguntaId", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const perguntaId = getStringParam(req.params.perguntaId);
		if (!perguntaId) return res.status(400).json({ error: "ID inválido" });
		await drizzleDb.delete("quizPergunta", { id: perguntaId });
		res.json({ success: true });
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao excluir pergunta" });
	}
});

// POST /api/cursos/quiz/:quizId/responder - Submit quiz answers
router.post("/quiz/:quizId/responder", authenticate, async (req: any, res) => {
	try {
		const { respostas } = req.body; // { perguntaId: 'A'|'B'|'C'|'D' }
		const quiz = await drizzleDb.findUnique("quiz", { id: req.params.quizId });
		if (!quiz) {
			return res.status(404).json({ error: "Quiz não encontrado" });
		}

		const perguntas = await drizzleDb.findMany("quizPergunta", { where: { quizId: quiz.id } });
		const quizWithPerguntas = { ...quiz, perguntas };

		const { correct, total, nota, concluido } = gradeQuiz(quizWithPerguntas.perguntas, respostas, quiz.notaMinima || 7);

		const response = await drizzleDb.upsert(
			"quizResponse",
			{ quizId: quiz.id, userId: req.userId },
			{ quizId: quiz.id, userId: req.userId, nota, total, concluido, respostas: respostas || {} },
			{ nota, total, concluido, respostas: respostas || {} },
		);

		if (concluido) {
			if (correct > 0) {
				await awardPointsIfNotAwarded(req.userId, "QUIZ_CORRECT", `QUIZ_CORRECT:quiz:${quiz.id}`);
			}
			await awardPointsIfNotAwarded(req.userId, "QUIZ_PASS", `QUIZ_PASS:quiz:${quiz.id}`);
			await logActivity(req.userId, "Quiz Aprovado", `Quiz: ${quiz.titulo} — Nota ${nota}/10`);

			// Mark lesson as completed only when quiz is passed
			const quizAula = await drizzleDb.findUnique("aula", { id: quiz.aulaId }, { select: { cursoId: true } });
			if (quizAula) {
				await drizzleDb.upsert(
					"progresso",
					{ cursoId: quizAula.cursoId, aulaId: quiz.aulaId, userId: req.userId },
					{ cursoId: quizAula.cursoId, aulaId: quiz.aulaId, userId: req.userId, concluido: true },
					{ concluido: true },
				);
			}

			// Notify gestor when ATENDENTE passes a quiz
			const quizUser = await drizzleDb.findUnique(
				"user",
				{ id: req.userId },
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
					drizzleDb.create("notification", { fromId: req.userId, toId: gestor.id, titulo, mensagem }).catch(() => {});
					sendNotificationAlertEmail(gestor.email, gestor.nome || gestor.email, titulo).then((r) => {
						if (!r.success) logger.warn(`[EMAIL] Falha ao enviar quiz-notify para ${gestor.email}: ${r.error}`);
					});
				}
			}
		} else {
			await logActivity(req.userId, "Quiz Reprovado", `Quiz: ${quiz.titulo} — Nota ${nota}/10`);
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
							userId: req.userId,
							concluido: true,
						});

						if (allAulasCompleted >= totalAulas) {
							const certStatus = curso.autoCertificado ? "APPROVED" : "PENDING";
							try {
								await drizzleDb.upsert(
									"certificate",
									{ userId: req.userId, cursoId: aula.cursoId },
									{ userId: req.userId, cursoId: aula.cursoId, status: certStatus },
									{},
								);
								await awardPointsIfNotAwarded(req.userId, "CERTIFICATE", `CERTIFICATE:curso:${aula.cursoId}`);
								await logActivity(req.userId, "Certificado Gerado", `Curso: ${curso.titulo}`);

								// Notify gestor when ATENDENTE completes entire module
								const quizUser = await drizzleDb.findUnique(
									"user",
									{ id: req.userId },
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
											.create("notification", { fromId: req.userId, toId: gestor.id, titulo, mensagem })
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

		res.json({ nota, total, correct, concluido, aulaId: quiz.aulaId, response });
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao enviar respostas" });
	}
});

// GET /api/cursos/quiz/:quizId/resultados - Get quiz results
router.get("/quiz/:quizId/resultados", authenticate, async (req: any, res) => {
	try {
		const where: any = { quizId: req.params.quizId };
		if (req.userRole !== "ADMIN") {
			where.userId = req.userId;
		}
		const responses = await drizzleDb.findMany("quizResponse", {
			where,
			orderBy: { createdAt: "desc" },
		});

		const userIds = [...new Set(responses.map((r: any) => r.userId).filter(Boolean))];
		const users = userIds.length
			? await drizzleDb.findMany("user", {
					where: { id: { $in: userIds } },
					select: { id: true, nome: true, email: true },
			  })
			: [];
		const userById: Record<string, any> = {};
		for (const u of users) userById[u.id] = u;

		const result = responses.map((r: any) => ({ ...r, user: userById[r.userId] || null }));
		res.json(result);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar resultados" });
	}
});

// POST /api/cursos/:id/open - Track module open
router.post("/:id/open", authenticate, async (req: any, res) => {
	try {
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "ID invalido" });

		const curso = await drizzleDb.findUnique("curso", { id });
		if (!curso) return res.status(404).json({ error: "Curso nao encontrado" });

		await awardPointsIfNotAwarded(req.userId, "MODULE_OPEN", `MODULE_OPEN:curso:${id}`);
		await logActivity(req.userId, "Curso Aberto", `Curso: ${curso.titulo}`);

		res.json({ message: "Curso registrado" });
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao registrar abertura do curso" });
	}
});

// POST /api/cursos/aula/:aulaId/view - Track lesson view (XP for viewing a lesson)
router.post("/aula/:aulaId/view", authenticate, async (req: any, res) => {
	try {
		const aulaId = getStringParam(req.params.aulaId);
		if (!aulaId) return res.status(400).json({ error: "ID invalido" });

		const aula = await drizzleDb.findUnique("aula", { id: aulaId }, { select: { id: true, titulo: true } });
		if (!aula) return res.status(404).json({ error: "Aula nao encontrada" });

		// Award LESSON_VIEW points (dedup per aula per user — once per view session is enough)
		await awardPointsIfNotAwarded(req.userId, "LESSON_VIEW", `LESSON_VIEW:aula:${aulaId}`);
		await logActivity(req.userId, "Licao Visualizada", `Aula: ${aula.titulo}`);

		res.json({ message: "Visualização registrada" });
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao registrar visualização" });
	}
});

// GET /api/cursos/gamification/leaderboard - Get leaderboard
router.get("/gamification/leaderboard", authenticate, async (_req: any, res) => {
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

		res.json(result);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar leaderboard" });
	}
});

// GET /api/cursos/gamification/stats - Get gamification stats
router.get("/gamification/stats", authenticate, async (_req: any, res) => {
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

		res.json({
			totalXpDistributed: totalXpResult._sum.xp || 0,
			averageXp: Math.round(totalXpResult._avg.xp || 0),
			totalUsers: totalXpResult._count.id,
			topActions,
		});
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar estatisticas de gamificacao" });
	}
});

export default router;
