import { Router } from "express";
import { db } from "../lib/db";
import logger from "../lib/logger";
import { authenticate, authorize } from "../middleware/auth";
import { logActivity } from "../services/log";

const router = Router();

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

function sendCsv(res: any, filename: string, csvContent: string) {
	res.setHeader("Content-Type", "text/csv; charset=utf-8");
	res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
	res.send(`\uFEFF${csvContent}`);
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
	if (h.has("aula_titulo") && (h.has("conteudo") || h.has("inicioseg") || (h.has("titulo") && !h.has("curso_titulo"))))
		return "licao";
	if (h.has("curso_titulo") && h.has("titulo") && !h.has("pergunta")) return "aula";
	if (h.has("titulo") && h.has("descricao") && !h.has("curso_titulo")) return "curso";
	return null;
}

// ==================== EXPORT (with IDs) ====================

router.get("/export/cursos", authenticate, authorize("ADMIN"), async (_req: any, res) => {
	try {
		const cursos = await db.findMany("curso", {
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
		sendCsv(res, "cursos.csv", csv);
	} catch (error) {
		logger.error("[EXPORT ERROR]", error);
		res.status(500).json({ error: "Erro ao exportar cursos" });
	}
});

router.get("/export/aulas", authenticate, authorize("ADMIN"), async (_req: any, res) => {
	try {
		const aulas = await db.findMany("aula", {
			include: { curso: { select: { id: true, titulo: true } } },
			orderBy: [{ curso: { ordem: "asc" } }, { ordem: "asc" }],
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
		sendCsv(res, "aulas.csv", csv);
	} catch (error) {
		logger.error("[EXPORT ERROR]", error);
		res.status(500).json({ error: "Erro ao exportar aulas" });
	}
});

router.get("/export/licoes", authenticate, authorize("ADMIN"), async (_req: any, res) => {
	try {
		const licoes = await db.findMany("licao", {
			include: {
				aula: {
					select: {
						id: true,
						titulo: true,
						curso: { select: { id: true, titulo: true } },
					},
				},
			},
			orderBy: [{ aula: { curso: { ordem: "asc" } } }, { aula: { ordem: "asc" } }, { ordem: "asc" }],
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
		sendCsv(res, "licoes.csv", csv);
	} catch (error) {
		logger.error("[EXPORT ERROR]", error);
		res.status(500).json({ error: "Erro ao exportar licoes" });
	}
});

router.get("/export/quiz", authenticate, authorize("ADMIN"), async (_req: any, res) => {
	try {
		const quizzes = await db.findMany("quiz", {
			include: {
				perguntas: { orderBy: { ordem: "asc" } },
				aula: {
					select: {
						id: true,
						titulo: true,
						curso: { select: { id: true, titulo: true } },
					},
				},
			},
			orderBy: [{ aula: { curso: { ordem: "asc" } } }, { aula: { ordem: "asc" } }],
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
		sendCsv(res, "quiz.csv", csv);
	} catch (error) {
		logger.error("[EXPORT ERROR]", error);
		res.status(500).json({ error: "Erro ao exportar quiz" });
	}
});

// ==================== EXPORT ALL (unified CSV) ====================

router.get("/export/all", authenticate, authorize("ADMIN"), async (_req: any, res) => {
	try {
		const rows: string[][] = [];

		// Cursos
		const cursos = await db.findMany("curso", { orderBy: { ordem: "asc" } });
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
		const aulas = await db.findMany("aula", {
			include: { curso: { select: { id: true, titulo: true } } },
			orderBy: [{ curso: { ordem: "asc" } }, { ordem: "asc" }],
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

		// Licoes
		const licoes = await db.findMany("licao", {
			include: {
				aula: {
					select: {
						id: true,
						titulo: true,
						curso: { select: { id: true, titulo: true } },
					},
				},
			},
			orderBy: [{ aula: { curso: { ordem: "asc" } } }, { aula: { ordem: "asc" } }, { ordem: "asc" }],
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

		// Quiz perguntas
		const quizzes = await db.findMany("quiz", {
			include: {
				perguntas: { orderBy: { ordem: "asc" } },
				aula: {
					select: {
						id: true,
						titulo: true,
						curso: { select: { id: true, titulo: true } },
					},
				},
			},
			orderBy: [{ aula: { curso: { ordem: "asc" } } }, { aula: { ordem: "asc" } }],
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

		const csv = [UNIFIED_HEADERS.join(","), ...rows.map((r) => r.join(","))].join("\n");
		sendCsv(res, "conteudo-completo.csv", csv);
	} catch (error) {
		logger.error("[EXPORT ALL ERROR]", error);
		res.status(500).json({ error: "Erro ao exportar dados" });
	}
});

// ==================== DETECT ====================

router.post("/detect", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const { csv: csvText } = req.body;
		if (!csvText || typeof csvText !== "string") {
			return res.status(400).json({ error: "Dados CSV invalidos" });
		}
		const { headers, rows } = parseCsv(csvText);
		if (headers.length === 0) {
			return res.status(400).json({ error: "CSV sem cabecalhos" });
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
			if (!has("aula_titulo") && !has("aula_id")) missingRequired.push("aula_titulo ou aula_id");
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

		res.json({
			type: detectedType,
			columns: headers,
			rowCount,
			missingRequired,
			warnings,
			valid: missingRequired.length === 0,
			preview,
		});
	} catch (error) {
		logger.error("[DETECT ERROR]", error);
		res.status(500).json({ error: "Erro ao detectar CSV" });
	}
});

// ==================== UNIFIED IMPORT ====================

router.post("/import/unified", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const { csv: csvText, mode = "create" } = req.body;
		if (!csvText || typeof csvText !== "string") {
			return res.status(400).json({ error: "Dados CSV invalidos" });
		}
		const { headers, rows } = parseCsv(csvText);
		if (headers.length === 0 || rows.length === 0) {
			return res.status(400).json({ error: "CSV vazio ou sem cabecalhos" });
		}

		const objects = rowsToObjects(headers, rows);
		const isUpsert = mode === "upsert";
		const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
		const hasTipoColumn = lowerHeaders.includes("tipo");
		const errors: { row: number; field: string; message: string }[] = [];

		// Pre-load lookups
		const allModulos = await db.findMany("curso", { select: { id: true, titulo: true } });
		const cursoByTitulo = new Map(allModulos.map((m: any) => [m.titulo, m.id]));
		const cursoById = new Map(allModulos.map((m: any) => [m.id, m.titulo]));

		const allAulas = await db.findMany("aula", { select: { id: true, titulo: true, cursoId: true } });
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

		// Resolve helper: get aulaId from row
		function resolveAulaId(obj: Record<string, string>, cursoId: string): string | null {
			const id = obj.aula_id?.trim();
			if (id && aulaById.has(id)) return id;
			const titulo = obj.aula_titulo?.trim();
			if (titulo) return (aulaByKey.get(`${cursoId}:${titulo}`) as string) || null;
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
				return res.status(400).json({ error: "Nao foi possivel detectar o tipo do CSV. Adicione a coluna 'tipo'." });
			}
			typeGroups[detected] = objects;
		}

		const result = { created: 0, updated: 0, skipped: 0, total: objects.length, errors };

		// Process in order: cursos → aulas → licoes → quiz
		// CURSOS
		for (const obj of typeGroups.curso) {
			const titulo = obj.titulo?.trim();
			if (!titulo) {
				result.skipped++;
				continue;
			}

			if (isUpsert && obj.id?.trim()) {
				const existing = await db.findUnique("curso", { id: obj.id.trim() });
				if (existing) {
					await db.update(
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

			const existingByTitle = await db.findFirst("curso", { titulo });
			if (existingByTitle) {
				result.skipped++;
				continue;
			}

			const maxOrdem = (await db.aggregate("curso", { _max: { ordem: true } }))._max.ordem || 0;
			const created = await db.create("curso", {
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
				errors.push({ row: 0, field: "tipo_aula", message: `Tipo invalido: "${tipoAula}". Use: VIDEO, PDF ou TEXTO` });
				result.skipped++;
				continue;
			}

			if (isUpsert && obj.id?.trim()) {
				const existing = await db.findUnique("aula", { id: obj.id.trim() });
				if (existing) {
					await db.update(
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

			const existingAula = await db.findFirst("aula", { cursoId, titulo });
			if (existingAula) {
				result.skipped++;
				continue;
			}

			const maxOrdem = (await db.aggregate("aula", { where: { cursoId }, _max: { ordem: true } }))._max.ordem || 0;
			const created = await db.create("aula", {
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
			const aulaId = resolveAulaId(obj, cursoId);
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
				const existing = await db.findUnique("licao", { id: obj.id.trim() });
				if (existing) {
					await db.update(
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

			const existingLicao = await db.findFirst("licao", { aulaId, titulo });
			if (existingLicao) {
				result.skipped++;
				continue;
			}

			const maxOrdem = (await db.aggregate("licao", { where: { aulaId }, _max: { ordem: true } }))._max.ordem || 0;
			await db.create("licao", {
				aulaId,
				titulo,
				tipo: tipoLicao as any,
				conteudo: obj.conteudo || null,
				duracaoMin: parseIntSafe(obj.duracaoMin),
				inicioSeg: parseIntSafe(obj.inicioSeg),
				fimSeg: parseIntSafe(obj.fimSeg),
				ordem: parseIntSafe(obj.ordem) ?? maxOrdem + 1,
			});
			result.created++;
		}

		// QUIZ PERGUNTAS
		const quizGroups = new Map<string, { aulaId: string; rows: Record<string, string>[] }>();
		for (const obj of typeGroups.quiz_pergunta) {
			const cursoId = resolveModuloId(obj);
			if (!cursoId) {
				result.skipped++;
				continue;
			}
			const aulaId = resolveAulaId(obj, cursoId);
			if (!aulaId) {
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

			let quiz = await db.findUnique("quiz", { aulaId });
			if (!quiz) {
				const newQuiz = await db.create("quiz", {
					aulaId,
					titulo: quizTitulo,
					notaMinima,
					autoGerarCertificado: autoGerar,
				});
				quiz = newQuiz as any;
				result.created++;
			}

			const existingPerguntas = await db.findMany("quizPergunta", { where: { quizId: quiz!.id } });
			const existingByPergunta = new Map(existingPerguntas.map((p: any) => [p.pergunta, p]));
			const existingById = new Map(existingPerguntas.map((p: any) => [p.id, p]));

			const maxOrdem =
				(await db.aggregate("quizPergunta", { where: { quizId: quiz!.id }, _max: { ordem: true } }))._max.ordem || 0;

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
						await db.update(
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
				await db.create("quizPergunta", {
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

		res.json(result);
	} catch (error) {
		logger.error("[UNIFIED IMPORT ERROR]", error);
		res.status(500).json({ error: "Erro ao importar dados" });
	}
});

// ==================== LEGACY IMPORT (kept for backward compat) ====================

router.post("/import/cursos", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const { csv: csvText } = req.body;
		if (!csvText || typeof csvText !== "string") {
			return res.status(400).json({ error: "Dados CSV inválidos" });
		}
		const { headers, rows } = parseCsv(csvText);
		if (headers.length === 0 || rows.length === 0) {
			return res.status(400).json({ error: "CSV vazio ou sem cabeçalhos" });
		}
		const objects = rowsToObjects(headers, rows);
		const existing = await db.findMany("curso", { select: { titulo: true } });
		const existingTitles = new Set(existing.map((m: any) => m.titulo));
		let created = 0;
		let skipped = 0;
		const maxOrdem = (await db.aggregate("curso", { _max: { ordem: true } }))._max.ordem || 0;
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
			await db.create("curso", {
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
		res.json({ created, skipped, total: objects.length, updated: 0, errors: [] });
	} catch (error) {
		logger.error("[IMPORT ERROR]", error);
		res.status(500).json({ error: "Erro ao importar cursos" });
	}
});

router.post("/import/aulas", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const { csv: csvText } = req.body;
		if (!csvText || typeof csvText !== "string") {
			return res.status(400).json({ error: "Dados CSV inválidos" });
		}
		const { headers, rows } = parseCsv(csvText);
		if (headers.length === 0 || rows.length === 0) {
			return res.status(400).json({ error: "CSV vazio ou sem cabeçalhos" });
		}
		const objects = rowsToObjects(headers, rows);
		const cursos = await db.findMany("curso", { select: { id: true, titulo: true } });
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
			const existingAula = await db.findFirst("aula", { cursoId, titulo });
			if (existingAula) {
				skipped++;
				continue;
			}
			const maxOrdem = (await db.aggregate("aula", { where: { cursoId }, _max: { ordem: true } }))._max.ordem || 0;
			const tipoAula = (obj.tipo_aula || obj.tipo || "VIDEO").trim().toUpperCase();
			await db.create("aula", {
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
		res.json({ created, skipped, total: objects.length, updated: 0, errors: [] });
	} catch (error) {
		logger.error("[IMPORT ERROR]", error);
		res.status(500).json({ error: "Erro ao importar aulas" });
	}
});

router.post("/import/licoes", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const { csv: csvText } = req.body;
		if (!csvText || typeof csvText !== "string") {
			return res.status(400).json({ error: "Dados CSV inválidos" });
		}
		const { headers, rows } = parseCsv(csvText);
		if (headers.length === 0 || rows.length === 0) {
			return res.status(400).json({ error: "CSV vazio ou sem cabeçalhos" });
		}
		const objects = rowsToObjects(headers, rows);
		const cursos = await db.findMany("curso", { select: { id: true, titulo: true } });
		const cursoMap = new Map(cursos.map((m: any) => [m.titulo, m.id]));
		const aulas = await db.findMany("aula", { select: { id: true, titulo: true, cursoId: true } });
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
			const existing = await db.findFirst("licao", { aulaId, titulo });
			if (existing) {
				skipped++;
				continue;
			}
			const maxOrdem = (await db.aggregate("licao", { where: { aulaId }, _max: { ordem: true } }))._max.ordem || 0;
			const tipoLicao = (obj.tipo_aula || obj.tipo || "TEXTO").trim().toUpperCase();
			await db.create("licao", {
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
		res.json({ created, skipped, total: objects.length, updated: 0, errors: [] });
	} catch (error) {
		logger.error("[IMPORT ERROR]", error);
		res.status(500).json({ error: "Erro ao importar lições" });
	}
});

router.post("/import/quiz", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const { csv: csvText } = req.body;
		if (!csvText || typeof csvText !== "string") {
			return res.status(400).json({ error: "Dados CSV inválidos" });
		}
		const { headers, rows } = parseCsv(csvText);
		if (headers.length === 0 || rows.length === 0) {
			return res.status(400).json({ error: "CSV vazio ou sem cabeçalhos" });
		}
		const objects = rowsToObjects(headers, rows);
		const cursos = await db.findMany("curso", { select: { id: true, titulo: true } });
		const cursoMap = new Map(cursos.map((m: any) => [m.titulo, m.id]));
		const aulas = await db.findMany("aula", { select: { id: true, titulo: true, cursoId: true } });
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
			const aulaId =
				aulaMap.get(`${cursoId}:${aulaTitulo}`) || (obj.aula_id?.trim() ? aulaMap.get(obj.aula_id.trim()) : undefined);
			if (!aulaId) {
				skipped++;
				continue;
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

			let quiz = await db.findUnique("quiz", { aulaId });
			if (!quiz) {
				const newQuiz = await db.create("quiz", {
					aulaId,
					titulo: quizTitulo,
					notaMinima,
					autoGerarCertificado: autoGerar,
				});
				quiz = newQuiz as any;
				created++;
			}

			const existingPerguntas = await db.findMany("quizPergunta", { where: { quizId: quiz!.id } });
			const existingPerguntaTexts = new Set(existingPerguntas.map((p: any) => p.pergunta));

			const perguntasToAdd = group.filter(
				(r: Record<string, string>) => r.pergunta?.trim() && !existingPerguntaTexts.has(r.pergunta.trim()),
			);
			if (perguntasToAdd.length === 0) {
				skipped += group.length;
				continue;
			}

			const maxOrdem =
				(await db.aggregate("quizPergunta", { where: { quizId: quiz!.id }, _max: { ordem: true } }))._max.ordem || 0;
			for (let i = 0; i < perguntasToAdd.length; i++) {
				const p = perguntasToAdd[i];
				const correta = (p.correta || "A").trim().toUpperCase();
				await db.create("quizPergunta", {
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
		res.json({ created, skipped, total: objects.length, updated: 0, errors: [] });
	} catch (error) {
		logger.error("[IMPORT ERROR]", error);
		res.status(500).json({ error: "Erro ao importar quiz" });
	}
});

export default router;
