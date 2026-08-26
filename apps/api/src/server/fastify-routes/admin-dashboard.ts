import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { authenticate, authorize } from "../fastify-plugins/auth";
import { sendCustomEmail } from "../services/email";
import { logActivity } from "../services/log";

/**
 * Admin Dashboard routes — migrated from Express routes/admin-dashboard.ts.
 * GET /api/admin/dashboard — consolidated admin dashboard data
 * POST /api/admin/dashboard/send-email — send custom email to user
 */
const adminDashboardRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	// GET /api/admin/dashboard
	fastify.get(
		"/",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (_request: FastifyRequest, reply: FastifyReply) => {
			try {
				const now = new Date();
				const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

				const [
					totalUsers,
					totalModulos,
					totalAulas,
					totalCertificates,
					quizzesAprovados,
					totalNotifications,
					usersThisMonth,
					progressThisMonth,
				] = await Promise.all([
					drizzleDb.count("user"),
					drizzleDb.count("curso"),
					drizzleDb.count("aula"),
					drizzleDb.count("certificate"),
					drizzleDb.count("quizResponse", { concluido: true }),
					drizzleDb.count("notification"),
					drizzleDb.count("user", { createdAt: { gte: thirtyDaysAgo } }),
					drizzleDb.count("progresso", { createdAt: { gte: thirtyDaysAgo } }),
				]);

				const acessosRecentes = await drizzleDb.findMany("activityLog", {
					where: { acao: "Login" },
					orderBy: { createdAt: "desc" },
					take: 10,
				});

				const atividadesRecentes = await drizzleDb.findMany("activityLog", {
					orderBy: { createdAt: "desc" },
					take: 20,
				});

				const aulaCounts = (await drizzleDb.groupBy("aula", {
					by: ["cursoId"],
					_count: { id: true },
				})) as any[];
				const aulaCountMap = new Map(aulaCounts.map((ac: any) => [ac.cursoId, ac._count.id]));

				const progressCounts = (await drizzleDb.groupBy("progresso", {
					by: ["cursoId", "concluido"],
					_count: { id: true },
				})) as any[];
				const progressMap = new Map<string, { acessos: number; concluidos: number }>();
				for (const pc of progressCounts) {
					const existing = progressMap.get(pc.cursoId) || { acessos: 0, concluidos: 0 };
					existing.acessos += pc._count.id;
					if (pc.concluido) existing.concluidos += pc._count.id;
					progressMap.set(pc.cursoId, existing);
				}

				const cursos = (await drizzleDb.findMany("curso")) as any[];

				const cursosRecentes = cursos.map((m: any) => {
					const totalAulas = aulaCountMap.get(m.id) || 0;
					const prog = progressMap.get(m.id) || { acessos: 0, concluidos: 0 };
					return {
						id: m.id,
						titulo: m.titulo,
						totalAulas,
						acessos: prog.acessos,
						concluidos: prog.concluidos,
						percentual: prog.acessos > 0 ? Math.round((prog.concluidos / prog.acessos) * 100) : 0,
					};
				});
				cursosRecentes.sort((a: any, b: any) => b.acessos - a.acessos);
				const topCursos = cursosRecentes.slice(0, 10);

				return reply.send({
					resumoGeral: {
						totalUsers,
						totalModulos,
						totalAulas,
						totalCertificates,
						quizzesAprovados,
						totalNotifications,
						usersThisMonth,
						progressThisMonth,
					},
					acessosRecentes,
					atividadesRecentes,
					cursosRecentes: topCursos,
					emailsStats: {
						total: 0,
						byAction: [],
					},
				});
			} catch (error) {
				logger.error("[ADMIN DASHBOARD ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar dados do dashboard admin" });
			}
		},
	);

	// POST /api/admin/dashboard/send-email
	fastify.post(
		"/send-email",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { userId, assunto, mensagem } = request.body as any;

				if (!userId || !assunto || !mensagem) {
					return reply.code(400).send({ error: "userId, assunto e mensagem são obrigatórios" });
				}

				const targetUser = (await drizzleDb.findUnique("user", { id: userId })) as any;

				if (!targetUser) {
					return reply.code(404).send({ error: "Usuário não encontrado" });
				}

				const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;margin:0;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <div style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:22px;">Academia PayGas</h1>
            <p style="margin:5px 0 0;font-size:14px;">Mensagem do SuperAdministrador</p>
          </div>
          <div style="padding:30px;">
            <h2 style="margin:0 0 8px;color:#333;">Olá, ${targetUser.nome || targetUser.email}!</h2>
            <div style="color:#555;font-size:15px;line-height:1.6;white-space:pre-wrap;">${mensagem}</div>
          </div>
          <div style="background:#f8f9fa;padding:16px;text-align:center;color:#999;font-size:11px;">
            <p style="margin:0;">Este é um email automático da Academia PayGas.</p>
            <p style="margin:4px 0 0;">© 2026 PayGas - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `;

				const result = await sendCustomEmail(targetUser.email, assunto, htmlBody);

				if (result.success) {
					await logActivity(request.userId!, "Email Enviado", `Para: ${targetUser.email} | Assunto: ${assunto}`);
					return reply.send({ success: true, message: `Email enviado para ${targetUser.email}` });
				} else {
					logger.error(`[ADMIN EMAIL] Falha envio para ${targetUser.email}: ${result.error}`);
					return reply.code(500).send({ success: false, error: `Falha ao enviar email: ${result.error}` });
				}
			} catch (error) {
				logger.error("[ADMIN SEND EMAIL ERROR]", error);
				return reply.code(500).send({ error: "Erro ao enviar email" });
			}
		},
	);

	done();
};

export default adminDashboardRoutes;
