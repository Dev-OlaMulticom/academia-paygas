import type { FastifyInstance, FastifyPluginCallback, FastifyReply } from "fastify";
import { authenticate, authorize } from "../fastify-plugins/auth";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { logActivity } from "../services/log";

/**
 * Import/Export routes — migrated from Express routes/import-export.ts.
 * All endpoints require ADMIN. Registered with prefix /api/import-export
 * and an increased bodyLimit (10mb) for large CSV payloads.
 */
const importExportRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	// ==================== CSV UTILITIES ====================

	function escapeCsvField(value: string | number | boolean | null | undefined): string {
		if (value === null || value === undefined) return "";
		const str = String(value);
		if (str.includes(",") || str.includes('"') || str.includes("\n")) {
			return `"${str.replace(/"/g, '""')}"`;
		}
		return str;
	}

	function parseCsvLine(line: string): string[] {
		const fields: string[] = [];
		let current = "";
		let inQuotes = false;
		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (inQuotes) {
				if (ch === '"') {
					if (i + 1 < line.length && line[i + 1] === '"') {
						current += '"';
						i++;
					} else {
						inQuotes = false;
					}
				} else {
					current += ch;
				}
			} else {
				if (ch === '"') {
					inQuotes = true;
				} else if (ch === ",") {
					fields.push(current.trim());
					current = "";
				} else {
					current += ch;
				}
			}
		}
		fields.push(current.trim());
		return fields;
	}

	function parseCsv(text: string): { headers: string[]; rows: string[][] } {
		const lines = text
			.replace(/\r\n/g, "\n")
			.replace(/\r/g, "\n")
			.split("\n")
			.filter((l) => l.trim());
		if (lines.length < 2) return { headers: [], rows: [] };
		const headers = parseCsvLine(lines[0]);
		const rows = lines.slice(1).map(parseCsvLine);
		return { headers, rows };
	}

	function rowsToObjects(headers: string[], rows: string[][]): Record<string, string>[] {
		return rows.map((row) => {
			const obj: Record<string, string> = {};
			headers.forEach((h, i) => {
				obj[h] = row[i] || "";
			});
			return obj;
		});
	}

	function sendCsv(reply: FastifyReply, filename: string, csvContent: string) {
		reply.header("Content-Type", "text/csv; charset=utf-8");
		reply.header("Content-Disposition", `attachment; filename="${filename}"`);
		return reply.send(`\uFEFF${csvContent}`);
	}

	function parseBool(val: string | undefined): boolean {
		if (!val) return false;
		const v = val.trim().toLowerCase();
		return v === "true" || v === "1" || v === "sim";
	}

	function parseIntSafe(val: string | undefined): number | null {
		if (!val?.trim()) return null;
		const n = Number.parseInt(val.trim(), 10);
		return Number.isNaN(n) ? null : n;
	}

	const VALID_TIPOS = ["VIDEO", "PDF", "TEXTO"];
	const VALID_CORRETA = ["A", "B", "C", "D"];

	// Unified CSV column order
	const UNIFIED_HEADERS = [
		"tipo",
		"id",
		"curso_id",
		"curso_titulo",
		"aula_id",
		"aula_titulo",
		"titulo",
		"descricao",
		"ordem",
		"obrigatorio",
		"autoCertificado",
		"videoUrl",
		"pdfUrl",
		"tipo_aula",
		"duracaoMin",
		"videoInicio",
		"videoFim",
		"conteudo",
		"inicioSeg",
		"fimSeg",
		"quiz_titulo",
		"notaMinima",
		"autoGerarCertificado",
		"pergunta_id",
		"pergunta",
		"opcaoA",
		"opcaoB",
		"opcaoC",
		"opcaoD",
		"correta",
	];

	type CsvType = "curso" | "aula" | "licao" | "quiz_pergunta";

	function detectCsvType(headers: string[]): CsvType | null {
		const h = new Set(headers.map((x) => x.toLowerCase().trim()));
		if (h.has("tipo")) return null; // unified CSV, read tipo from each row
		if (h.has("pergunta")) return "quiz_pergunta";
		if (
			h.has("aula_titulo") &&
			(h.has("conteudo") || h.has("inicioseg") || (h.has("titulo") && !h.has("curso_titulo")))
		)
			return "licao";
		if (h.has("curso_titulo") && h.has("titulo") && !h.has("pergunta")) return "aula";
		if (h.has("titulo") && h.has("descricao") && !h.has("curso_titulo")) return "curso";
		return null;
	}

	// ==================== EXPORT (with IDs) ====================

	fastify.get("/export/cursos", { preHandler: [authenticate, authorize("ADMIN")] }, async (_req: any, reply) => {
		try {
			const cursos = await drizzleDb.findMany("curso", {
				orderBy: { ordem: "asc" },
			});
			const headers = [
				"id",
				"titulo",
				"descricao",
				"ordem",
				"obrigatorio",
				"autoCertificado",
				"videoUrl",
				"videoInicio",
				"videoFim",
			];
			const rows = cursos.map((m: any) => headers.map((h: string) => escapeCsvField((m as any)[h])));
			const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
			sendCsv(reply, "cursos.csv", csv);
		} catch (error) {
			logger.error("[EXPORT ERROR]", error);
			reply.code(500).send({ error: "Erro ao exportar cursos" });
		}
	});

	fastify.get("/export/aulas", { preHandler: [authenticate, authorize("ADMIN")] }, async (_req: any, reply) => {
		try {
			const aulasRaw = (await drizzleDb.findMany("aula", { orderBy: { ordem: "asc" } })) as any[];
			const cursoIds = [...new Set(aulasRaw.map((a: any) => a.cursoId).filter(Boolean))];
			const cursos = (await drizzleDb.findMany("curso", {
				where: { id: { in: cursoIds } },
				select: { id: true, titulo: true, ordem: true },
			})) as any[];
			const cursoMap = new Map(cursos.map((c: any) => [c.id, c]));
			const aulas = aulasRaw
				.map((a: any) => ({ ...a, curso: cursoMap.get(a.cursoId) }))
				.sort((a: any, b: any) => {
					const ca = a.curso || { ordem: 0 };
					const cb = b.curso || { ordem: 0 };
					if (ca.ordem !== cb.ordem) return (ca.ordem || 0) - (cb.ordem || 0);
					return (a.ordem || 0) - (b.ordem || 0);
				});
			const headers = [
				"id",
				"curso_id",
				"curso_titulo",
				"titulo",
				"descricao",
				"tipo",
				"videoUrl",
				"pdfUrl",
				"obrigatorio",
				"duracaoMin",
				"videoInicio",
				"videoFim",
			];
			const rows = aulas.map((a: any) => [
				escapeCsvField(a.id),
				escapeCsvField(a.curso.id),
				escapeCsvField(a.curso.titulo),
				escapeCsvField(a.titulo),
				escapeCsvField(a.descricao),
				escapeCsvField(a.tipo),
				escapeCsvField(a.videoUrl),
				escapeCsvField(a.pdfUrl),
				escapeCsvField(a.obrigatorio),
				escapeCsvField(a.duracaoMin),
				escapeCsvField(a.videoInicio),
				escapeCsvField(a.videoFim),
			]);
			const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
			sendCsv(reply, "aulas.csv", csv);
		} catch (error) {
			logger.error("[EXPORT ERROR]", error);
			reply.code(500).send({ error: "Erro ao exportar aulas" });
		}
	});

	fastify.get("/export/licoes", { preHandler: [authenticate, authorize("ADMIN")] }, async (_req: any, reply) => {
		try {
			const licoesRaw = (await drizzleDb.findMany("licao", { orderBy: { ordem: "asc" } })) as any[];
			const aulaIds = [...new Set(licoesRaw.map((l: any) => l.aulaId).filter(Boolean))];
			const aulas = (await drizzleDb.findMany("aula", {
				where: { id: { in: aulaIds } },
				select: { id: true, titulo: true, ordem: true, cursoId: true },
			})) as any[];
			const cursoIds = [...new Set(aulas.map((a: any) => a.cursoId).filter(Boolean))];
			const cursos = (await drizzleDb.findMany("curso", {
				where: { id: { in: cursoIds } },
				select: { id: true, titulo: true, ordem: true },
			})) as any[];
			const cursoMap = new Map(cursos.map((c: any) => [c.id, c]));
			const aulaMap = new Map(aulas.map((a: any) => [a.id, { ...a, curso: cursoMap.get(a.cursoId) }]));
			const licoes = licoesRaw
				.map((l: any) => ({ ...l, aula: aulaMap.get(l.aulaId) }))
				.sort((a: any, b: any) => {
					const ca = a.aula?.curso || { ordem: 0 };
					const cb = b.aula?.curso || { ordem: 0 };
					if (ca.ordem !== cb.ordem) return (ca.ordem || 0) - (cb.ordem || 0);
					const aa = a.aula || { ordem: 0 };
					const ab = b.aula || { ordem: 0 };
					if (aa.ordem !== ab.ordem) return (aa.ordem || 0) - (ab.ordem || 0);
					return (a.ordem || 0) - (b.ordem || 0);
				});
			const headers = [
				"id",
				"curso_id",
				"curso_titulo",
				"aula_id",
				"aula_titulo",
				"titulo",
				"tipo",
				"conteudo",
				"duracaoMin",
				"inicioSeg",
				"fimSeg",
			];
			const rows = licoes.map((l: any) => [
				escapeCsvField(l.id),
				escapeCsvField(l.aula.curso.id),
				escapeCsvField(l.aula.curso.titulo),
				escapeCsvField(l.aula.id),
				escapeCsvField(l.aula.titulo),
				escapeCsvField(l.titulo),
				escapeCsvField(l.tipo),
				escapeCsvField(l.conteudo),
				escapeCsvField(l.duracaoMin),
				escapeCsvField(l.inicioSeg),
				escapeCsvField(l.fimSeg),
			]);
			const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
			sendCsv(reply, "licoes.csv", csv);
		} catch (error) {
			logger.error("[EXPORT ERROR]", error);
			reply.code(500).send({ error: "Erro ao exportar licoes" });
		}
	});

	fastify.get("/export/quiz", { preHandler: [authenticate, authorize("ADMIN")] }, async (_req: any, reply) => {
		try {
			const quizzesRaw = (await drizzleDb.findMany("quiz")) as any[];
			const aulaIds = [...new Set(quizzesRaw.map((q: any) => q.aulaId).filter(Boolean))];
			const aulas = (await drizzleDb.findMany("aula", {
				where: { id: { in: aulaIds } },
				select: { id: true, titulo: true, ordem: true, cursoId: true },
			})) as any[];
			const cursoIds = [...new Set(aulas.map((a: any) => a.cursoId).filter(Boolean))];
			const cursos = (await drizzleDb.findMany("curso", {
				where: { id: { in: cursoIds } },
				select: { id: true, titulo: true, ordem: true },
			})) as any[];
			const quizIds = quizzesRaw.map((q: any) => q.id);
			const perguntas = quizIds.length
				? ((await drizzleDb.findMany("quizPergunta", {
						where: { quizId: { in: quizIds } },
						orderBy: { ordem: "asc" },
					})) as any[])
				: [];
			const perguntasByQuiz = perguntas.reduce(
				(acc: Record<string, any[]>, p: any) => {
					acc[p.quizId] = acc[p.quizId] || [];
					acc[p.quizId].push(p);
					return acc;
				},
				{} as Record<string, any[]>,
			);
			const cursoMap = new Map(cursos.map((c: any) => [c.id, c]));
			const aulaMap = new Map(aulas.map((a: any) => [a.id, { ...a, curso: cursoMap.get(a.cursoId) }]));
			const quizzes = quizzesRaw
				.map((q: any) => ({ ...q, aula: aulaMap.get(q.aulaId), perguntas: perguntasByQuiz[q.id] || [] }))
				.sort((a: any, b: any) => {
					const ca = a.aula?.curso || { ordem: 0 };
					const cb = b.aula?.curso || { ordem: 0 };
					if (ca.ordem !== cb.ordem) return (ca.ordem || 0) - (cb.ordem || 0);
					const aa = a.aula || { ordem: 0 };
					const ab = b.aula || { ordem: 0 };
					if (aa.ordem !== ab.ordem) return (aa.ordem || 0) - (ab.ordem || 0);
					return 0;
				});
			const headers = [
				"curso_id",
				"curso_titulo",
				"aula_id",
				"aula_titulo",
				"quiz_id",
				"quiz_titulo",
				"notaMinima",
				"autoGerarCertificado",
				"pergunta_id",
				"pergunta",
				"opcaoA",
				"opcaoB",
				"opcaoC",
				"opcaoD",
				"correta",
			];
			const rows: string[][] = [];
			for (const quiz of quizzes) {
				if (quiz.perguntas.length === 0) {
					rows.push([
						escapeCsvField(quiz.aula.curso.id),
						escapeCsvField(quiz.aula.curso.titulo),
						escapeCsvField(quiz.aula.id),
						escapeCsvField(quiz.aula.titulo),
						escapeCsvField(quiz.id),
						escapeCsvField(quiz.titulo),
						escapeCsvField(quiz.notaMinima),
						escapeCsvField(quiz.autoGerarCertificado),
						"",
						"",
						"",
						"",
						"",
						"",
						"",
					]);
				} else {
					for (const p of quiz.perguntas) {
						rows.push([
							escapeCsvField(quiz.aula.curso.id),
							escapeCsvField(quiz.aula.curso.titulo),
							escapeCsvField(quiz.aula.id),
							escapeCsvField(quiz.aula.titulo),
							escapeCsvField(quiz.id),
							escapeCsvField(quiz.titulo),
							escapeCsvField(quiz.notaMinima),
							escapeCsvField(quiz.autoGerarCertificado),
							escapeCsvField(p.id),
							escapeCsvField(p.pergunta),
							escapeCsvField(p.opcaoA),
							escapeCsvField(p.opcaoB),
							escapeCsvField(p.opcaoC),
							escapeCsvField(p.opcaoD),
							escapeCsvField(p.correta),
						]);
					}
				}
			}
			const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
			sendCsv(reply, "quiz.csv", csv);
		} catch (error) {
			logger.error("[EXPORT ERROR]", error);
			reply.code(500).send({ error: "Erro ao exportar quiz" });
		}
	});

	// ==================== EXPORT ALL (unified CSV) ====================

	fastify.get("/export/all", { preHandler: [authenticate, authorize("ADMIN")] }, async (_req: any, reply) => {
		try {
			const rows: string[][] = [];

			// Cursos
			const cursos = await drizzleDb.findMany("curso", { orderBy: { ordem: "asc" } });
			for (const m of cursos) {
				rows.push([
					"curso",
					escapeCsvField(m.id),
					"",
					escapeCsvField(m.titulo),
					"",
					"",
					escapeCsvField(m.titulo),
					escapeCsvField(m.descricao),
					escapeCsvField(m.ordem),
					escapeCsvField(m.obrigatorio),
					escapeCsvField(m.autoCertificado),
					escapeCsvField(m.videoUrl),
					"",
					"",
					"",
					escapeCsvField(m.videoInicio),
					escapeCsvField(m.videoFim),
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
				]);
			}

			// Aulas
			{
				const aulasRaw = (await drizzleDb.findMany("aula", { orderBy: { ordem: "asc" } })) as any[];
				const cursoIds = [...new Set(aulasRaw.map((a: any) => a.cursoId).filter(Boolean))];
				const cursos = (await drizzleDb.findMany("curso", {
					where: { id: { in: cursoIds } },
					select: { id: true, titulo: true, ordem: true },
				})) as any[];
				const cursoMap = new Map(cursos.map((c: any) => [c.id, c]));
				const aulas = aulasRaw
					.map((a: any) => ({ ...a, curso: cursoMap.get(a.cursoId) }))
					.sort((a: any, b: any) => {
						const ca = a.curso || { ordem: 0 };
						const cb = b.curso || { ordem: 0 };
						if (ca.ordem !== cb.ordem) return (ca.ordem || 0) - (cb.ordem || 0);
						return (a.ordem || 0) - (b.ordem || 0);
					});
				for (const a of aulas) {
					rows.push([
						"aula",
						escapeCsvField(a.id),
						escapeCsvField(a.curso.id),
						escapeCsvField(a.curso.titulo),
						"",
						"",
						escapeCsvField(a.titulo),
						escapeCsvField(a.descricao),
						escapeCsvField(a.ordem),
						escapeCsvField(a.obrigatorio),
						"",
						escapeCsvField(a.videoUrl),
						escapeCsvField(a.pdfUrl),
						escapeCsvField(a.tipo),
						escapeCsvField(a.duracaoMin),
						escapeCsvField(a.videoInicio),
						escapeCsvField(a.videoFim),
						"",
						"",
						"",
						"",
						"",
						"",
						"",
						"",
						"",
						"",
						"",
						"",
						"",
					]);
				}
			}

			// Licoes
			{
				const licoesRaw = (await drizzleDb.findMany("licao", { orderBy: { ordem: "asc" } })) as any[];
				const aulaIds = [...new Set(licoesRaw.map((l: any) => l.aulaId).filter(Boolean))];
				const aulas = (await drizzleDb.findMany("aula", {
					where: { id: { in: aulaIds } },
					select: { id: true, titulo: true, ordem: true, cursoId: true },
				})) as any[];
				const cursoIds = [...new Set(aulas.map((a: any) => a.cursoId).filter(Boolean))];
				const cursos = (await drizzleDb.findMany("curso", {
					where: { id: { in: cursoIds } },
					select: { id: true, titulo: true, ordem: true },
				})) as any[];
				const cursoMap = new Map(cursos.map((c: any) => [c.id, c]));
				const aulaMap = new Map(aulas.map((a: any) => [a.id, { ...a, curso: cursoMap.get(a.cursoId) }]));
				const licoes = licoesRaw
					.map((l: any) => ({ ...l, aula: aulaMap.get(l.aulaId) }))
					.sort((a: any, b: any) => {
						const ca = a.aula?.curso || { ordem: 0 };
						const cb = b.aula?.curso || { ordem: 0 };
						if (ca.ordem !== cb.ordem) return (ca.ordem || 0) - (cb.ordem || 0);
						const aa = a.aula || { ordem: 0 };
						const ab = b.aula || { ordem: 0 };
						if (aa.ordem !== ab.ordem) return (aa.ordem || 0) - (ab.ordem || 0);
						return (a.ordem || 0) - (b.ordem || 0);
					});
				for (const l of licoes) {
					rows.push([
						"licao",
						escapeCsvField(l.id),
						escapeCsvField(l.aula.curso.id),
						escapeCsvField(l.aula.curso.titulo),
						escapeCsvField(l.aula.id),
						escapeCsvField(l.aula.titulo),
						escapeCsvField(l.titulo),
						"",
						escapeCsvField(l.ordem),
						"",
						"",
						"",
						"",
						escapeCsvField(l.tipo),
						escapeCsvField(l.duracaoMin),
						"",
						"",
						escapeCsvField(l.conteudo),
						escapeCsvField(l.inicioSeg),
						escapeCsvField(l.fimSeg),
						"",
						"",
						"",
						"",
						"",
						"",
						"",
						"",
						"",
						"",
					]);
				}
			}

			// Quiz perguntas
			{
				const quizzesRaw = (await drizzleDb.findMany("quiz")) as any[];
				const aulaIds = [...new Set(quizzesRaw.map((q: any) => q.aulaId).filter(Boolean))];
				const aulas = (await drizzleDb.findMany("aula", {
					where: { id: { in: aulaIds } },
					select: { id: true, titulo: true, ordem: true, cursoId: true },
				})) as any[];
				const cursoIds = [...new Set(aulas.map((a: any) => a.cursoId).filter(Boolean))];
				const cursos = (await drizzleDb.findMany("curso", {
					where: { id: { in: cursoIds } },
					select: { id: true, titulo: true, ordem: true },
				})) as any[];
				const quizIds = quizzesRaw.map((q: any) => q.id);
				const perguntas = quizIds.length
					? ((await drizzleDb.findMany("quizPergunta", {
							where: { quizId: { in: quizIds } },
							orderBy: { ordem: "asc" },
						})) as any[])
					: [];
				const perguntasByQuiz = perguntas.reduce(
					(acc: Record<string, any[]>, p: any) => {
						acc[p.quizId] = acc[p.quizId] || [];
						acc[p.quizId].push(p);
						return acc;
					},
					{} as Record<string, any[]>,
				);
				const cursoMap = new Map(cursos.map((c: any) => [c.id, c]));
				const aulaMap = new Map(aulas.map((a: any) => [a.id, { ...a, curso: cursoMap.get(a.cursoId) }]));
				const quizzes = quizzesRaw
					.map((q: any) => ({ ...q, aula: aulaMap.get(q.aulaId), perguntas: perguntasByQuiz[q.id] || [] }))
					.sort((a: any, b: any) => {
						const ca = a.aula?.curso || { ordem: 0 };
						const cb = b.aula?.curso || { ordem: 0 };
						if (ca.ordem !== cb.ordem) return (ca.ordem || 0) - (cb.ordem || 0);
						const aa = a.aula || { ordem: 0 };
						const ab = b.aula || { ordem: 0 };
						if (aa.ordem !== ab.ordem) return (aa.ordem || 0) - (ab.ordem || 0);
						return 0;
					});
				for (const quiz of quizzes) {
					if (quiz.perguntas.length === 0) {
						rows.push([
							"quiz_pergunta",
							"",
							escapeCsvField(quiz.aula.curso.id),
							escapeCsvField(quiz.aula.curso.titulo),
							escapeCsvField(quiz.aula.id),
							escapeCsvField(quiz.aula.titulo),
							"",
							"",
							"",
							"",
							escapeCsvField(quiz.autoGerarCertificado),
							"",
							"",
							"",
							"",
							"",
							"",
							"",
							"",
							"",
							escapeCsvField(quiz.titulo),
							escapeCsvField(quiz.notaMinima),
							escapeCsvField(quiz.autoGerarCertificado),
							"",
							"",
							"",
							"",
							"",
							"",
							"",
						]);
					} else {
						for (const p of quiz.perguntas) {
							rows.push([
								"quiz_pergunta",
								"",
								escapeCsvField(quiz.aula.curso.id),
								escapeCsvField(quiz.aula.curso.titulo),
								escapeCsvField(quiz.aula.id),
								escapeCsvField(quiz.aula.titulo),
								"",
								"",
								"",
								"",
								escapeCsvField(quiz.autoGerarCertificado),
								"",
								"",
								"",
								"",
								"",
								"",
								"",
								"",
								"",
								escapeCsvField(quiz.titulo),
								escapeCsvField(quiz.notaMinima),
								escapeCsvField(quiz.autoGerarCertificado),
								escapeCsvField(p.id),
								escapeCsvField(p.pergunta),
								escapeCsvField(p.opcaoA),
								escapeCsvField(p.opcaoB),
								escapeCsvField(p.opcaoC),
								escapeCsvField(p.opcaoD),
								escapeCsvField(p.correta),
							]);
						}
					}
				}
			}

			const csv = [UNIFIED_HEADERS.join(","), ...rows.map((r) => r.join(","))].join("\n");
			sendCsv(reply, "conteudo-completo.csv", csv);
		} catch (error) {
			logger.error("[EXPORT ALL ERROR]", error);
			reply.code(500).send({ error: "Erro ao exportar dados" });
		}
	});

	// ==================== EXPORT PER ITEM ====================

	fastify.get("/export/curso/:id", { preHandler: [authenticate, authorize("ADMIN")] }, async (req: any, reply) => {
		try {
			const curso = await drizzleDb.findUnique("curso", { id: req.params.id });
			if (!curso) return reply.code(404).send({ error: "Curso nao encontrado" });
			const headers = [
				"id",
				"titulo",
				"descricao",
				"ordem",
				"obrigatorio",
				"autoCertificado",
				"videoUrl",
				"videoInicio",
				"videoFim",
			];
			const row = headers.map((h) => escapeCsvField((curso as any)[h]));
			const csv = [headers.join(","), row.join(",")].join("\n");
			const safeName = (curso as any).titulo.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 40);
			sendCsv(reply, `curso-${safeName}-${curso.id.substring(0, 8)}.csv`, csv);
		} catch (error) {
			logger.error("[EXPORT CURSO ERROR]", error);
			reply.code(500).send({ error: "Erro ao exportar curso" });
		}
	});

	fastify.get("/export/aula/:id", { preHandler: [authenticate, authorize("ADMIN")] }, async (req: any, reply) => {
		try {
			const aulaRaw = (await drizzleDb.findUnique("aula", { id: req.params.id })) as any;
			if (!aulaRaw) return reply.code(404).send({ error: "Aula nao encontrada" });
			const curso = aulaRaw
				? await drizzleDb.findUnique("curso", { id: aulaRaw.cursoId }, { select: { id: true, titulo: true } })
				: null;
			const aula = { ...aulaRaw, curso };
			if (!aula) return reply.code(404).send({ error: "Aula nao encontrada" });
			const headers = [
				"id",
				"curso_id",
				"curso_titulo",
				"titulo",
				"descricao",
				"tipo",
				"videoUrl",
				"pdfUrl",
				"obrigatorio",
				"duracaoMin",
				"videoInicio",
				"videoFim",
			];
			const row = [
				escapeCsvField(aula.id),
				escapeCsvField((aula as any).curso.id),
				escapeCsvField((aula as any).curso.titulo),
				escapeCsvField(aula.titulo),
				escapeCsvField(aula.descricao),
				escapeCsvField(aula.tipo),
				escapeCsvField(aula.videoUrl),
				escapeCsvField(aula.pdfUrl),
				escapeCsvField(aula.obrigatorio),
				escapeCsvField(aula.duracaoMin),
				escapeCsvField(aula.videoInicio),
				escapeCsvField(aula.videoFim),
			];
			const csv = [headers.join(","), row.join(",")].join("\n");
			const safeName = aula.titulo.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 40);
			sendCsv(reply, `aula-${safeName}-${aula.id.substring(0, 8)}.csv`, csv);
		} catch (error) {
			logger.error("[EXPORT AULA ERROR]", error);
			reply.code(500).send({ error: "Erro ao exportar aula" });
		}
	});

	fastify.get("/export/licao/:id", { preHandler: [authenticate, authorize("ADMIN")] }, async (req: any, reply) => {
		try {
			const licaoRaw = (await drizzleDb.findUnique("licao", { id: req.params.id })) as any;
			if (!licaoRaw) return reply.code(404).send({ error: "Licao nao encontrada" });
			const aula = licaoRaw
				? await drizzleDb.findUnique(
						"aula",
						{ id: licaoRaw.aulaId },
						{ select: { id: true, titulo: true, cursoId: true } },
					)
				: null;
			const curso = aula
				? await drizzleDb.findUnique("curso", { id: aula.cursoId }, { select: { id: true, titulo: true } })
				: null;
			const licao = { ...licaoRaw, aula: { ...aula, curso } };
			if (!licao) return reply.code(404).send({ error: "Licao nao encontrada" });
			const headers = [
				"id",
				"curso_id",
				"curso_titulo",
				"aula_id",
				"aula_titulo",
				"titulo",
				"tipo",
				"conteudo",
				"duracaoMin",
				"inicioSeg",
				"fimSeg",
				"ordem",
			];
			const row = [
				escapeCsvField(licao.id),
				escapeCsvField((licao as any).aula.curso.id),
				escapeCsvField((licao as any).aula.curso.titulo),
				escapeCsvField((licao as any).aula.id),
				escapeCsvField((licao as any).aula.titulo),
				escapeCsvField(licao.titulo),
				escapeCsvField(licao.tipo),
				escapeCsvField(licao.conteudo),
				escapeCsvField(licao.duracaoMin),
				escapeCsvField(licao.inicioSeg),
				escapeCsvField(licao.fimSeg),
				escapeCsvField(licao.ordem),
			];
			const csv = [headers.join(","), row.join(",")].join("\n");
			const safeName = licao.titulo.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 40);
			sendCsv(reply, `licao-${safeName}-${licao.id.substring(0, 8)}.csv`, csv);
		} catch (error) {
			logger.error("[EXPORT LICAO ERROR]", error);
			reply.code(500).send({ error: "Erro ao exportar licao" });
		}
	});

	fastify.get("/export/quiz/:id", { preHandler: [authenticate, authorize("ADMIN")] }, async (req: any, reply) => {
		try {
			const quizRaw = (await drizzleDb.findUnique("quiz", { id: req.params.id })) as any;
			if (!quizRaw) return reply.code(404).send({ error: "Quiz nao encontrado" });
			const aula = quizRaw
				? await drizzleDb.findUnique(
						"aula",
						{ id: quizRaw.aulaId },
						{ select: { id: true, titulo: true, cursoId: true } },
					)
				: null;
			const curso = aula
				? await drizzleDb.findUnique("curso", { id: aula.cursoId }, { select: { id: true, titulo: true } })
				: null;
			const perguntas = (await drizzleDb.findMany("quizPergunta", {
				where: { quizId: req.params.id },
				orderBy: { ordem: "asc" },
			})) as any[];
			const quiz = { ...quizRaw, aula: { ...aula, curso }, perguntas };
			if (!quiz) return reply.code(404).send({ error: "Quiz nao encontrado" });
			const headers = [
				"curso_titulo",
				"aula_titulo",
				"quiz_titulo",
				"notaMinima",
				"autoGerarCertificado",
				"pergunta",
				"opcaoA",
				"opcaoB",
				"opcaoC",
				"opcaoD",
				"correta",
			];
			const rows = quiz.perguntas.map((p: any) => [
				escapeCsvField((quiz as any).aula.curso.titulo),
				escapeCsvField((quiz as any).aula.titulo),
				escapeCsvField(quiz.titulo),
				escapeCsvField(quiz.notaMinima),
				escapeCsvField(quiz.autoGerarCertificado),
				escapeCsvField(p.pergunta),
				escapeCsvField(p.opcaoA),
				escapeCsvField(p.opcaoB),
				escapeCsvField(p.opcaoC),
				escapeCsvField(p.opcaoD),
				escapeCsvField(p.correta),
			]);
			const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
			const safeName = quiz.titulo.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 40);
			sendCsv(reply, `quiz-${safeName}-${quiz.id.substring(0, 8)}.csv`, csv);
		} catch (error) {
			logger.error("[EXPORT QUIZ ERROR]", error);
			reply.code(500).send({ error: "Erro ao exportar quiz" });
		}
	});

	// ==================== LIST ITEMS (for UI) ====================

	fastify.get("/list/cursos", { preHandler: [authenticate, authorize("ADMIN")] }, async (_req: any, reply) => {
		try {
			const cursos = (await drizzleDb.findMany("curso", { orderBy: { ordem: "asc" } })) as any[];
			const aulaCounts = (await drizzleDb.groupBy("aula", { by: ["cursoId"], _count: { id: true } })) as any[];
			const countMap = new Map(aulaCounts.map((c: any) => [c.cursoId, c._count.id]));
			return reply.send(
				cursos.map((c: any) => ({ id: c.id, titulo: c.titulo, ordem: c.ordem, aulaCount: countMap.get(c.id) || 0 })),
			);
		} catch (error) {
			logger.error("[LIST CURSOS ERROR]", error);
			reply.code(500).send({ error: "Erro ao listar cursos" });
		}
	});

	fastify.get("/list/aulas", { preHandler: [authenticate, authorize("ADMIN")] }, async (_req: any, reply) => {
		try {
			const aulasRaw = (await drizzleDb.findMany("aula", { orderBy: { ordem: "asc" } })) as any[];
			const cursoIds = [...new Set(aulasRaw.map((a: any) => a.cursoId).filter(Boolean))];
			const cursos = (await drizzleDb.findMany("curso", {
				where: { id: { in: cursoIds } },
				select: { id: true, titulo: true, ordem: true },
			})) as any[];
			const cursoMap = new Map(cursos.map((c: any) => [c.id, c]));
			const aulaIds = aulasRaw.map((a: any) => a.id);
			const licaoCounts = aulaIds.length
				? ((await drizzleDb.groupBy("licao", { by: ["aulaId"], _count: { id: true } })) as any[])
				: [];
			const countMap = new Map(licaoCounts.map((c: any) => [c.aulaId, c._count.id]));
			const aulas = aulasRaw
				.map((a: any) => ({ ...a, curso: cursoMap.get(a.cursoId), licaoCount: countMap.get(a.id) || 0 }))
				.sort((a: any, b: any) => {
					const ca = a.curso || { ordem: 0 };
					const cb = b.curso || { ordem: 0 };
					if (ca.ordem !== cb.ordem) return (ca.ordem || 0) - (cb.ordem || 0);
					return (a.ordem || 0) - (b.ordem || 0);
				});
			return reply.send(
				aulas.map((a: any) => ({
					id: a.id,
					titulo: a.titulo,
					cursoId: a.curso?.id,
					cursoTitulo: a.curso?.titulo,
					tipo: a.tipo,
					licaoCount: a.licaoCount,
				})),
			);
		} catch (error) {
			logger.error("[LIST AULAS ERROR]", error);
			reply.code(500).send({ error: "Erro ao listar aulas" });
		}
	});

	fastify.get("/list/licoes", { preHandler: [authenticate, authorize("ADMIN")] }, async (_req: any, reply) => {
		try {
			const licoesRaw = (await drizzleDb.findMany("licao", { orderBy: { ordem: "asc" } })) as any[];
			const aulaIds = [...new Set(licoesRaw.map((l: any) => l.aulaId).filter(Boolean))];
			const aulas = (await drizzleDb.findMany("aula", {
				where: { id: { in: aulaIds } },
				select: { id: true, titulo: true, ordem: true, cursoId: true },
			})) as any[];
			const cursoIds = [...new Set(aulas.map((a: any) => a.cursoId).filter(Boolean))];
			const cursos = (await drizzleDb.findMany("curso", {
				where: { id: { in: cursoIds } },
				select: { id: true, titulo: true, ordem: true },
			})) as any[];
			const cursoMap = new Map(cursos.map((c: any) => [c.id, c]));
			const aulaMap = new Map(aulas.map((a: any) => [a.id, { ...a, curso: cursoMap.get(a.cursoId) }]));
			const licoes = licoesRaw
				.map((l: any) => ({ ...l, aula: aulaMap.get(l.aulaId) }))
				.sort((a: any, b: any) => {
					const ca = a.aula?.curso || { ordem: 0 };
					const cb = b.aula?.curso || { ordem: 0 };
					if (ca.ordem !== cb.ordem) return (ca.ordem || 0) - (cb.ordem || 0);
					const aa = a.aula || { ordem: 0 };
					const ab = b.aula || { ordem: 0 };
					if (aa.ordem !== ab.ordem) return (aa.ordem || 0) - (ab.ordem || 0);
					return (a.ordem || 0) - (b.ordem || 0);
				});
			return reply.send(
				licoes.map((l: any) => ({
					id: l.id,
					titulo: l.titulo,
					aulaId: l.aula?.id,
					aulaTitulo: l.aula?.titulo,
					cursoId: l.aula?.curso?.id,
					cursoTitulo: l.aula?.curso?.titulo,
					tipo: l.tipo,
				})),
			);
		} catch (error) {
			logger.error("[LIST LICOES ERROR]", error);
			reply.code(500).send({ error: "Erro ao listar licoes" });
		}
	});

	fastify.get("/list/quizzes", { preHandler: [authenticate, authorize("ADMIN")] }, async (_req: any, reply) => {
		try {
			const quizzesRaw = (await drizzleDb.findMany("quiz")) as any[];
			const aulaIds = [...new Set(quizzesRaw.map((q: any) => q.aulaId).filter(Boolean))];
			const aulas = (await drizzleDb.findMany("aula", {
				where: { id: { in: aulaIds } },
				select: { id: true, titulo: true, ordem: true, cursoId: true },
			})) as any[];
			const cursoIds = [...new Set(aulas.map((a: any) => a.cursoId).filter(Boolean))];
			const cursos = (await drizzleDb.findMany("curso", {
				where: { id: { in: cursoIds } },
				select: { id: true, titulo: true, ordem: true },
			})) as any[];
			const quizIds = quizzesRaw.map((q: any) => q.id);
			const perguntaCounts = quizIds.length
				? ((await drizzleDb.groupBy("quizPergunta", { by: ["quizId"], _count: { id: true } })) as any[])
				: [];
			const countMap = new Map(perguntaCounts.map((c: any) => [c.quizId, c._count.id]));
			const cursoMap = new Map(cursos.map((c: any) => [c.id, c]));
			const aulaMap = new Map(aulas.map((a: any) => [a.id, { ...a, curso: cursoMap.get(a.cursoId) }]));
			const quizzes = quizzesRaw
				.map((q: any) => ({ ...q, aula: aulaMap.get(q.aulaId), perguntaCount: countMap.get(q.id) || 0 }))
				.sort((a: any, b: any) => {
					const ca = a.aula?.curso || { ordem: 0 };
					const cb = b.aula?.curso || { ordem: 0 };
					if (ca.ordem !== cb.ordem) return (ca.ordem || 0) - (cb.ordem || 0);
					const aa = a.aula || { ordem: 0 };
					const ab = b.aula || { ordem: 0 };
					if (aa.ordem !== ab.ordem) return (aa.ordem || 0) - (ab.ordem || 0);
					return 0;
				});
			return reply.send(
				quizzes.map((q: any) => ({
					id: q.id,
					titulo: q.titulo,
					aulaId: q.aula?.id,
					aulaTitulo: q.aula?.titulo,
					cursoId: q.aula?.curso?.id,
					cursoTitulo: q.aula?.curso?.titulo,
					perguntaCount: q.perguntaCount,
				})),
			);
		} catch (error) {
			logger.error("[LIST QUIZZES ERROR]", error);
			reply.code(500).send({ error: "Erro ao listar quizzes" });
		}
	});

	// ==================== DETECT ====================

	fastify.post("/detect", { preHandler: [authenticate, authorize("ADMIN")] }, async (req: any, reply) => {
		try {
			const { csv: csvText } = req.body;
			if (!csvText || typeof csvText !== "string") {
				return reply.code(400).send({ error: "Dados CSV invalidos" });
			}
			const { headers, rows } = parseCsv(csvText);
			if (headers.length === 0) {
				return reply.code(400).send({ error: "CSV sem cabecalhos" });
			}

			const hasTipoColumn = headers.some((h) => h.toLowerCase().trim() === "tipo");
			let detectedType: string;
			const rowCount = rows.length;

			if (hasTipoColumn) {
				const tipoIdx = headers.findIndex((h) => h.toLowerCase().trim() === "tipo");
				const tipos = new Set(rows.map((r) => (r[tipoIdx] || "").trim().toLowerCase()).filter(Boolean));
				if (tipos.size === 1) {
					detectedType = [...tipos][0];
				} else if (tipos.size > 1) {
					detectedType = "misto";
				} else {
					detectedType = "desconhecido";
				}
			} else {
				detectedType = detectCsvType(headers) || "desconhecido";
			}

			// Validate required columns per type
			const missingRequired: string[] = [];
			const warnings: string[] = [];
			const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
			const has = (col: string) => lowerHeaders.includes(col.toLowerCase());

			if (detectedType === "curso" && !has("titulo")) missingRequired.push("titulo");
			if (detectedType === "aula") {
				if (!has("titulo")) missingRequired.push("titulo");
				if (!has("curso_titulo") && !has("curso_id")) missingRequired.push("curso_titulo ou curso_id");
			}
			if (detectedType === "licao") {
				if (!has("titulo")) missingRequired.push("titulo");
				if (!has("aula_titulo") && !has("aula_id")) missingRequired.push("aula_titulo ou aula_id");
			}
			if (detectedType === "quiz_pergunta") {
				if (!has("pergunta")) missingRequired.push("pergunta");
				// aula columns are optional — user can pick a target quiz instead
			}

			if (detectedType === "misto" && !has("tipo")) {
				missingRequired.push("tipo");
			}

			// Check for potentially wrong columns
			if (has("tipo") && !has("tipo_aula") && lowerHeaders.includes("tipo")) {
				const tipoValues = rows.map((r) => {
					const idx = lowerHeaders.indexOf("tipo");
					return (r[idx] || "").trim().toUpperCase();
				});
				const hasAulaTipos = tipoValues.some((v) => VALID_TIPOS.includes(v));
				if (hasAulaTipos && !hasTipoColumn) {
					warnings.push(
						'Coluna "tipo" parece conter valores de tipo de aula (VIDEO/PDF/TEXTO). Considere renomear para "tipo_aula".',
					);
				}
			}

			const preview = rows.slice(0, 3).map((row) => {
				const obj: Record<string, string> = {};
				headers.forEach((h, i) => {
					obj[h] = row[i] || "";
				});
				return obj;
			});

			// For quiz_pergunta: check if referenced parents exist and list available quizzes
			let parentResolved = true;
			const parentWarnings: string[] = [];
			let existingQuizzes: {
				id: string;
				titulo: string;
				aulaTitulo: string;
				cursoTitulo: string;
				perguntaCount: number;
			}[] = [];

			if (detectedType === "quiz_pergunta") {
				const allCursos = await drizzleDb.findMany("curso", { select: { id: true, titulo: true } });
				const cursoMapDb = new Map(allCursos.map((m: any) => [m.titulo, m.id]));
				const allAulasDb = await drizzleDb.findMany("aula", { select: { id: true, titulo: true, cursoId: true } });

				const hasCurso = has("curso_titulo") || has("curso_id");
				const hasAula = has("aula_titulo") || has("aula_id");

				if (hasCurso || hasAula) {
					// Check if referenced parents exist in DB
					const cursoIdx = headers.findIndex((h) => h.toLowerCase().trim() === "curso_titulo");
					const aulaIdx = headers.findIndex((h) => h.toLowerCase().trim() === "aula_titulo");
					const uniqueCursos = new Set(rows.map((r) => (cursoIdx >= 0 ? r[cursoIdx] : "").trim()).filter(Boolean));
					const missingCursos: string[] = [];
					for (const ct of uniqueCursos) {
						if (!cursoMapDb.has(ct)) missingCursos.push(ct);
					}
					if (missingCursos.length > 0) {
						parentResolved = false;
						parentWarnings.push(`Cursos nao encontrados no sistema: ${missingCursos.join(", ")}`);
					}

					const uniqueAulas = new Set(rows.map((r) => (aulaIdx >= 0 ? r[aulaIdx] : "").trim()).filter(Boolean));
					const existingAulaTitles = new Set(allAulasDb.map((a: any) => a.titulo));
					const missingAulas: string[] = [];
					for (const at of uniqueAulas) {
						if (!existingAulaTitles.has(at)) missingAulas.push(at);
					}
					if (missingAulas.length > 0) {
						parentResolved = false;
						parentWarnings.push(`Aulas nao encontradas no sistema: ${missingAulas.join(", ")}`);
					}
				} else {
					parentResolved = false;
					parentWarnings.push("CSV nao inclui colunas de curso/aula. Selecione um quiz destino.");
				}

				// Load existing quizzes for user to pick
				const quizzesRaw = (await drizzleDb.findMany("quiz")) as any[];
				const aulaIds = [...new Set(quizzesRaw.map((q: any) => q.aulaId).filter(Boolean))];
				const aulas = (await drizzleDb.findMany("aula", {
					where: { id: { in: aulaIds } },
					select: { id: true, titulo: true, ordem: true, cursoId: true },
				})) as any[];
				const cursoIds = [...new Set(aulas.map((a: any) => a.cursoId).filter(Boolean))];
				const cursos = (await drizzleDb.findMany("curso", {
					where: { id: { in: cursoIds } },
					select: { id: true, titulo: true, ordem: true },
				})) as any[];
				const quizIds = quizzesRaw.map((q: any) => q.id);
				const perguntaCounts = quizIds.length
					? ((await drizzleDb.groupBy("quizPergunta", { by: ["quizId"], _count: { id: true } })) as any[])
					: [];
				const countMap = new Map(perguntaCounts.map((c: any) => [c.quizId, c._count.id]));
				const cursoMap = new Map(cursos.map((c: any) => [c.id, c]));
				const aulaMap = new Map(aulas.map((a: any) => [a.id, { ...a, curso: cursoMap.get(a.cursoId) }]));
				const quizzesDb = quizzesRaw
					.map((q: any) => ({ ...q, aula: aulaMap.get(q.aulaId), _count: { perguntas: countMap.get(q.id) || 0 } }))
					.sort((a: any, b: any) => {
						const ca = a.aula?.curso || { ordem: 0 };
						const cb = b.aula?.curso || { ordem: 0 };
						if (ca.ordem !== cb.ordem) return (ca.ordem || 0) - (cb.ordem || 0);
						const aa = a.aula || { ordem: 0 };
						const ab = b.aula || { ordem: 0 };
						if (aa.ordem !== ab.ordem) return (aa.ordem || 0) - (ab.ordem || 0);
						return 0;
					});
				existingQuizzes = quizzesDb.map((q: any) => ({
					id: q.id,
					titulo: q.titulo,
					aulaTitulo: q.aula.titulo,
					cursoTitulo: q.aula.curso.titulo,
					perguntaCount: q._count.perguntas,
				}));
			}

			return reply.send({
				type: detectedType,
				columns: headers,
				rowCount,
				missingRequired,
				warnings,
				valid: missingRequired.length === 0,
				preview,
				// quiz_pergunta specific
				parentResolved,
				parentWarnings,
				existingQuizzes,
			});
		} catch (error) {
			logger.error("[DETECT ERROR]", error);
			reply.code(500).send({ error: "Erro ao detectar CSV" });
		}
	});

	// ==================== UNIFIED IMPORT ====================

	fastify.post("/import/unified", { preHandler: [authenticate, authorize("ADMIN")] }, async (req: any, reply) => {
		try {
			const { csv: csvText, mode = "create", targetQuizId } = req.body;
			if (!csvText || typeof csvText !== "string") {
				return reply.code(400).send({ error: "Dados CSV invalidos" });
			}
			const { headers, rows } = parseCsv(csvText);
			if (headers.length === 0 || rows.length === 0) {
				return reply.code(400).send({ error: "CSV vazio ou sem cabecalhos" });
			}

			const objects = rowsToObjects(headers, rows);
			const isUpsert = mode === "upsert";
			const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
			const hasTipoColumn = lowerHeaders.includes("tipo");
			const errors: { row: number; field: string; message: string }[] = [];

			// Pre-load lookups
			const allModulos = await drizzleDb.findMany("curso", { select: { id: true, titulo: true } });
			const cursoByTitulo = new Map(allModulos.map((m: any) => [m.titulo, m.id]));
			const cursoById = new Map(allModulos.map((m: any) => [m.id, m.titulo]));

			const allAulas = await drizzleDb.findMany("aula", { select: { id: true, titulo: true, cursoId: true } });
			const aulaByKey = new Map(allAulas.map((a: any) => [`${a.cursoId}:${a.titulo}`, a.id]));
			const aulaById = new Map(allAulas.map((a: any) => [a.id, a]));

			// Resolve helper: get cursoId from row (prefer ID over titulo)
			function resolveModuloId(obj: Record<string, string>): string | null {
				const id = obj.curso_id?.trim();
				if (id && cursoById.has(id)) return id;
				const titulo = obj.curso_titulo?.trim();
				if (titulo) return (cursoByTitulo.get(titulo) as string) || null;
				return null;
			}

			// Resolve helper: get aulaId from row (optionally create if missing)
			async function resolveAulaId(
				obj: Record<string, string>,
				cursoId: string,
				createIfMissing = false,
			): Promise<string | null> {
				const id = obj.aula_id?.trim();
				if (id && aulaById.has(id)) return id;
				const titulo = obj.aula_titulo?.trim();
				if (titulo) {
					const existing = aulaByKey.get(`${cursoId}:${titulo}`) as string | undefined;
					if (existing) return existing;
				}
				if (createIfMissing && titulo) {
					const maxOrdem =
						(await drizzleDb.aggregate("aula", { where: { cursoId }, _max: { ordem: true } }))._max.ordem || 0;
					const created = await drizzleDb.create("aula", {
						cursoId,
						titulo,
						descricao: "",
						ordem: maxOrdem + 1,
						tipo: "VIDEO",
						videoUrl: null,
						pdfUrl: null,
						obrigatorio: false,
						duracaoMin: null,
						videoInicio: null,
						videoFim: null,
					});
					aulaByKey.set(`${cursoId}:${titulo}`, (created as any).id);
					aulaById.set((created as any).id, { id: (created as any).id, titulo, cursoId });
					result.createdItems.push({ type: "aula", id: (created as any).id, titulo, cursoId });
					result.created++;
					return (created as any).id;
				}
				return null;
			}

			// Group rows by type
			const typeGroups: Record<CsvType, Record<string, string>[]> = {
				curso: [],
				aula: [],
				licao: [],
				quiz_pergunta: [],
			};

			if (hasTipoColumn) {
				for (let i = 0; i < objects.length; i++) {
					const rawTipo = (objects[i].tipo || "")
						.trim()
						.toLowerCase()
						.replace(/[_\s]+/g, "_");
					const tipoMap: Record<string, CsvType> = {
						curso: "curso",
						cursos: "curso",
						aula: "aula",
						aulas: "aula",
						licao: "licao",
						licoes: "licao",
						quiz: "quiz_pergunta",
						quiz_pergunta: "quiz_pergunta",
						pergunta: "quiz_pergunta",
						perguntas: "quiz_pergunta",
					};
					const tipo = tipoMap[rawTipo];
					if (!tipo) {
						errors.push({ row: i + 2, field: "tipo", message: `Tipo desconhecido: "${objects[i].tipo}"` });
						continue;
					}
					typeGroups[tipo].push(objects[i]);
				}
			} else {
				const detected = detectCsvType(headers);
				if (!detected) {
					return reply.code(400).send({ error: "Nao foi possivel detectar o tipo do CSV. Adicione a coluna 'tipo'." });
				}
				typeGroups[detected] = objects;
			}

			const result = {
				created: 0,
				updated: 0,
				skipped: 0,
				total: objects.length,
				errors,
				createdItems: [] as { type: string; id: string; titulo: string; cursoId?: string; aulaId?: string }[],
			};

			// Process in order: cursos → aulas → licoes → quiz
			// CURSOS
			for (const obj of typeGroups.curso) {
				const titulo = obj.titulo?.trim();
				if (!titulo) {
					result.skipped++;
					continue;
				}

				if (isUpsert && obj.id?.trim()) {
					const existing = await drizzleDb.findUnique("curso", { id: obj.id.trim() });
					if (existing) {
						await drizzleDb.update(
							"curso",
							{ id: obj.id.trim() },
							{
								titulo,
								descricao: obj.descricao || "",
								obrigatorio: parseBool(obj.obrigatorio),
								autoCertificado: parseBool(obj.autoCertificado),
								videoUrl: obj.videoUrl || null,
								videoInicio: parseIntSafe(obj.videoInicio),
								videoFim: parseIntSafe(obj.videoFim),
							},
						);
						result.updated++;
						continue;
					}
				}

				const existingByTitle = await drizzleDb.findFirst("curso", { titulo });
				if (existingByTitle) {
					result.skipped++;
					continue;
				}

				const maxOrdem = (await drizzleDb.aggregate("curso", { _max: { ordem: true } }))._max.ordem || 0;
				const created = await drizzleDb.create("curso", {
					titulo,
					descricao: obj.descricao || "",
					ordem: parseIntSafe(obj.ordem) ?? maxOrdem + 1,
					obrigatorio: parseBool(obj.obrigatorio),
					autoCertificado: parseBool(obj.autoCertificado),
					videoUrl: obj.videoUrl || null,
					videoInicio: parseIntSafe(obj.videoInicio),
					videoFim: parseIntSafe(obj.videoFim),
				});
				// Update lookup maps for subsequent rows
				cursoByTitulo.set(titulo, (created as any).id);
				cursoById.set((created as any).id, titulo);
				result.createdItems.push({ type: "curso", id: (created as any).id, titulo });
				result.created++;
			}

			// AULAS
			for (const obj of typeGroups.aula) {
				const titulo = obj.titulo?.trim();
				const cursoId = resolveModuloId(obj);
				if (!titulo || !cursoId) {
					result.skipped++;
					continue;
				}

				const tipoAula = (obj.tipo_aula || obj.tipo || "VIDEO").trim().toUpperCase();
				if (!VALID_TIPOS.includes(tipoAula)) {
					errors.push({
						row: 0,
						field: "tipo_aula",
						message: `Tipo invalido: "${tipoAula}". Use: VIDEO, PDF ou TEXTO`,
					});
					result.skipped++;
					continue;
				}

				if (isUpsert && obj.id?.trim()) {
					const existing = await drizzleDb.findUnique("aula", { id: obj.id.trim() });
					if (existing) {
						await drizzleDb.update(
							"aula",
							{ id: obj.id.trim() },
							{
								titulo,
								descricao: obj.descricao || "",
								tipo: tipoAula as any,
								videoUrl: obj.videoUrl || null,
								pdfUrl: obj.pdfUrl || null,
								obrigatorio: parseBool(obj.obrigatorio),
								duracaoMin: parseIntSafe(obj.duracaoMin),
								videoInicio: parseIntSafe(obj.videoInicio),
								videoFim: parseIntSafe(obj.videoFim),
							},
						);
						result.updated++;
						continue;
					}
				}

				const existingAula = await drizzleDb.findFirst("aula", { cursoId, titulo });
				if (existingAula) {
					result.skipped++;
					continue;
				}

				const maxOrdem =
					(await drizzleDb.aggregate("aula", { where: { cursoId }, _max: { ordem: true } }))._max.ordem || 0;
				const created = await drizzleDb.create("aula", {
					cursoId,
					titulo,
					descricao: obj.descricao || "",
					ordem: parseIntSafe(obj.ordem) ?? maxOrdem + 1,
					tipo: tipoAula as any,
					videoUrl: obj.videoUrl || null,
					pdfUrl: obj.pdfUrl || null,
					obrigatorio: parseBool(obj.obrigatorio),
					duracaoMin: parseIntSafe(obj.duracaoMin),
					videoInicio: parseIntSafe(obj.videoInicio),
					videoFim: parseIntSafe(obj.videoFim),
				});
				aulaByKey.set(`${cursoId}:${titulo}`, (created as any).id);
				aulaById.set((created as any).id, { id: (created as any).id, titulo, cursoId });
				result.createdItems.push({ type: "aula", id: (created as any).id, titulo, cursoId });
				result.created++;
			}

			// LICOES
			for (const obj of typeGroups.licao) {
				const titulo = obj.titulo?.trim();
				const cursoId = resolveModuloId(obj);
				if (!cursoId) {
					result.skipped++;
					continue;
				}
				const aulaId = await resolveAulaId(obj, cursoId);
				if (!titulo || !aulaId) {
					result.skipped++;
					continue;
				}

				const tipoLicao = (obj.tipo_aula || obj.tipo || "TEXTO").trim().toUpperCase();
				if (!VALID_TIPOS.includes(tipoLicao)) {
					errors.push({ row: 0, field: "tipo", message: `Tipo invalido: "${tipoLicao}". Use: VIDEO, PDF ou TEXTO` });
					result.skipped++;
					continue;
				}

				if (isUpsert && obj.id?.trim()) {
					const existing = await drizzleDb.findUnique("licao", { id: obj.id.trim() });
					if (existing) {
						await drizzleDb.update(
							"licao",
							{ id: obj.id.trim() },
							{
								titulo,
								tipo: tipoLicao as any,
								conteudo: obj.conteudo || null,
								duracaoMin: parseIntSafe(obj.duracaoMin),
								inicioSeg: parseIntSafe(obj.inicioSeg),
								fimSeg: parseIntSafe(obj.fimSeg),
							},
						);
						result.updated++;
						continue;
					}
				}

				const existingLicao = await drizzleDb.findFirst("licao", { aulaId, titulo });
				if (existingLicao) {
					result.skipped++;
					continue;
				}

				const maxOrdem =
					(await drizzleDb.aggregate("licao", { where: { aulaId }, _max: { ordem: true } }))._max.ordem || 0;
				await drizzleDb.create("licao", {
					aulaId,
					titulo,
					tipo: tipoLicao as any,
					conteudo: obj.conteudo || null,
					duracaoMin: parseIntSafe(obj.duracaoMin),
					inicioSeg: parseIntSafe(obj.inicioSeg),
					fimSeg: parseIntSafe(obj.fimSeg),
					ordem: parseIntSafe(obj.ordem) ?? maxOrdem + 1,
				});
				result.createdItems.push({
					type: "licao",
					id: (await drizzleDb.findFirst("licao", { aulaId, titulo }))?.id || "",
					titulo,
					aulaId,
				});
				result.created++;
			}

			// QUIZ PERGUNTAS
			// If targetQuizId is provided, bypass parent resolution and attach directly
			if (targetQuizId && typeGroups.quiz_pergunta.length > 0) {
				const targetQuiz = await drizzleDb.findUnique("quiz", { id: targetQuizId });
				if (!targetQuiz) {
					return reply.code(400).send({ error: "Quiz destino nao encontrado" });
				}

				const existingPerguntas = await drizzleDb.findMany("quizPergunta", { where: { quizId: targetQuizId } });
				const existingByPergunta = new Map(existingPerguntas.map((p: any) => [p.pergunta, p]));
				const existingById = new Map(existingPerguntas.map((p: any) => [p.id, p]));

				const maxOrdem =
					(await drizzleDb.aggregate("quizPergunta", { where: { quizId: targetQuizId }, _max: { ordem: true } }))._max
						.ordem || 0;
				let ordemCounter = maxOrdem;

				for (const r of typeGroups.quiz_pergunta) {
					const perguntaText = r.pergunta?.trim();
					if (!perguntaText) {
						result.skipped++;
						continue;
					}

					const correta = (r.correta || "A").trim().toUpperCase();
					if (!VALID_CORRETA.includes(correta)) {
						errors.push({
							row: 0,
							field: "correta",
							message: `Resposta correta invalida: "${correta}". Use: A, B, C ou D`,
						});
						result.skipped++;
						continue;
					}

					if (!r.opcaoA?.trim() || !r.opcaoB?.trim()) {
						errors.push({ row: 0, field: "opcaoA/opcaoB", message: "opcaoA e opcaoB sao obrigatorias" });
						result.skipped++;
						continue;
					}

					// Upsert by pergunta_id
					if (isUpsert && r.pergunta_id?.trim()) {
						const existing = existingById.get(r.pergunta_id.trim());
						if (existing) {
							await drizzleDb.update(
								"quizPergunta",
								{ id: r.pergunta_id.trim() },
								{
									pergunta: perguntaText,
									opcaoA: r.opcaoA.trim(),
									opcaoB: r.opcaoB.trim(),
									opcaoC: r.opcaoC?.trim() || null,
									opcaoD: r.opcaoD?.trim() || null,
									correta,
								},
							);
							result.updated++;
							continue;
						}
					}

					// Dedup by pergunta text
					if (existingByPergunta.has(perguntaText)) {
						result.skipped++;
						continue;
					}

					ordemCounter++;
					await drizzleDb.create("quizPergunta", {
						quizId: targetQuizId,
						pergunta: perguntaText,
						opcaoA: r.opcaoA.trim(),
						opcaoB: r.opcaoB.trim(),
						opcaoC: r.opcaoC?.trim() || null,
						opcaoD: r.opcaoD?.trim() || null,
						correta,
						ordem: ordemCounter,
					});
					existingByPergunta.set(perguntaText, {} as any);
					result.created++;
				}

				const quizAula = targetQuiz
					? await drizzleDb.findUnique("aula", { id: (targetQuiz as any).aulaId }, { select: { cursoId: true } })
					: null;
				result.createdItems.push({
					type: "quiz",
					id: targetQuizId,
					titulo: (targetQuiz as any).titulo,
					aulaId: (targetQuiz as any).aulaId,
					cursoId: quizAula?.cursoId,
				});
			} else {
				// Original flow: resolve parents from CSV columns
				const quizGroups = new Map<string, { aulaId: string; rows: Record<string, string>[] }>();
				for (const obj of typeGroups.quiz_pergunta) {
					const cursoId = resolveModuloId(obj);
					if (!cursoId) {
						errors.push({
							row: 0,
							field: "curso_titulo",
							message: `Curso nao encontrado: "${obj.curso_titulo || obj.curso_id || ""}"`,
						});
						result.skipped++;
						continue;
					}
					const aulaId = await resolveAulaId(obj, cursoId, true);
					if (!aulaId) {
						errors.push({ row: 0, field: "aula_titulo", message: `Nao foi possivel resolver ou criar a aula` });
						result.skipped++;
						continue;
					}

					if (!quizGroups.has(aulaId)) quizGroups.set(aulaId, { aulaId, rows: [] });
					quizGroups.get(aulaId)!.rows.push(obj);
				}

				for (const [, group] of quizGroups) {
					const { aulaId, rows: groupRows } = group;
					const first = groupRows[0];
					const quizTitulo = first.quiz_titulo?.trim() || "Quiz";
					const notaMinima = parseIntSafe(first.notaMinima) ?? 7;
					const autoGerar = parseBool(first.autoGerarCertificado) || parseBool(first.autoGerar);

					let quiz = await drizzleDb.findUnique("quiz", { aulaId });
					if (!quiz) {
						const newQuiz = await drizzleDb.create("quiz", {
							aulaId,
							titulo: quizTitulo,
							notaMinima,
							autoGerarCertificado: autoGerar,
						});
						quiz = newQuiz as any;
						const cursoIdForQuiz = resolveModuloId(first);
						result.createdItems.push({
							type: "quiz",
							id: (quiz as any).id,
							titulo: quizTitulo,
							aulaId,
							cursoId: cursoIdForQuiz || undefined,
						});
						result.created++;
					}

					const existingPerguntas = await drizzleDb.findMany("quizPergunta", { where: { quizId: quiz!.id } });
					const existingByPergunta = new Map(existingPerguntas.map((p: any) => [p.pergunta, p]));
					const existingById = new Map(existingPerguntas.map((p: any) => [p.id, p]));

					const maxOrdem =
						(await drizzleDb.aggregate("quizPergunta", { where: { quizId: quiz!.id }, _max: { ordem: true } }))._max
							.ordem || 0;

					let ordemCounter = maxOrdem;
					for (const r of groupRows) {
						const perguntaText = r.pergunta?.trim();
						if (!perguntaText) {
							result.skipped++;
							continue;
						}

						const correta = (r.correta || "A").trim().toUpperCase();
						if (!VALID_CORRETA.includes(correta)) {
							errors.push({
								row: 0,
								field: "correta",
								message: `Resposta correta invalida: "${correta}". Use: A, B, C ou D`,
							});
							result.skipped++;
							continue;
						}

						if (!r.opcaoA?.trim() || !r.opcaoB?.trim()) {
							errors.push({ row: 0, field: "opcaoA/opcaoB", message: "opcaoA e opcaoB sao obrigatorias" });
							result.skipped++;
							continue;
						}

						// Upsert by pergunta_id
						if (isUpsert && r.pergunta_id?.trim()) {
							const existing = existingById.get(r.pergunta_id.trim());
							if (existing) {
								await drizzleDb.update(
									"quizPergunta",
									{ id: r.pergunta_id.trim() },
									{
										pergunta: perguntaText,
										opcaoA: r.opcaoA.trim(),
										opcaoB: r.opcaoB.trim(),
										opcaoC: r.opcaoC?.trim() || null,
										opcaoD: r.opcaoD?.trim() || null,
										correta,
									},
								);
								result.updated++;
								continue;
							}
						}

						// Dedup by pergunta text
						if (existingByPergunta.has(perguntaText)) {
							result.skipped++;
							continue;
						}

						ordemCounter++;
						await drizzleDb.create("quizPergunta", {
							quizId: quiz!.id,
							pergunta: perguntaText,
							opcaoA: r.opcaoA.trim(),
							opcaoB: r.opcaoB.trim(),
							opcaoC: r.opcaoC?.trim() || null,
							opcaoD: r.opcaoD?.trim() || null,
							correta,
							ordem: ordemCounter,
						});
						existingByPergunta.set(perguntaText, {} as any);
						result.created++;
					}
				}
			} // end else (original flow)

			const typeLabel = hasTipoColumn
				? "CSV unificado"
				: typeGroups.curso.length > 0
					? "cursos"
					: typeGroups.aula.length > 0
						? "aulas"
						: typeGroups.licao.length > 0
							? "licoes"
							: "quiz";
			await logActivity(
				req.userId!,
				`Importar ${typeLabel}`,
				`Criados: ${result.created}, Atualizados: ${result.updated}, Ignorados: ${result.skipped}, Erros: ${errors.length}`,
			);

			return reply.send(result);
		} catch (error) {
			logger.error("[UNIFIED IMPORT ERROR]", error);
			reply.code(500).send({ error: "Erro ao importar dados" });
		}
	});

	// ==================== LEGACY IMPORT (kept for backward compat) ====================

	fastify.post("/import/cursos", { preHandler: [authenticate, authorize("ADMIN")] }, async (req: any, reply) => {
		try {
			const { csv: csvText } = req.body;
			if (!csvText || typeof csvText !== "string") {
				return reply.code(400).send({ error: "Dados CSV inválidos" });
			}
			const { headers, rows } = parseCsv(csvText);
			if (headers.length === 0 || rows.length === 0) {
				return reply.code(400).send({ error: "CSV vazio ou sem cabeçalhos" });
			}
			const objects = rowsToObjects(headers, rows);
			const existing = await drizzleDb.findMany("curso", { select: { titulo: true } });
			const existingTitles = new Set(existing.map((m: any) => m.titulo));
			let created = 0;
			let skipped = 0;
			const maxOrdem = (await drizzleDb.aggregate("curso", { _max: { ordem: true } }))._max.ordem || 0;
			for (let i = 0; i < objects.length; i++) {
				const obj = objects[i];
				const titulo = obj.titulo?.trim();
				if (!titulo) {
					skipped++;
					continue;
				}
				if (existingTitles.has(titulo)) {
					skipped++;
					continue;
				}
				await drizzleDb.create("curso", {
					titulo,
					descricao: obj.descricao || "",
					ordem: maxOrdem + i + 1,
					obrigatorio: parseBool(obj.obrigatorio),
					autoCertificado: parseBool(obj.autoCertificado),
					videoUrl: obj.videoUrl || null,
					videoInicio: parseIntSafe(obj.videoInicio),
					videoFim: parseIntSafe(obj.videoFim),
				});
				existingTitles.add(titulo);
				created++;
			}
			await logActivity(req.userId!, "Importar Cursos", `Criados: ${created}, Ignorados: ${skipped}`);
			return reply.send({ created, skipped, total: objects.length, updated: 0, errors: [] });
		} catch (error) {
			logger.error("[IMPORT ERROR]", error);
			reply.code(500).send({ error: "Erro ao importar cursos" });
		}
	});

	fastify.post("/import/aulas", { preHandler: [authenticate, authorize("ADMIN")] }, async (req: any, reply) => {
		try {
			const { csv: csvText } = req.body;
			if (!csvText || typeof csvText !== "string") {
				return reply.code(400).send({ error: "Dados CSV inválidos" });
			}
			const { headers, rows } = parseCsv(csvText);
			if (headers.length === 0 || rows.length === 0) {
				return reply.code(400).send({ error: "CSV vazio ou sem cabeçalhos" });
			}
			const objects = rowsToObjects(headers, rows);
			const cursos = await drizzleDb.findMany("curso", { select: { id: true, titulo: true } });
			const cursoMap = new Map(cursos.map((m: any) => [m.titulo, m.id]));
			let created = 0;
			let skipped = 0;
			for (const obj of objects) {
				const cursoTitulo = obj.curso_titulo?.trim();
				const titulo = obj.titulo?.trim();
				if (!cursoTitulo || !titulo) {
					skipped++;
					continue;
				}
				const cursoId = cursoMap.get(cursoTitulo) || (obj.curso_id?.trim() && cursoMap.get(obj.curso_id.trim()));
				if (!cursoId) {
					skipped++;
					continue;
				}
				const existingAula = await drizzleDb.findFirst("aula", { cursoId, titulo });
				if (existingAula) {
					skipped++;
					continue;
				}
				const maxOrdem =
					(await drizzleDb.aggregate("aula", { where: { cursoId }, _max: { ordem: true } }))._max.ordem || 0;
				const tipoAula = (obj.tipo_aula || obj.tipo || "VIDEO").trim().toUpperCase();
				await drizzleDb.create("aula", {
					cursoId,
					titulo,
					descricao: obj.descricao || "",
					ordem: maxOrdem + 1,
					tipo: VALID_TIPOS.includes(tipoAula) ? (tipoAula as any) : "VIDEO",
					videoUrl: obj.videoUrl || null,
					pdfUrl: obj.pdfUrl || null,
					obrigatorio: parseBool(obj.obrigatorio),
					duracaoMin: parseIntSafe(obj.duracaoMin),
					videoInicio: parseIntSafe(obj.videoInicio),
					videoFim: parseIntSafe(obj.videoFim),
				});
				created++;
			}
			await logActivity(req.userId!, "Importar Aulas", `Criadas: ${created}, Ignoradas: ${skipped}`);
			return reply.send({ created, skipped, total: objects.length, updated: 0, errors: [] });
		} catch (error) {
			logger.error("[IMPORT ERROR]", error);
			reply.code(500).send({ error: "Erro ao importar aulas" });
		}
	});

	fastify.post("/import/licoes", { preHandler: [authenticate, authorize("ADMIN")] }, async (req: any, reply) => {
		try {
			const { csv: csvText } = req.body;
			if (!csvText || typeof csvText !== "string") {
				return reply.code(400).send({ error: "Dados CSV inválidos" });
			}
			const { headers, rows } = parseCsv(csvText);
			if (headers.length === 0 || rows.length === 0) {
				return reply.code(400).send({ error: "CSV vazio ou sem cabeçalhos" });
			}
			const objects = rowsToObjects(headers, rows);
			const cursos = await drizzleDb.findMany("curso", { select: { id: true, titulo: true } });
			const cursoMap = new Map(cursos.map((m: any) => [m.titulo, m.id]));
			const aulas = await drizzleDb.findMany("aula", { select: { id: true, titulo: true, cursoId: true } });
			const aulaMap = new Map(aulas.map((a: any) => [`${a.cursoId}:${a.titulo}`, a.id]));
			let created = 0;
			let skipped = 0;
			for (const obj of objects) {
				const cursoTitulo = obj.curso_titulo?.trim();
				const aulaTitulo = obj.aula_titulo?.trim();
				const titulo = obj.titulo?.trim();
				if (!cursoTitulo || !aulaTitulo || !titulo) {
					skipped++;
					continue;
				}
				const cursoId = cursoMap.get(cursoTitulo) || (obj.curso_id?.trim() && cursoMap.get(obj.curso_id.trim()));
				if (!cursoId) {
					skipped++;
					continue;
				}
				const aulaId =
					aulaMap.get(`${cursoId}:${aulaTitulo}`) || (obj.aula_id?.trim() && aulaMap.get(obj.aula_id.trim()));
				if (!aulaId) {
					skipped++;
					continue;
				}
				const existing = await drizzleDb.findFirst("licao", { aulaId, titulo });
				if (existing) {
					skipped++;
					continue;
				}
				const maxOrdem =
					(await drizzleDb.aggregate("licao", { where: { aulaId }, _max: { ordem: true } }))._max.ordem || 0;
				const tipoLicao = (obj.tipo_aula || obj.tipo || "TEXTO").trim().toUpperCase();
				await drizzleDb.create("licao", {
					aulaId,
					titulo,
					tipo: VALID_TIPOS.includes(tipoLicao) ? (tipoLicao as any) : "TEXTO",
					conteudo: obj.conteudo || null,
					duracaoMin: parseIntSafe(obj.duracaoMin),
					inicioSeg: parseIntSafe(obj.inicioSeg),
					fimSeg: parseIntSafe(obj.fimSeg),
					ordem: maxOrdem + 1,
				});
				created++;
			}
			await logActivity(req.userId!, "Importar Licoes", `Criadas: ${created}, Ignoradas: ${skipped}`);
			return reply.send({ created, skipped, total: objects.length, updated: 0, errors: [] });
		} catch (error) {
			logger.error("[IMPORT ERROR]", error);
			reply.code(500).send({ error: "Erro ao importar lições" });
		}
	});

	fastify.post("/import/quiz", { preHandler: [authenticate, authorize("ADMIN")] }, async (req: any, reply) => {
		try {
			const { csv: csvText } = req.body;
			if (!csvText || typeof csvText !== "string") {
				return reply.code(400).send({ error: "Dados CSV inválidos" });
			}
			const { headers, rows } = parseCsv(csvText);
			if (headers.length === 0 || rows.length === 0) {
				return reply.code(400).send({ error: "CSV vazio ou sem cabeçalhos" });
			}
			const objects = rowsToObjects(headers, rows);
			const cursos = await drizzleDb.findMany("curso", { select: { id: true, titulo: true } });
			const cursoMap = new Map(cursos.map((m: any) => [m.titulo, m.id]));
			const aulas = await drizzleDb.findMany("aula", { select: { id: true, titulo: true, cursoId: true } });
			const aulaMap = new Map(aulas.map((a: any) => [`${a.cursoId}:${a.titulo}`, a.id]));
			let created = 0;
			let skipped = 0;
			const quizGroups = new Map<string, Record<string, string>[]>();

			for (const obj of objects) {
				const cursoTitulo = obj.curso_titulo?.trim();
				const aulaTitulo = obj.aula_titulo?.trim();
				if (!cursoTitulo || !aulaTitulo) {
					skipped++;
					continue;
				}
				const cursoId = cursoMap.get(cursoTitulo) || (obj.curso_id?.trim() && cursoMap.get(obj.curso_id.trim()));
				if (!cursoId) {
					skipped++;
					continue;
				}
				let aulaId =
					aulaMap.get(`${cursoId}:${aulaTitulo}`) ||
					(obj.aula_id?.trim() ? aulaMap.get(obj.aula_id.trim()) : undefined);
				if (!aulaId) {
					// Auto-create aula if missing
					const maxOrdemAula =
						(await drizzleDb.aggregate("aula", { where: { cursoId }, _max: { ordem: true } }))._max.ordem || 0;
					const createdAula = await drizzleDb.create("aula", {
						cursoId,
						titulo: aulaTitulo,
						descricao: "",
						ordem: maxOrdemAula + 1,
						tipo: "VIDEO",
						videoUrl: null,
						pdfUrl: null,
						obrigatorio: false,
						duracaoMin: null,
						videoInicio: null,
						videoFim: null,
					});
					aulaId = (createdAula as any).id;
					aulaMap.set(`${cursoId}:${aulaTitulo}`, aulaId as string);
				}
				const key = aulaId as string;
				if (!quizGroups.has(key)) quizGroups.set(key, []);
				quizGroups.get(key)!.push(obj);
			}

			for (const [aulaId, group] of quizGroups) {
				const first = group[0];
				const quizTitulo = first.quiz_titulo?.trim() || `Quiz`;
				const notaMinima = parseIntSafe(first.notaMinima) ?? 7;
				const autoGerar = parseBool(first.autoGerarCertificado);

				let quiz = await drizzleDb.findUnique("quiz", { aulaId });
				if (!quiz) {
					const newQuiz = await drizzleDb.create("quiz", {
						aulaId,
						titulo: quizTitulo,
						notaMinima,
						autoGerarCertificado: autoGerar,
					});
					quiz = newQuiz as any;
					created++;
				}

				const existingPerguntas = await drizzleDb.findMany("quizPergunta", { where: { quizId: quiz!.id } });
				const existingPerguntaTexts = new Set(existingPerguntas.map((p: any) => p.pergunta));

				const perguntasToAdd = group.filter(
					(r: Record<string, string>) => r.pergunta?.trim() && !existingPerguntaTexts.has(r.pergunta.trim()),
				);
				if (perguntasToAdd.length === 0) {
					skipped += group.length;
					continue;
				}

				const maxOrdem =
					(await drizzleDb.aggregate("quizPergunta", { where: { quizId: quiz!.id }, _max: { ordem: true } }))._max
						.ordem || 0;
				for (let i = 0; i < perguntasToAdd.length; i++) {
					const p = perguntasToAdd[i];
					const correta = (p.correta || "A").trim().toUpperCase();
					await drizzleDb.create("quizPergunta", {
						quizId: quiz!.id,
						pergunta: p.pergunta.trim(),
						opcaoA: p.opcaoA || "",
						opcaoB: p.opcaoB || "",
						opcaoC: p.opcaoC || null,
						opcaoD: p.opcaoD || null,
						correta: VALID_CORRETA.includes(correta) ? correta : "A",
						ordem: maxOrdem + i + 1,
					});
					created++;
				}
			}

			await logActivity(req.userId!, "Importar Quiz", `Criados: ${created}, Ignorados: ${skipped}`);
			return reply.send({ created, skipped, total: objects.length, updated: 0, errors: [] });
		} catch (error) {
			logger.error("[IMPORT ERROR]", error);
			reply.code(500).send({ error: "Erro ao importar quiz" });
		}
	});

	// ==================== SEARCH BY TITLES (for post-import links) ====================

	fastify.post("/search-by-titles", { preHandler: [authenticate, authorize("ADMIN")] }, async (req: any, reply) => {
		try {
			const { titles } = req.body;
			if (!Array.isArray(titles) || titles.length === 0) {
				return reply.code(400).send({ error: "Array de titulos invalido" });
			}

			const results: { type: string; id: string; titulo: string; cursoId?: string; aulaId?: string }[] = [];

			// Search cursos
			const cursos = await drizzleDb.findMany("curso", {
				where: { titulo: { in: titles } },
				select: { id: true, titulo: true },
			});
			for (const c of cursos) {
				results.push({ type: "curso", id: c.id, titulo: c.titulo });
			}

			// Search aulas (with parent curso info)
			const aulas = await drizzleDb.findMany("aula", {
				where: { titulo: { in: titles } },
				select: { id: true, titulo: true, cursoId: true },
			});
			for (const a of aulas) {
				results.push({ type: "aula", id: a.id, titulo: a.titulo, cursoId: a.cursoId });
			}

			// Search quizzes (with parent aula and curso info)
			const quizzesRaw = (await drizzleDb.findMany("quiz", {
				where: { titulo: { in: titles } },
				select: { id: true, titulo: true, aulaId: true },
			})) as any[];
			const quizAulaIds = [...new Set(quizzesRaw.map((q: any) => q.aulaId).filter(Boolean))];
			const quizAulas = (await drizzleDb.findMany("aula", {
				where: { id: { in: quizAulaIds } },
				select: { id: true, cursoId: true },
			})) as any[];
			const aulaMap = new Map(quizAulas.map((a: any) => [a.id, a]));
			const quizzes = quizzesRaw.map((q: any) => ({ ...q, aula: aulaMap.get(q.aulaId) }));
			for (const q of quizzes) {
				results.push({ type: "quiz", id: q.id, titulo: q.titulo, aulaId: q.aulaId, cursoId: q.aula?.cursoId });
			}

			return reply.send(results);
		} catch (error) {
			logger.error("[SEARCH BY TITLES ERROR]", error);
			reply.code(500).send({ error: "Erro ao buscar por titulos" });
		}
	});

	done();
};

export default importExportRoutes;
