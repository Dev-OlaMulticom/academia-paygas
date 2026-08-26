import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { authenticate, authorize } from "../fastify-plugins/auth";
import { sendVerificationEmail } from "../services/email";
import { awardPointsIfNotAwarded } from "../services/gamification";
import { logActivity } from "../services/log";
import { getStringParam } from "../utils/queryParams";
import { passedQuizResult } from "../lib/quiz";

/**
 * Usuarios routes — migrated from Express routes/usuarios.ts.
 * Handles user CRUD, team management, account validation, and admin fix tools.
 */
const usuariosRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	// Helper: check if gestor owns the user
	async function gestorOwnsUser(gestorId: string, userId: string): Promise<boolean> {
		const user = (await drizzleDb.findUnique("user", { id: userId })) as any;
		return user?.gestorId === gestorId;
	}

	// GET /api/usuarios
	fastify.get(
		"/",
		{ preHandler: [authenticate, authorize("ADMIN", "GESTOR")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const q = request.query as Record<string, string | undefined>;
				const page = Math.max(1, parseInt(q.page as string, 10) || 1);
				const limit = Math.min(100, Math.max(1, parseInt(q.limit as string, 10) || 20));
				const skip = (page - 1) * limit;

				const where = request.userRole === "GESTOR" ? { gestorId: request.userId } : {};

				const [users, total] = await Promise.all([
					drizzleDb.findMany("user", {
						where,
						orderBy: { nome: "asc" },
						skip,
						take: limit,
					}),
					drizzleDb.count("user", where),
				]);

				const userIds = (users as any[]).map((u: any) => u.id);
				const estIds = (users as any[]).map((u: any) => u.estabelecimentoId).filter(Boolean);
				const [progressos, certificates, estabelecimentos] = await Promise.all([
					drizzleDb.findMany("progresso", { where: { userId: { in: userIds } } }),
					drizzleDb.findMany("certificate", { where: { userId: { in: userIds } } }),
					drizzleDb.findMany("estabelecimento", { where: { id: { in: estIds } } }),
				]);

				const progressCountByUser = new Map<string, number>();
				for (const p of progressos as any[]) {
					progressCountByUser.set(p.userId, (progressCountByUser.get(p.userId) || 0) + 1);
				}
				const certCountByUser = new Map<string, number>();
				for (const c of certificates as any[]) {
					certCountByUser.set(c.userId, (certCountByUser.get(c.userId) || 0) + 1);
				}
				const estById = new Map<string, any>();
				for (const e of estabelecimentos as any[]) {
					estById.set(e.id, e);
				}

				const usersWithXp = (users as any[]).map((u: any) => ({
					id: u.id,
					email: u.email,
					nome: u.nome,
					role: u.role,
					emailVerificado: u.emailVerificado,
					createdAt: u.createdAt,
					lastLogin: u.lastLogin,
					gestorId: u.gestorId,
					gestorNome: u.gestor?.nome || null,
					xp: u.xp,
					level: u.level,
					progressCount: progressCountByUser.get(u.id) || 0,
					certCount: certCountByUser.get(u.id) || 0,
					estabelecimento: estById.get(u.estabelecimentoId)
						? {
								id: estById.get(u.estabelecimentoId).id,
								nome: estById.get(u.estabelecimentoId).nome,
								cidade: estById.get(u.estabelecimentoId).cidade,
								uf: estById.get(u.estabelecimentoId).uf,
							}
						: null,
				}));

				return reply.send({
					data: usersWithXp,
					pagination: {
						page,
						limit,
						total,
						totalPages: Math.ceil(total / limit),
					},
				});
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar usuarios" });
			}
		},
	);

	// POST /api/usuarios
	fastify.post(
		"/",
		{ preHandler: [authenticate, authorize("ADMIN", "GESTOR")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { email, nome, senha, role, gestorId } = request.body as any;
				if (!email || !nome || !senha || !role) {
					return reply.code(400).send({ error: "Todos os campos são obrigatórios" });
				}

				const validRoles = ["ADMIN", "GESTOR", "ATENDENTE"];
				if (!validRoles.includes(role)) {
					return reply.code(400).send({ error: "Role inválido" });
				}

				const exists = await drizzleDb.findUnique("user", { email });
				if (exists) return reply.code(409).send({ error: "Email já cadastrado" });

				if (request.userRole === "GESTOR" && role !== "ATENDENTE") {
					return reply.code(403).send({ error: "Gestores só podem criar usuários ATENDENTE" });
				}

				if (senha.length < 8) {
					return reply.code(400).send({ error: "Senha deve ter pelo menos 8 caracteres" });
				}

				let finalGestorId: string | undefined;
				if (role === "ATENDENTE") {
					if (request.userRole === "GESTOR") {
						finalGestorId = request.userId;
					} else if (gestorId) {
						finalGestorId = gestorId;
					}
				}

				const hashedPassword = await bcrypt.hash(senha, 12);
				const verificationToken = crypto.randomBytes(32).toString("hex");
				const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

				const user = (await drizzleDb.create("user", {
					email,
					nome,
					senha: hashedPassword,
					role: role,
					gestorId: finalGestorId,
					tokenVerificacao: verificationToken,
					tokenExpiry,
				})) as any;

				await logActivity(request.userId!, "Criar Usuario", `Criou ${role}: ${nome} (${email})`);
				await awardPointsIfNotAwarded(request.userId!, "MODULE_OPEN", `USER_CREATE:${user.id}`);

				sendVerificationEmail(email, nome, verificationToken).then((r) => {
					if (!r.success) logger.warn(`[EMAIL] Falha verificacao para ${email}: ${r.error}`);
				});

				return reply.code(201).send({
					id: user.id,
					email: user.email,
					nome: user.nome,
					role: user.role,
					emailVerificado: user.emailVerificado,
					createdAt: user.createdAt,
				});
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao criar usuário" });
			}
		},
	);

	// PUT /api/usuarios/change-password (MUST be before /:id to avoid route shadowing)
	fastify.put(
		"/change-password",
		{ preHandler: [authenticate] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { currentPassword, newPassword } = request.body as any;
				if (!currentPassword || !newPassword) {
					return reply.code(400).send({ error: "Senha atual e nova senha são obrigatórias" });
				}

				if (newPassword.length < 8) {
					return reply.code(400).send({ error: "Nova senha deve ter pelo menos 8 caracteres" });
				}

				const user = (await drizzleDb.findUnique("user", { id: request.userId! })) as any;
				if (!user) {
					return reply.code(404).send({ error: "Usuário não encontrado" });
				}

				const validPassword = await bcrypt.compare(currentPassword, user.senha);
				if (!validPassword) {
					return reply.code(401).send({ error: "Senha atual incorreta" });
				}

				const hashedPassword = await bcrypt.hash(newPassword, 12);
				await drizzleDb.update("user", { id: request.userId! }, { senha: hashedPassword });

				await logActivity(request.userId!, "Alterar Senha", "Senha alterada com sucesso");
				return reply.send({ message: "Senha alterada com sucesso" });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao alterar senha" });
			}
		},
	);

	// PUT /api/usuarios/:id
	fastify.put(
		"/:id",
		{ preHandler: [authenticate, authorize("ADMIN", "GESTOR")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const { nome, email, role, gestorId } = request.body as any;
				const id = getStringParam((request.params as any).id);
				if (!id) return reply.code(400).send({ error: "ID inválido" });

				// GESTOR can only edit their own team members
				if (request.userRole === "GESTOR") {
					const isOwn = await gestorOwnsUser(request.userId!, id);
					if (!isOwn) return reply.code(403).send({ error: "Sem permissão para editar este usuario" });
					// GESTOR cannot change role
					if (role && role !== "ATENDENTE") {
						return reply.code(403).send({ error: "Gestores só podem manter role ATENDENTE" });
					}
				}

				const updateData: any = {};
				if (nome) updateData.nome = nome;
				if (email) updateData.email = email;
				if (role) updateData.role = role;
				if (gestorId !== undefined) updateData.gestorId = gestorId || null;

				const user = (await drizzleDb.update("user", { id }, updateData)) as any;

				await logActivity(request.userId!, "Editar Usuario", `Editou usuario: ${user.nome}`);
				return reply.send({
					id: user.id,
					email: user.email,
					nome: user.nome,
					role: user.role,
					gestorId: user.gestorId,
				});
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao atualizar usuário" });
			}
		},
	);

	// DELETE /api/usuarios/:id
	fastify.delete(
		"/:id",
		{ preHandler: [authenticate, authorize("ADMIN", "GESTOR")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const id = getStringParam((request.params as any).id);
				if (!id) return reply.code(400).send({ error: "ID inválido" });

				// GESTOR can only delete their own team members
				if (request.userRole === "GESTOR") {
					const isOwn = await gestorOwnsUser(request.userId!, id);
					if (!isOwn) return reply.code(403).send({ error: "Sem permissão para excluir este usuario" });
				}

				const user = (await drizzleDb.findUnique("user", { id })) as any;
				await drizzleDb.delete("user", { id });

				await logActivity(request.userId!, "Excluir Usuario", `Excluiu usuario: ${user?.nome} (${user?.email})`);
				return reply.send({ success: true });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao excluir usuário" });
			}
		},
	);

	// GET /api/usuarios/equipe
	fastify.get(
		"/equipe",
		{ preHandler: [authenticate, authorize("ADMIN", "GESTOR")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				if (request.userRole === "GESTOR") {
					const members = (await drizzleDb.findMany("user", {
						where: { gestorId: request.userId },
					})) as any[];

					const memberIds = members.map((m: any) => m.id);
					const estIds = members.map((m: any) => m.estabelecimentoId).filter(Boolean);
					const [progressos, certificates, estabelecimentos] = await Promise.all([
						drizzleDb.findMany("progresso", { where: { userId: { in: memberIds } } }),
						drizzleDb.findMany("certificate", { where: { userId: { in: memberIds } } }),
						drizzleDb.findMany("estabelecimento", { where: { id: { in: estIds } } }),
					]);

					const progressCountByUser = new Map<string, number>();
					for (const p of progressos as any[]) {
						progressCountByUser.set(p.userId, (progressCountByUser.get(p.userId) || 0) + 1);
					}
					const certCountByUser = new Map<string, number>();
					for (const c of certificates as any[]) {
						certCountByUser.set(c.userId, (certCountByUser.get(c.userId) || 0) + 1);
					}
					const estById = new Map<string, any>();
					for (const e of estabelecimentos as any[]) {
						estById.set(e.id, e);
					}

					const result = members.map((m: any) => {
						const est = estById.get(m.estabelecimentoId);
						return {
							id: m.id,
							nome: m.nome,
							email: m.email,
							role: m.role,
							xp: m.xp,
							level: m.level,
							certCount: certCountByUser.get(m.id) || 0,
							progressCount: progressCountByUser.get(m.id) || 0,
							estabelecimento: est
								? {
										id: est.id,
										nome: est.nome,
										cidade: est.cidade,
										uf: est.uf,
									}
								: null,
						};
					});

					return reply.send(result);
				}

				// ADMIN sees all teams grouped by gestor
				const gestores = (await drizzleDb.findMany("user", {
					where: { role: "GESTOR" },
					orderBy: { nome: "asc" },
				})) as any[];

				const teams = await Promise.all(
					gestores.map(async (g: any) => {
						const atendentes = (await drizzleDb.findMany("user", {
							where: { gestorId: g.id },
						})) as any[];

						const atendenteIds = atendentes.map((a: any) => a.id);
						const estIds = atendentes.map((a: any) => a.estabelecimentoId).filter(Boolean);
						const [progressos, certificates, estabelecimentos] = await Promise.all([
							drizzleDb.findMany("progresso", { where: { userId: { in: atendenteIds } } }),
							drizzleDb.findMany("certificate", { where: { userId: { in: atendenteIds } } }),
							drizzleDb.findMany("estabelecimento", { where: { id: { in: estIds } } }),
						]);

						const progressCountByUser = new Map<string, number>();
						for (const p of progressos as any[]) {
							progressCountByUser.set(p.userId, (progressCountByUser.get(p.userId) || 0) + 1);
						}
						const certCountByUser = new Map<string, number>();
						for (const c of certificates as any[]) {
							certCountByUser.set(c.userId, (certCountByUser.get(c.userId) || 0) + 1);
						}
						const estById = new Map<string, any>();
						for (const e of estabelecimentos as any[]) {
							estById.set(e.id, e);
						}

						return {
							gestor: {
								id: g.id,
								nome: g.nome,
								email: g.email,
							},
							membros: atendentes.map((a: any) => {
								const est = estById.get(a.estabelecimentoId);
								return {
									id: a.id,
									nome: a.nome,
									email: a.email,
									role: a.role,
									xp: a.xp,
									level: a.level,
									certCount: certCountByUser.get(a.id) || 0,
									progressCount: progressCountByUser.get(a.id) || 0,
									estabelecimento: est
										? {
												id: est.id,
												nome: est.nome,
												cidade: est.cidade,
												uf: est.uf,
											}
										: null,
								};
							}),
							totalMembros: atendentes.length,
						};
					}),
				);

				return reply.send(teams);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar equipe" });
			}
		},
	);

	// GET /api/usuarios/equipe/detalhe
	fastify.get(
		"/equipe/detalhe",
		{ preHandler: [authenticate, authorize("ADMIN", "GESTOR")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const allUsersQuery =
					request.userRole === "GESTOR"
						? (drizzleDb.findMany("user", { where: { gestorId: request.userId } }) as Promise<any[]>)
						: (drizzleDb.findMany("user", { where: { role: "ATENDENTE" } }) as Promise<any[]>);

				// Fetch all required data in parallel
				const [allUsers, cursos, progressosAll, quizResponsesAll, certificatesAll, notificationsAll, aulasAll, quizzesAll, perguntasAll, estabelecimentosAll] =
					await Promise.all([
						allUsersQuery,
						drizzleDb.findMany("curso", { orderBy: { ordem: "asc" } }) as Promise<any[]>,
						drizzleDb.findMany("progresso", { where: { concluido: true } }) as Promise<any[]>,
						drizzleDb.findMany("quizResponse", {}) as Promise<any[]>,
						drizzleDb.findMany("certificate", {}) as Promise<any[]>,
						drizzleDb.findMany("notification", { where: { titulo: "Curso Completo" } }) as Promise<any[]>,
						drizzleDb.findMany("aula") as Promise<any[]>,
						drizzleDb.findMany("quiz") as Promise<any[]>,
						drizzleDb.findMany("quizPergunta") as Promise<any[]>,
						drizzleDb.findMany("estabelecimento") as Promise<any[]>,
					]);

				const userIds = new Set(allUsers.map((u) => u.id));

				// Build lookup maps by userId for O(1) access
				const progressosByUser = new Map<string, any[]>();
				for (const p of progressosAll) {
					if (!userIds.has(p.userId)) continue;
					const arr = progressosByUser.get(p.userId) || [];
					arr.push(p);
					progressosByUser.set(p.userId, arr);
				}

				const quizResponsesByUser = new Map<string, Map<string, any>>();
				for (const qr of quizResponsesAll) {
					if (!userIds.has(qr.userId)) continue;
					const map = quizResponsesByUser.get(qr.userId) || new Map<string, any>();
					map.set(qr.quizId, qr);
					quizResponsesByUser.set(qr.userId, map);
				}

				const certificatesByUser = new Map<string, Map<string, any>>();
				for (const c of certificatesAll) {
					if (!userIds.has(c.userId)) continue;
					const map = certificatesByUser.get(c.userId) || new Map<string, any>();
					map.set(c.cursoId, c);
					certificatesByUser.set(c.userId, map);
				}

				const notificationsByUser = new Map<string, any[]>();
				for (const n of notificationsAll) {
					if (!userIds.has(n.fromId)) continue;
					const arr = notificationsByUser.get(n.fromId) || [];
					arr.push(n);
					notificationsByUser.set(n.fromId, arr);
				}

				// Build lookup maps for aula quizzes and estabelecimentos
				const estById = new Map<string, any>();
				for (const e of estabelecimentosAll) {
					estById.set(e.id, e);
				}

				const quizByAulaId = new Map<string, any>();
				for (const q of quizzesAll) {
					quizByAulaId.set(q.aulaId, q);
				}

				const perguntasByQuizId = new Map<string, any[]>();
				for (const p of perguntasAll) {
					const arr = perguntasByQuizId.get(p.quizId) || [];
					arr.push(p);
					perguntasByQuizId.set(p.quizId, arr);
				}

				// Group aulas by cursoId and merge quiz/perguntas in JS
				const aulasByModulo = new Map<string, any[]>();
				for (const a of aulasAll) {
					const quiz = quizByAulaId.get(a.id);
					if (quiz) {
						a.quiz = { ...quiz, perguntas: perguntasByQuizId.get(quiz.id) || [] };
					}
					const arr = aulasByModulo.get(a.cursoId) || [];
					arr.push(a);
					aulasByModulo.set(a.cursoId, arr);
				}

				const result = allUsers.map((m: any) => {
					const progressos = progressosByUser.get(m.id) || [];
					const quizResponseMap = quizResponsesByUser.get(m.id) || new Map<string, any>();
					const certMap = certificatesByUser.get(m.id) || new Map<string, any>();
					const notifications = notificationsByUser.get(m.id) || [];

					const cursosProcessed = cursos.map((mod: any) => {
						const aulas = aulasByModulo.get(mod.id) || [];
						const aulaIds = aulas.map((a: any) => a.id);
						const concluidas = progressos.filter((p: any) => aulaIds.includes(p.aulaId)).length;

						const aulasDetail = aulas.map((aula: any) => {
							const quizResult = aula.quiz ? quizResponseMap.get(aula.quiz.id) : null;
							return {
								id: aula.id,
								titulo: aula.titulo,
								tipo: aula.tipo,
								concluido: progressos.some((p: any) => p.aulaId === aula.id),
								quiz: aula.quiz
									? {
											id: aula.quiz.id,
											titulo: aula.quiz.titulo,
											notaMinima: aula.quiz.notaMinima,
											autoGerarCertificado: aula.quiz.autoGerarCertificado,
											totalPerguntas: aula.quiz.perguntas?.length || 0,
										}
									: null,
								quizResultado: quizResult
									? {
											nota: quizResult.nota,
											total: quizResult.total,
											concluido: quizResult.concluido,
											respostas: quizResult.respostas || null,
											createdAt: quizResult.createdAt,
										}
									: null,
							};
						});

						const quizzesAprovados = aulasDetail.filter((a: any) => a.quizResultado?.concluido).length;
						const quizzesTotal = aulasDetail.filter((a: any) => a.quiz).length;
						const allAulasCompleted = concluidas === aulas.length && aulas.length > 0;
						const allQuizzesPassed = quizzesTotal > 0 && quizzesAprovados === quizzesTotal;

						const cert = certMap.get(mod.id);
						const certExpected = mod.autoCertificado && allAulasCompleted && allQuizzesPassed;
						const certStatus = cert?.status || null;

						const hasCompletionNotif = notifications.some((n: any) => n.mensagem?.includes(mod.titulo));

						const autoProcessStatus = {
							certExpected: !!certExpected,
							certGenerated: !!cert,
							certStatus,
							notificationSent: hasCompletionNotif,
							issues: [] as string[],
						};

						if (certExpected && !cert) {
							autoProcessStatus.issues.push("Certificado esperado mas nao gerado");
						}
						if (allAulasCompleted && allQuizzesPassed && !hasCompletionNotif) {
							autoProcessStatus.issues.push("Curso completo mas notificacao nao enviada ao gestor");
						}

						return {
							id: mod.id,
							titulo: mod.titulo,
							totalAulas: aulas.length,
							aulasConcluidas: concluidas,
							quizzesAprovados,
							quizzesTotal,
							allAulasCompleted,
							allQuizzesPassed,
							autoProcessStatus,
							aulas: aulasDetail,
						};
					});

					const est = estById.get(m.estabelecimentoId);
					return {
						id: m.id,
						nome: m.nome,
						email: m.email,
						role: m.role,
						xp: m.xp,
						lastLogin: m.lastLogin,
						gestorId: m.gestorId,
						estabelecimento: est
							? {
									id: est.id,
									nome: est.nome,
									cidade: est.cidade,
									uf: est.uf,
								}
							: null,
						cursos: cursosProcessed,
					};
				});

				return reply.send(result);
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar detalhe da equipe" });
			}
		},
	);

	// GET /api/usuarios/equipe/stats
	fastify.get(
		"/equipe/stats",
		{ preHandler: [authenticate, authorize("ADMIN")] },
		async (_request: FastifyRequest, reply: FastifyReply) => {
			try {
				const totalGestores = await drizzleDb.count("user", { role: "GESTOR" });
				const totalAtendentes = await drizzleDb.count("user", { role: "ATENDENTE" });
				const totalAtendentesComGestor = await drizzleDb.count("user", { role: "ATENDENTE", gestorId: { $ne: null } });
				const totalAtendentesSemGestor = totalAtendentes - totalAtendentesComGestor;

				return reply.send({
					totalGestores,
					totalAtendentes,
					totalAtendentesComGestor,
					totalAtendentesSemGestor,
				});
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao buscar estatisticas" });
			}
		},
	);

	// POST /api/usuarios/:id/validate-account
	fastify.post(
		"/:id/validate-account",
		{ preHandler: [authenticate, authorize("ADMIN", "GESTOR")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const id = getStringParam((request.params as any).id);
				if (!id) return reply.code(400).send({ error: "ID invalido" });

				const user = (await drizzleDb.findUnique("user", { id })) as any;
				if (!user) return reply.code(404).send({ error: "Usuario nao encontrado" });

				if (request.userRole === "GESTOR" && user.gestorId !== request.userId) {
					return reply.code(403).send({ error: "Voce so pode validar atendentes da sua equipe" });
				}

				// Skip if already verified — no duplicate XP
				if (user.emailVerificado) {
					return reply.send({ message: "Conta já validada anteriormente" });
				}

				await drizzleDb.update(
					"user",
					{ id },
					{
						emailVerificado: true,
						tokenVerificacao: null,
						tokenExpiry: null,
					},
				);

				await logActivity(request.userId!, "Validar Conta", `Validou conta de: ${user.nome}`);
				await awardPointsIfNotAwarded(request.userId!, "LESSON_COMPLETE", `VALIDATE_ACCOUNT:${id}`);

				return reply.send({ message: "Conta validada com sucesso!" });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao validar conta" });
			}
		},
	);

	// POST /api/usuarios/:id/resend-verification
	fastify.post(
		"/:id/resend-verification",
		{ preHandler: [authenticate, authorize("ADMIN", "GESTOR")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const id = getStringParam((request.params as any).id);
				if (!id) return reply.code(400).send({ error: "ID invalido" });

				const user = (await drizzleDb.findUnique("user", { id })) as any;
				if (!user) return reply.code(404).send({ error: "Usuario nao encontrado" });

				if (request.userRole === "GESTOR" && user.gestorId !== request.userId) {
					return reply.code(403).send({ error: "Voce so pode reenviar para atendentes da sua equipe" });
				}

				if (user.emailVerificado) {
					return reply.code(400).send({ error: "Email ja verificado" });
				}

				const verificationToken = crypto.randomBytes(32).toString("hex");
				const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

				await drizzleDb.update("user", { id }, { tokenVerificacao: verificationToken, tokenExpiry });

				const emailResult = await sendVerificationEmail(user.email, user.nome, verificationToken);
				await logActivity(
					request.userId!,
					"Reenviar Verificacao",
					`Reenviou verificacao para: ${user.nome} | email: ${emailResult.success ? "OK" : emailResult.error}`,
				);

				return reply.send({ message: "Email de verificacao reenviado!" });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao reenviar verificacao" });
			}
		},
	);

	// POST /api/usuarios/:userId/auto-approve
	fastify.post(
		"/:userId/auto-approve",
		{ preHandler: [authenticate, authorize("ADMIN", "GESTOR")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const userId = getStringParam((request.params as any).userId)!;
				const { tipo, targetId } = request.body as any;

				const targetUser = (await drizzleDb.findUnique("user", { id: userId })) as any;
				if (!targetUser) return reply.code(404).send({ error: "Usuario nao encontrado" });

				if (request.userRole === "GESTOR" && targetUser.gestorId !== request.userId) {
					return reply.code(403).send({ error: "Voce so pode gerenciar atendentes da sua equipe" });
				}

				if (tipo === "quiz" && targetId) {
					const quizRow = (await drizzleDb.findUnique("quiz", { id: targetId })) as any;
					if (!quizRow) return reply.code(404).send({ error: "Quiz nao encontrado" });
					const [perguntas, aula] = await Promise.all([
						drizzleDb.findMany("quizPergunta", { where: { quizId: targetId } }) as Promise<any[]>,
						drizzleDb.findUnique("aula", { id: quizRow.aulaId }) as Promise<any>,
					]);
					const quiz = { ...quizRow, perguntas, aula };

					const { nota, total } = passedQuizResult(quiz);

					await drizzleDb.upsert(
						"quizResponse",
						{ quizId: targetId, userId },
						{ quizId: targetId, userId, nota, total, concluido: true, respostas: {} },
						{ nota, total, concluido: true, respostas: {} },
					);

					await drizzleDb.upsert(
						"progresso",
						{ cursoId: quiz.aula.cursoId, aulaId: quiz.aulaId, userId },
						{ cursoId: quiz.aula.cursoId, aulaId: quiz.aulaId, userId, concluido: true },
						{ concluido: true },
					);

					await logActivity(request.userId!, "Auto-Aprovar Quiz", `Aprovou quiz "${quiz.titulo}" para ${targetUser.nome}`);
					return reply.send({ message: "Quiz aprovado com sucesso" });
				}

				if (tipo === "aula" && targetId) {
					const aula = (await drizzleDb.findUnique("aula", { id: targetId })) as any;
					if (!aula) return reply.code(404).send({ error: "Aula nao encontrada" });

					await drizzleDb.upsert(
						"progresso",
						{ cursoId: aula.cursoId, aulaId: targetId, userId },
						{ cursoId: aula.cursoId, aulaId: targetId, userId, concluido: true },
						{ concluido: true },
					);

					if (aula.quizId) {
						const quizRow = (await drizzleDb.findUnique("quiz", { id: aula.quizId })) as any;
						if (quizRow) {
							const perguntas = (await drizzleDb.findMany("quizPergunta", { where: { quizId: aula.quizId } })) as any[];
							const quiz = { ...quizRow, perguntas };
							const { nota, total } = passedQuizResult(quiz);
							await drizzleDb.upsert(
								"quizResponse",
								{ quizId: aula.quizId, userId },
								{ quizId: aula.quizId, userId, nota, total, concluido: true, respostas: {} },
								{ nota, total, concluido: true, respostas: {} },
							);
						}
					}

					await logActivity(request.userId!, "Auto-Aprovar Aula", `Aprovou aula "${aula.titulo}" para ${targetUser.nome}`);
					return reply.send({ message: "Aula aprovada com sucesso" });
				}

				if (tipo === "curso" && targetId) {
					const cursoRow = (await drizzleDb.findUnique("curso", { id: targetId })) as any;
					if (!cursoRow) return reply.code(404).send({ error: "Curso nao encontrado" });

					const aulas = (await drizzleDb.findMany("aula", { where: { cursoId: targetId } })) as any[];
					const aulaIds = aulas.map((a: any) => a.id);
					const quizzes = (await drizzleDb.findMany("quiz", { where: { aulaId: { in: aulaIds } } })) as any[];
					const quizIds = quizzes.map((q: any) => q.id);
					const perguntas = (await drizzleDb.findMany("quizPergunta", { where: { quizId: { in: quizIds } } })) as any[];

					const perguntasByQuizId = new Map<string, any[]>();
					for (const p of perguntas) {
						const arr = perguntasByQuizId.get(p.quizId) || [];
						arr.push(p);
						perguntasByQuizId.set(p.quizId, arr);
					}
					const quizByAulaId = new Map<string, any>();
					for (const q of quizzes) {
						quizByAulaId.set(q.aulaId, { ...q, perguntas: perguntasByQuizId.get(q.id) || [] });
					}
					for (const aula of aulas) {
						aula.quiz = quizByAulaId.get(aula.id) || null;
					}
					const curso = { ...cursoRow, aulas };

					for (const aula of curso.aulas) {
						await drizzleDb.upsert(
							"progresso",
							{ cursoId: targetId, aulaId: aula.id, userId },
							{ cursoId: targetId, aulaId: aula.id, userId, concluido: true },
							{ concluido: true },
						);

						if (aula.quiz) {
							const { nota, total } = passedQuizResult(aula.quiz);
							await drizzleDb.upsert(
								"quizResponse",
								{ quizId: aula.quiz.id, userId },
								{ quizId: aula.quiz.id, userId, nota, total, concluido: true, respostas: {} },
								{ nota, total, concluido: true, respostas: {} },
							);
						}
					}

					if (curso.autoCertificado) {
						const existing = (await drizzleDb.findFirst("certificate", { userId, cursoId: targetId })) as any;
						if (!existing) {
							await drizzleDb.create("certificate", {
								userId,
								cursoId: targetId,
								status: "APPROVED",
							});
						}
					}

					await logActivity(
						request.userId!,
						"Auto-Aprovar Curso",
						`Aprovou curso "${curso.titulo}" completo para ${targetUser.nome}`,
					);
					return reply.send({ message: "Curso completo aprovado com sucesso" });
				}

				return reply.code(400).send({ error: "Tipo invalido. Use: quiz, aula, ou curso" });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao auto-aprovar" });
			}
		},
	);

	// POST /api/usuarios/:userId/fix-cert
	fastify.post(
		"/:userId/fix-cert",
		{ preHandler: [authenticate, authorize("ADMIN", "GESTOR")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const userId = getStringParam((request.params as any).userId)!;
				const { cursoId } = request.body as { cursoId: string };

				const targetUser = (await drizzleDb.findUnique("user", { id: userId })) as any;
				if (!targetUser) return reply.code(404).send({ error: "Usuario nao encontrado" });
				if (request.userRole === "GESTOR" && targetUser.gestorId !== request.userId) {
					return reply.code(403).send({ error: "Voce so pode gerenciar atendentes da sua equipe" });
				}

				const curso = (await drizzleDb.findUnique("curso", { id: cursoId })) as any;
				if (!curso) return reply.code(404).send({ error: "Curso nao encontrado" });

				const existing = (await drizzleDb.findFirst("certificate", { userId, cursoId })) as any;
				if (existing) {
					if (existing.status !== "APPROVED") {
						await drizzleDb.update("certificate", { id: existing.id }, { status: "APPROVED" });
					}
					await logActivity(
						request.userId!,
						"Fix Certificado",
						`Corrigiu certificado do curso "${curso.titulo}" para ${targetUser.nome} (era ${existing.status}, agora APPROVED)`,
					);
					return reply.send({ message: "Certificado corrigido para APPROVED" });
				}

				await drizzleDb.create("certificate", { userId, cursoId, status: "APPROVED" });
				await awardPointsIfNotAwarded(userId, "CERTIFICATE", `CERTIFICATE:curso:${cursoId}`);
				await logActivity(
					request.userId!,
					"Fix Certificado",
					`Gerou certificado manualmente do curso "${curso.titulo}" para ${targetUser.nome}`,
				);
				return reply.send({ message: "Certificado gerado com sucesso" });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao corrigir certificado" });
			}
		},
	);

	// POST /api/usuarios/:userId/fix-notify
	fastify.post(
		"/:userId/fix-notify",
		{ preHandler: [authenticate, authorize("ADMIN", "GESTOR")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const userId = getStringParam((request.params as any).userId)!;
				const { titulo, mensagem } = request.body as any;

				const targetUser = (await drizzleDb.findUnique("user", { id: userId })) as any;
				if (!targetUser) return reply.code(404).send({ error: "Usuario nao encontrado" });
				if (request.userRole === "GESTOR" && targetUser.gestorId !== request.userId) {
					return reply.code(403).send({ error: "Voce so pode gerenciar atendentes da sua equipe" });
				}

				const gestorId = targetUser.gestorId;
				if (!gestorId) return reply.code(400).send({ error: "Usuario nao tem gestor associado" });

				const notif = await drizzleDb.create("notification", {
					fromId: userId,
					toId: gestorId,
					titulo: titulo || "Atualizacao de progresso",
					mensagem: mensagem || `Atualizacao manual sobre o progresso de ${targetUser.nome}`,
				});

				await logActivity(
					request.userId!,
					"Fix Notificacao",
					`Reenviou notificacao para gestor sobre ${targetUser.nome}: ${titulo || "Atualizacao de progresso"}`,
				);
				return reply.send({ message: "Notificacao enviada com sucesso", notif });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao enviar notificacao" });
			}
		},
	);

	// POST /api/usuarios/:userId/fix-progress
	fastify.post(
		"/:userId/fix-progress",
		{ preHandler: [authenticate, authorize("ADMIN", "GESTOR")] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				const userId = getStringParam((request.params as any).userId)!;
				const { aulaId, cursoId } = request.body as any;

				const targetUser = (await drizzleDb.findUnique("user", { id: userId })) as any;
				if (!targetUser) return reply.code(404).send({ error: "Usuario nao encontrado" });
				if (request.userRole === "GESTOR" && targetUser.gestorId !== request.userId) {
					return reply.code(403).send({ error: "Voce so pode gerenciar atendentes da sua equipe" });
				}

				await drizzleDb.upsert(
					"progresso",
					{ cursoId, aulaId, userId },
					{ cursoId, aulaId, userId, concluido: true },
					{ concluido: true },
				);

				await logActivity(request.userId!, "Fix Progresso", `Marcou aula como concluida para ${targetUser.nome}`);
				return reply.send({ message: "Progresso corrigido com sucesso" });
			} catch (error) {
				logger.error("[ROUTE ERROR]", error);
				return reply.code(500).send({ error: "Erro ao corrigir progresso" });
			}
		},
	);

	done();
};

export default usuariosRoutes;
