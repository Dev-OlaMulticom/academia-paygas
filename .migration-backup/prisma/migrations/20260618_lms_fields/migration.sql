-- CreateEnum
CREATE TYPE "AulaTipo" AS ENUM ('VIDEO', 'PDF', 'TEXTO');

-- AlterTable: Modulo
ALTER TABLE "Modulo" ADD COLUMN "obrigatorio" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Modulo" ADD COLUMN "autoCertificado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Aula
ALTER TABLE "Aula" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'VIDEO';
ALTER TABLE "Aula" ADD COLUMN "pdfUrl" TEXT;
ALTER TABLE "Aula" ADD COLUMN "obrigatorio" BOOLEAN NOT NULL DEFAULT false;
