CREATE TYPE "public"."Role" AS ENUM('ADMIN', 'GESTOR', 'ATENDENTE', 'PARCEIRO_ACREDITADO', 'ERPS_REPRESENTANTE');--> statement-breakpoint
CREATE TABLE "Estabelecimento" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"cnpj" text,
	"tipo" text,
	"cidade" text,
	"uf" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"nome" text NOT NULL,
	"senha" text NOT NULL,
	"role" "Role" NOT NULL,
	"xp" real DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"avatarUrl" text,
	"state" text,
	"emailVerificado" boolean DEFAULT false NOT NULL,
	"tokenVerificacao" text,
	"tokenExpiry" timestamp,
	"tokenRecuperacao" text,
	"tokenRecuperacaoExpiry" timestamp,
	"gestorId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"lastLogin" timestamp,
	"paygasSub" text,
	"telefone" text,
	"cpf" text,
	"perfil" text,
	"marketplaceId" text,
	"estabelecimentoId" text,
	CONSTRAINT "User_email_unique" UNIQUE("email"),
	CONSTRAINT "User_paygasSub_unique" UNIQUE("paygasSub")
);
--> statement-breakpoint
CREATE INDEX "User_gestorId_idx" ON "User" USING btree ("gestorId");--> statement-breakpoint
CREATE INDEX "User_estabelecimentoId_idx" ON "User" USING btree ("estabelecimentoId");