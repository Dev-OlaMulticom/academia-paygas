-- AlterEnum: Add new roles to the Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PARCEIRO_ACREDITADO';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ERPS_REPRESENTANTE';

-- Add rolesPermitidos to Modulo
ALTER TABLE "Modulo" ADD COLUMN "rolesPermitidos" JSONB;

-- Add rolesPermitidos to Aula
ALTER TABLE "Aula" ADD COLUMN "rolesPermitidos" JSONB;

-- Add rolesPermitidos to Quiz
ALTER TABLE "Quiz" ADD COLUMN "rolesPermitidos" JSONB;
