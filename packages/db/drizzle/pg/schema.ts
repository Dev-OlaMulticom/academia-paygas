import { boolean, index, integer, jsonb, pgEnum, pgTable, real, text, timestamp, unique, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("Role", [
	"ADMIN",
	"GESTOR",
	"ATENDENTE",
	"PARCEIRO_ACREDITADO",
	"ERPS_REPRESENTANTE",
]);

export const certificateStatusEnum = pgEnum("CertificateStatus", ["PENDING", "APPROVED", "ISSUED"]);

export const aulaTipoEnum = pgEnum("AulaTipo", ["VIDEO", "PDF", "TEXTO"]);

export const pointsActionEnum = pgEnum("PointsAction", [
	"LOGIN",
	"MODULE_OPEN",
	"LESSON_VIEW",
	"LESSON_COMPLETE",
	"MODULE_COMPLETE",
	"QUIZ_CORRECT",
	"QUIZ_PASS",
	"CERTIFICATE",
]);

export const user = pgTable(
	"User",
	{
		id: text("id").primaryKey(),
		email: text("email").notNull().unique(),
		nome: text("nome").notNull(),
		senha: text("senha").notNull(),
		role: roleEnum("role").notNull(),
		xp: real("xp").notNull().default(0),
		level: integer("level").notNull().default(1),
		avatarUrl: text("avatarUrl"),
		state: text("state"),
		emailVerificado: boolean("emailVerificado").notNull().default(false),
		tokenVerificacao: text("tokenVerificacao"),
		tokenExpiry: timestamp("tokenExpiry", { mode: "date" }),
		tokenRecuperacao: text("tokenRecuperacao"),
		tokenRecuperacaoExpiry: timestamp("tokenRecuperacaoExpiry", { mode: "date" }),
		gestorId: text("gestorId"),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
		lastLogin: timestamp("lastLogin", { mode: "date" }),
		paygasSub: text("paygasSub").unique(),
		telefone: text("telefone"),
		cpf: text("cpf"),
		perfil: text("perfil"),
		marketplaceId: text("marketplaceId"),
		estabelecimentoId: text("estabelecimentoId"),
	},
	(table) => [index("User_gestorId_idx").on(table.gestorId), index("User_estabelecimentoId_idx").on(table.estabelecimentoId)],
);

export const estabelecimento = pgTable("Estabelecimento", {
	id: text("id").primaryKey(),
	nome: text("nome").notNull(),
	cnpj: text("cnpj"),
	tipo: text("tipo"),
	cidade: text("cidade"),
	uf: text("uf"),
	ativo: boolean("ativo").notNull().default(true),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
});

export const curso = pgTable(
	"Curso",
	{
		id: text("id").primaryKey(),
		titulo: text("titulo").notNull(),
		descricao: text("descricao").notNull(),
		ordem: integer("ordem").notNull(),
		icone: text("icone"),
		videoUrl: text("videoUrl"),
		videoInicio: integer("videoInicio"),
		videoFim: integer("videoFim"),
		obrigatorio: boolean("obrigatorio").notNull().default(false),
		autoCertificado: boolean("autoCertificado").notNull().default(false),
		certificadoTemplate: text("certificadoTemplate"),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
		rolesPermitidos: jsonb("rolesPermitidos"),
	},
	(table) => [uniqueIndex("Modulo_pkey").on(table.id)],
);

export const aula = pgTable(
	"Aula",
	{
		id: text("id").primaryKey(),
		cursoId: text("cursoId").notNull(),
		titulo: text("titulo").notNull(),
		descricao: text("descricao").notNull(),
		ordem: integer("ordem").notNull(),
		tipo: aulaTipoEnum("tipo").notNull().default("VIDEO"),
		videoUrl: text("videoUrl"),
		pdfUrl: text("pdfUrl"),
		videoInicio: integer("videoInicio"),
		videoFim: integer("videoFim"),
		duracaoMin: integer("duracaoMin"),
		obrigatorio: boolean("obrigatorio").notNull().default(false),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
		ancoragemPoints: jsonb("ancoragemPoints"),
		rolesPermitidos: jsonb("rolesPermitidos"),
	},
	(table) => [index("Aula_cursoId_idx").on(table.cursoId)],
);

export const licao = pgTable(
	"Licao",
	{
		id: text("id").primaryKey(),
		aulaId: text("aulaId").notNull(),
		titulo: text("titulo").notNull(),
		conteudo: text("conteudo"),
		tipo: aulaTipoEnum("tipo").notNull().default("TEXTO"),
		ordem: integer("ordem").notNull(),
		duracaoMin: integer("duracaoMin"),
		inicioSeg: integer("inicioSeg"),
		fimSeg: integer("fimSeg"),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
	},
	(table) => [index("Licao_aulaId_idx").on(table.aulaId)],
);

export const quiz = pgTable(
	"Quiz",
	{
		id: text("id").primaryKey(),
		aulaId: text("aulaId").notNull().unique(),
		titulo: text("titulo").notNull(),
		notaMinima: integer("notaMinima").notNull().default(7),
		autoGerarCertificado: boolean("autoGerarCertificado").notNull().default(false),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
		rolesPermitidos: jsonb("rolesPermitidos"),
	},
	(table) => [index("Quiz_aulaId_idx").on(table.aulaId)],
);

export const quizPergunta = pgTable(
	"QuizPergunta",
	{
		id: text("id").primaryKey(),
		quizId: text("quizId").notNull(),
		pergunta: text("pergunta").notNull(),
		opcaoA: text("opcaoA").notNull(),
		opcaoB: text("opcaoB").notNull(),
		opcaoC: text("opcaoC"),
		opcaoD: text("opcaoD"),
		correta: text("correta").notNull(),
		ordem: integer("ordem").notNull(),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
	},
	(table) => [index("QuizPergunta_quizId_idx").on(table.quizId)],
);

export const quizResponse = pgTable(
	"QuizResponse",
	{
		id: text("id").primaryKey(),
		quizId: text("quizId").notNull(),
		userId: text("userId").notNull(),
		nota: integer("nota").notNull(),
		total: integer("total").notNull(),
		concluido: boolean("concluido").notNull().default(false),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
		respostas: jsonb("respostas"),
	},
	(table) => [
		unique("QuizResponse_quizId_userId_key").on(table.quizId, table.userId),
		index("QuizResponse_quizId_idx").on(table.quizId),
		index("QuizResponse_userId_idx").on(table.userId),
	],
);

export const progresso = pgTable(
	"Progresso",
	{
		id: text("id").primaryKey(),
		cursoId: text("cursoId").notNull(),
		aulaId: text("aulaId").notNull(),
		userId: text("userId").notNull(),
		concluido: boolean("concluido").notNull().default(false),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
		reiniciado: boolean("reiniciado").notNull().default(false),
		restartCount: integer("restartCount").notNull().default(0),
	},
	(table) => [
		unique("Progresso_moduloId_aulaId_userId_key").on(table.cursoId, table.aulaId, table.userId),
		index("Progresso_aulaId_idx").on(table.aulaId),
		index("Progresso_userId_idx").on(table.userId),
		index("Progresso_moduloId_idx").on(table.cursoId),
	],
);

export const certificate = pgTable(
	"Certificate",
	{
		id: text("id").primaryKey(),
		userId: text("userId").notNull(),
		cursoId: text("cursoId").notNull(),
		status: certificateStatusEnum("status").notNull().default("PENDING"),
		pdfUrl: text("pdfUrl"),
		htmlContent: text("htmlContent"),
		aprovadoPor: text("aprovadoPor"),
		aprovadoEm: timestamp("aprovadoEm", { mode: "date" }),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
	},
	(table) => [
		unique("Certificate_userId_cursoId_key").on(table.userId, table.cursoId),
		index("Certificate_userId_idx").on(table.userId),
		index("Certificate_cursoId_idx").on(table.cursoId),
	],
);

export const notification = pgTable(
	"Notification",
	{
		id: text("id").primaryKey(),
		fromId: text("fromId").notNull(),
		toId: text("toId").notNull(),
		titulo: text("titulo").notNull(),
		mensagem: text("mensagem").notNull(),
		lida: boolean("lida").notNull().default(false),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		data: jsonb("data"),
	},
	(table) => [index("Notification_fromId_idx").on(table.fromId), index("Notification_toId_idx").on(table.toId)],
);

export const activityLog = pgTable(
	"ActivityLog",
	{
		id: text("id").primaryKey(),
		userId: text("userId").notNull(),
		acao: text("acao").notNull(),
		detalhes: text("detalhes"),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	},
	(table) => [index("ActivityLog_userId_idx").on(table.userId), index("ActivityLog_createdAt_idx").on(table.createdAt)],
);

export const pointsTransaction = pgTable(
	"PointsTransaction",
	{
		id: text("id").primaryKey(),
		userId: text("userId").notNull(),
		action: pointsActionEnum("action").notNull(),
		points: real("points").notNull(),
		details: text("details"),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	},
	(table) => [index("PointsTransaction_userId_idx").on(table.userId), index("PointsTransaction_createdAt_idx").on(table.createdAt), index("PointsTransaction_action_idx").on(table.action)],
);

export const forumPost = pgTable(
	"ForumPost",
	{
		id: text("id").primaryKey(),
		titulo: text("titulo").notNull(),
		conteudo: text("conteudo").notNull(),
		tags: text("tags"),
		likes: integer("likes").notNull().default(0),
		replies: integer("replies").notNull().default(0),
		autorId: text("autorId").notNull(),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
	},
	(table) => [index("ForumPost_autorId_idx").on(table.autorId)],
);

export const moduleConfig = pgTable("ModuleConfig", {
	id: text("id").primaryKey(),
	key: text("key").notNull().unique(),
	label: text("label").notNull(),
	enabled: boolean("enabled").notNull().default(true),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
});

export const xpConfig = pgTable("XPConfig", {
	id: text("id").primaryKey(),
	action: text("action").notNull().unique(),
	label: text("label").notNull(),
	points: real("points").notNull().default(0),
	description: text("description"),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
});

export const roleConfig = pgTable("RoleConfig", {
	id: text("id").primaryKey(),
	role: text("role").notNull().unique(),
	label: text("label").notNull(),
	description: text("description"),
	ativo: boolean("ativo").notNull().default(true),
	ordem: integer("ordem").notNull().default(0),
	permissions: jsonb("permissions").notNull(),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
});

export const conquista = pgTable(
	"Conquista",
	{
		id: text("id").primaryKey(),
		titulo: text("titulo").notNull(),
		descricao: text("descricao").notNull(),
		icone: text("icone").notNull().default("🏆"),
		cor: text("cor").notNull().default("#F47C20"),
		pontosMinimos: integer("pontosMinimos").notNull().default(0),
		xpRecompensa: integer("xpRecompensa").notNull().default(0),
		ativo: boolean("ativo").notNull().default(true),
		ordem: integer("ordem").notNull().default(0),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
	},
	(table) => [index("Conquista_ativo_idx").on(table.ativo), index("Conquista_pontosMinimos_idx").on(table.pontosMinimos)],
);

export const userConquista = pgTable(
	"UserConquista",
	{
		id: text("id").primaryKey(),
		userId: text("userId").notNull(),
		conquistaId: text("conquistaId").notNull(),
		dataConquista: timestamp("dataConquista", { mode: "date" }).notNull().defaultNow(),
	},
	(table) => [
		unique("UserConquista_userId_conquistaId_key").on(table.userId, table.conquistaId),
		index("UserConquista_userId_idx").on(table.userId),
		index("UserConquista_conquistaId_idx").on(table.conquistaId),
	],
);

export const userRelations = relations(user, ({ one, many }) => ({
	gestor: one(user, { fields: [user.gestorId], references: [user.id] }),
	atendentes: many(user),
	estabelecimento: one(estabelecimento, { fields: [user.estabelecimentoId], references: [estabelecimento.id] }),
	activityLogs: many(activityLog),
	certificates: many(certificate),
	forumPosts: many(forumPost),
	sentNotifications: many(notification, { relationName: "SentNotifications" }),
	receivedNotifications: many(notification, { relationName: "ReceivedNotifications" }),
	pointsTransactions: many(pointsTransaction),
	progressos: many(progresso),
	quizResponses: many(quizResponse),
	conquistas: many(userConquista),
}));

export const estabelecimentoRelations = relations(estabelecimento, ({ many }) => ({
	users: many(user),
}));

export const cursoRelations = relations(curso, ({ many }) => ({
	aulas: many(aula),
	certificates: many(certificate),
	progressos: many(progresso),
}));

export const aulaRelations = relations(aula, ({ one, many }) => ({
	curso: one(curso, { fields: [aula.cursoId], references: [curso.id] }),
	licoes: many(licao),
	progressos: many(progresso),
	quiz: one(quiz),
}));

export const licaoRelations = relations(licao, ({ one }) => ({
	aula: one(aula, { fields: [licao.aulaId], references: [aula.id] }),
}));

export const quizRelations = relations(quiz, ({ one, many }) => ({
	aula: one(aula, { fields: [quiz.aulaId], references: [aula.id] }),
	perguntas: many(quizPergunta),
	responses: many(quizResponse),
}));

export const quizPerguntaRelations = relations(quizPergunta, ({ one }) => ({
	quiz: one(quiz, { fields: [quizPergunta.quizId], references: [quiz.id] }),
}));

export const quizResponseRelations = relations(quizResponse, ({ one }) => ({
	quiz: one(quiz, { fields: [quizResponse.quizId], references: [quiz.id] }),
	user: one(user, { fields: [quizResponse.userId], references: [user.id] }),
}));

export const progressoRelations = relations(progresso, ({ one }) => ({
	aula: one(aula, { fields: [progresso.aulaId], references: [aula.id] }),
	curso: one(curso, { fields: [progresso.cursoId], references: [curso.id] }),
	user: one(user, { fields: [progresso.userId], references: [user.id] }),
}));

export const certificateRelations = relations(certificate, ({ one }) => ({
	curso: one(curso, { fields: [certificate.cursoId], references: [curso.id] }),
	user: one(user, { fields: [certificate.userId], references: [user.id] }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
	from: one(user, { relationName: "SentNotifications", fields: [notification.fromId], references: [user.id] }),
	to: one(user, { relationName: "ReceivedNotifications", fields: [notification.toId], references: [user.id] }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
	user: one(user, { fields: [activityLog.userId], references: [user.id] }),
}));

export const pointsTransactionRelations = relations(pointsTransaction, ({ one }) => ({
	user: one(user, { fields: [pointsTransaction.userId], references: [user.id] }),
}));

export const forumPostRelations = relations(forumPost, ({ one }) => ({
	autor: one(user, { fields: [forumPost.autorId], references: [user.id] }),
}));

export const conquistaRelations = relations(conquista, ({ many }) => ({
	conquistas: many(userConquista),
}));

export const userConquistaRelations = relations(userConquista, ({ one }) => ({
	conquista: one(conquista, { fields: [userConquista.conquistaId], references: [conquista.id] }),
	user: one(user, { fields: [userConquista.userId], references: [user.id] }),
}));
