CREATE TYPE "public"."AulaTipo" AS ENUM('VIDEO', 'PDF', 'TEXTO');--> statement-breakpoint
CREATE TYPE "public"."CertificateStatus" AS ENUM('PENDING', 'APPROVED', 'ISSUED');--> statement-breakpoint
CREATE TYPE "public"."PointsAction" AS ENUM('LOGIN', 'MODULE_OPEN', 'LESSON_VIEW', 'LESSON_COMPLETE', 'MODULE_COMPLETE', 'QUIZ_CORRECT', 'QUIZ_PASS', 'CERTIFICATE');--> statement-breakpoint
CREATE TABLE "ActivityLog" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"acao" text NOT NULL,
	"detalhes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Aula" (
	"id" text PRIMARY KEY NOT NULL,
	"cursoId" text NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text NOT NULL,
	"ordem" integer NOT NULL,
	"tipo" "AulaTipo" DEFAULT 'VIDEO' NOT NULL,
	"videoUrl" text,
	"pdfUrl" text,
	"videoInicio" integer,
	"videoFim" integer,
	"duracaoMin" integer,
	"obrigatorio" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ancoragemPoints" jsonb,
	"rolesPermitidos" jsonb
);
--> statement-breakpoint
CREATE TABLE "Certificate" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"cursoId" text NOT NULL,
	"status" "CertificateStatus" DEFAULT 'PENDING' NOT NULL,
	"pdfUrl" text,
	"htmlContent" text,
	"aprovadoPor" text,
	"aprovadoEm" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "Certificate_userId_cursoId_key" UNIQUE("userId","cursoId")
);
--> statement-breakpoint
CREATE TABLE "Conquista" (
	"id" text PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text NOT NULL,
	"icone" text DEFAULT '🏆' NOT NULL,
	"cor" text DEFAULT '#F47C20' NOT NULL,
	"pontosMinimos" integer DEFAULT 0 NOT NULL,
	"xpRecompensa" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Curso" (
	"id" text PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text NOT NULL,
	"ordem" integer NOT NULL,
	"icone" text,
	"videoUrl" text,
	"videoInicio" integer,
	"videoFim" integer,
	"obrigatorio" boolean DEFAULT false NOT NULL,
	"autoCertificado" boolean DEFAULT false NOT NULL,
	"certificadoTemplate" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"rolesPermitidos" jsonb
);
--> statement-breakpoint
CREATE TABLE "ForumPost" (
	"id" text PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"conteudo" text NOT NULL,
	"tags" text,
	"likes" integer DEFAULT 0 NOT NULL,
	"replies" integer DEFAULT 0 NOT NULL,
	"autorId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Licao" (
	"id" text PRIMARY KEY NOT NULL,
	"aulaId" text NOT NULL,
	"titulo" text NOT NULL,
	"conteudo" text,
	"tipo" "AulaTipo" DEFAULT 'TEXTO' NOT NULL,
	"ordem" integer NOT NULL,
	"duracaoMin" integer,
	"inicioSeg" integer,
	"fimSeg" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ModuleConfig" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "ModuleConfig_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "Notification" (
	"id" text PRIMARY KEY NOT NULL,
	"fromId" text NOT NULL,
	"toId" text NOT NULL,
	"titulo" text NOT NULL,
	"mensagem" text NOT NULL,
	"lida" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE "PointsTransaction" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"action" "PointsAction" NOT NULL,
	"points" real NOT NULL,
	"details" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Progresso" (
	"id" text PRIMARY KEY NOT NULL,
	"cursoId" text NOT NULL,
	"aulaId" text NOT NULL,
	"userId" text NOT NULL,
	"concluido" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"reiniciado" boolean DEFAULT false NOT NULL,
	"restartCount" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "Progresso_moduloId_aulaId_userId_key" UNIQUE("cursoId","aulaId","userId")
);
--> statement-breakpoint
CREATE TABLE "Quiz" (
	"id" text PRIMARY KEY NOT NULL,
	"aulaId" text NOT NULL,
	"titulo" text NOT NULL,
	"notaMinima" integer DEFAULT 7 NOT NULL,
	"autoGerarCertificado" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"rolesPermitidos" jsonb,
	CONSTRAINT "Quiz_aulaId_unique" UNIQUE("aulaId")
);
--> statement-breakpoint
CREATE TABLE "QuizPergunta" (
	"id" text PRIMARY KEY NOT NULL,
	"quizId" text NOT NULL,
	"pergunta" text NOT NULL,
	"opcaoA" text NOT NULL,
	"opcaoB" text NOT NULL,
	"opcaoC" text,
	"opcaoD" text,
	"correta" text NOT NULL,
	"ordem" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "QuizResponse" (
	"id" text PRIMARY KEY NOT NULL,
	"quizId" text NOT NULL,
	"userId" text NOT NULL,
	"nota" integer NOT NULL,
	"total" integer NOT NULL,
	"concluido" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"respostas" jsonb,
	CONSTRAINT "QuizResponse_quizId_userId_key" UNIQUE("quizId","userId")
);
--> statement-breakpoint
CREATE TABLE "RoleConfig" (
	"id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"permissions" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "RoleConfig_role_unique" UNIQUE("role")
);
--> statement-breakpoint
CREATE TABLE "UserConquista" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"conquistaId" text NOT NULL,
	"dataConquista" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "UserConquista_userId_conquistaId_key" UNIQUE("userId","conquistaId")
);
--> statement-breakpoint
CREATE TABLE "XPConfig" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"label" text NOT NULL,
	"points" real DEFAULT 0 NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "XPConfig_action_unique" UNIQUE("action")
);
--> statement-breakpoint
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "Aula_cursoId_idx" ON "Aula" USING btree ("cursoId");--> statement-breakpoint
CREATE INDEX "Certificate_userId_idx" ON "Certificate" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Certificate_cursoId_idx" ON "Certificate" USING btree ("cursoId");--> statement-breakpoint
CREATE INDEX "Conquista_ativo_idx" ON "Conquista" USING btree ("ativo");--> statement-breakpoint
CREATE INDEX "Conquista_pontosMinimos_idx" ON "Conquista" USING btree ("pontosMinimos");--> statement-breakpoint
CREATE UNIQUE INDEX "Modulo_pkey" ON "Curso" USING btree ("id");--> statement-breakpoint
CREATE INDEX "ForumPost_autorId_idx" ON "ForumPost" USING btree ("autorId");--> statement-breakpoint
CREATE INDEX "Licao_aulaId_idx" ON "Licao" USING btree ("aulaId");--> statement-breakpoint
CREATE INDEX "Notification_fromId_idx" ON "Notification" USING btree ("fromId");--> statement-breakpoint
CREATE INDEX "Notification_toId_idx" ON "Notification" USING btree ("toId");--> statement-breakpoint
CREATE INDEX "PointsTransaction_userId_idx" ON "PointsTransaction" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "PointsTransaction_createdAt_idx" ON "PointsTransaction" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "PointsTransaction_action_idx" ON "PointsTransaction" USING btree ("action");--> statement-breakpoint
CREATE INDEX "Progresso_aulaId_idx" ON "Progresso" USING btree ("aulaId");--> statement-breakpoint
CREATE INDEX "Progresso_userId_idx" ON "Progresso" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Progresso_moduloId_idx" ON "Progresso" USING btree ("cursoId");--> statement-breakpoint
CREATE INDEX "Quiz_aulaId_idx" ON "Quiz" USING btree ("aulaId");--> statement-breakpoint
CREATE INDEX "QuizPergunta_quizId_idx" ON "QuizPergunta" USING btree ("quizId");--> statement-breakpoint
CREATE INDEX "QuizResponse_quizId_idx" ON "QuizResponse" USING btree ("quizId");--> statement-breakpoint
CREATE INDEX "QuizResponse_userId_idx" ON "QuizResponse" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "UserConquista_userId_idx" ON "UserConquista" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "UserConquista_conquistaId_idx" ON "UserConquista" USING btree ("conquistaId");