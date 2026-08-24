-- CreateEnum (idempotent - safe to re-run)
DO $$ BEGIN
    CREATE TYPE "AulaTipo" AS ENUM ('VIDEO', 'PDF', 'TEXTO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Modulo (idempotent)
DO $$ BEGIN
    ALTER TABLE "Modulo" ADD COLUMN "obrigatorio" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Modulo" ADD COLUMN "autoCertificado" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- AlterTable: Aula (idempotent)
DO $$ BEGIN
    ALTER TABLE "Aula" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'VIDEO';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Aula" ADD COLUMN "pdfUrl" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Aula" ADD COLUMN "obrigatorio" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
