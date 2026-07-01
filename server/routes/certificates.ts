import { Router } from "express";
import { db } from "../lib/db";
import logger from "../lib/logger";
import { authenticate, authorize } from "../middleware/auth";
import { logActivity } from "../services/log";
import { getStringParam } from "../utils/queryParams";

const router = Router();

// GET /api/certificates
router.get("/", authenticate, async (req: any, res) => {
	try {
		const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
		const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
		const skip = (page - 1) * limit;

		let where: any = {};

		if (req.userRole === "ADMIN") {
			// Admin sees all certificates
			where = {};
		} else if (req.userRole === "GESTOR") {
			// Gestor sees own + team members' certificates
			const teamMembers = await db.findMany("user", {
				where: { gestorId: req.userId },
				select: { id: true },
			});
			const teamIds = teamMembers.map((m: any) => m.id);
			where = { userId: { in: [req.userId, ...teamIds] } };
		} else {
			// ATENDENTE sees only own
			where = { userId: req.userId };
		}

		const [certs, total] = await Promise.all([
			db.findMany("certificate", {
				where,
				orderBy: { createdAt: "desc" },
				skip,
				take: limit,
				include: {
					user: {
						select: { id: true, nome: true, email: true, role: true, gestorId: true },
					},
					modulo: {
						select: { id: true, titulo: true, icone: true, certificadoTemplate: true },
					},
				},
			}),
			db.count("certificate", where),
		]);

		res.json({
			data: certs,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar certificados" });
	}
});

// POST /api/certificates
router.post("/", authenticate, async (req: any, res) => {
	try {
		const { moduloId } = req.body;
		if (!moduloId) return res.status(400).json({ error: "moduloId é obrigatório" });

		const modulo = (await db.findUnique("modulo", { id: moduloId })) as any;
		if (!modulo) return res.status(404).json({ error: "Módulo não encontrado" });

		const aulas = (await db.findMany("aula", { where: { moduloId } })) as any[];
		const completedCount = await db.count("progresso", {
			moduloId,
			userId: req.userId,
			concluido: true,
		});
		if (completedCount < aulas.length) {
			return res.status(400).json({ error: "Complete todas as aulas antes de solicitar o certificado" });
		}

		// Atomic upsert to prevent race condition duplicates
		const certStatus = modulo.autoCertificado ? "APPROVED" : "PENDING";
		const cert = (await db.upsert(
			"certificate",
			{ userId_moduloId: { userId: req.userId, moduloId } },
			{ userId: req.userId, moduloId, status: certStatus },
			{},
		)) as any;

		await logActivity(req.userId, "Certificado Solicitado", `Modulo: ${modulo.titulo}`);
		res.status(201).json(cert);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao criar certificado" });
	}
});

// PUT /api/certificates/:id/approve
router.put("/:id/approve", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "ID inválido" });

		const existing = (await db.findUnique("certificate", { id })) as any;
		if (!existing) return res.status(404).json({ error: "Certificado não encontrado" });
		if (existing.status !== "PENDING") {
			return res.status(400).json({
				error: `Não é possível aprovar um certificado com status "${existing.status}". Apenas certificados PENDING podem ser aprovados.`,
			});
		}

		const cert = (await db.update(
			"certificate",
			{ id },
			{
				status: "APPROVED",
				aprovadoPor: req.userId,
				aprovadoEm: new Date(),
			},
		)) as any;

		await logActivity(req.userId!, "Certificado Aprovado", `Certificado: ${id}`);
		res.json(cert);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao aprovar certificado" });
	}
});

// PUT /api/certificates/:id/issue
router.put("/:id/issue", authenticate, authorize("ADMIN"), async (req: any, res) => {
	try {
		const id = getStringParam(req.params.id);
		if (!id) return res.status(400).json({ error: "ID inválido" });

		const existing = (await db.findUnique("certificate", { id })) as any;
		if (!existing) return res.status(404).json({ error: "Certificado não encontrado" });
		if (existing.status !== "APPROVED") {
			return res.status(400).json({
				error: `Não é possível emitir um certificado com status "${existing.status}". Apenas certificados APPROVED podem ser emitidos.`,
			});
		}

		const cert = (await db.update("certificate", { id }, { status: "ISSUED" })) as any;

		await logActivity(req.userId!, "Certificado Emitido", `Certificado: ${id}`);
		res.json(cert);
	} catch (error) {
		logger.error("[ROUTE ERROR]", error);
		res.status(500).json({ error: "Erro ao emitir certificado" });
	}
});

export default router;
