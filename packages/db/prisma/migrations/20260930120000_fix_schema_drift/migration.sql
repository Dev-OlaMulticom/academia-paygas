-- Fix residual drift between the migration chain and schema.prisma.
-- These objects were historically added via `db push` only. Every statement is
-- idempotent or catalog-guarded, so it is safe on push-built databases.
-- Intentionally NOT included: index drops/renames that only exist in the DB
-- (ActivityLog_userId_createdAt_idx, Notification_toId_lida_idx,
-- PointsTransaction_userId_action_details_key, Progresso_userId_concluido_idx)
-- — they back real hot-path queries; dropping them to match schema is worse
-- than the cosmetic drift.

-- Enum: CertificateStatus
DO $$
BEGIN
  CREATE TYPE "CertificateStatus" AS ENUM ('PENDING', 'APPROVED', 'ISSUED');
EXCEPTION WHEN duplicate_object THEN
  -- Enum already exists
END $$;

ALTER TYPE "CertificateStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "CertificateStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "CertificateStatus" ADD VALUE IF NOT EXISTS 'ISSUED';

-- Aula.ancoragemPoints
ALTER TABLE "Aula" ADD COLUMN IF NOT EXISTS "ancoragemPoints" JSONB;

-- Aula.tipo TEXT -> AulaTipo (only when still plain text; skip on invalid values)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Aula' AND column_name = 'tipo' AND data_type = 'text'
  ) THEN
    BEGIN
      ALTER TABLE "Aula" ALTER COLUMN "tipo" DROP DEFAULT;
      ALTER TABLE "Aula" ALTER COLUMN "tipo" TYPE "AulaTipo" USING "tipo"::"AulaTipo";
    EXCEPTION WHEN OTHERS THEN
      NULL; -- unexpected values; leave column as text
    END;
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Aula' AND column_name = 'tipo' AND udt_name = 'AulaTipo'
  ) THEN
    ALTER TABLE "Aula" ALTER COLUMN "tipo" SET DEFAULT 'VIDEO'::"AulaTipo";
    ALTER TABLE "Aula" ALTER COLUMN "tipo" SET NOT NULL;
  END IF;
END $$;

-- Certificate.status TEXT -> CertificateStatus
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Certificate' AND column_name = 'status' AND data_type = 'text'
  ) THEN
    BEGIN
      ALTER TABLE "Certificate" ALTER COLUMN "status" DROP DEFAULT;
      ALTER TABLE "Certificate" ALTER COLUMN "status" TYPE "CertificateStatus"
        USING "status"::"CertificateStatus";
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Certificate' AND column_name = 'status' AND udt_name = 'CertificateStatus'
  ) THEN
    ALTER TABLE "Certificate" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"CertificateStatus";
    ALTER TABLE "Certificate" ALTER COLUMN "status" SET NOT NULL;
  END IF;
END $$;

-- Certificate.cursoId NOT NULL (only when no NULL rows would break it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Certificate' AND column_name = 'cursoId' AND is_nullable = 'YES'
  ) AND NOT EXISTS (SELECT 1 FROM "Certificate" WHERE "cursoId" IS NULL) THEN
    ALTER TABLE "Certificate" ALTER COLUMN "cursoId" SET NOT NULL;
  END IF;
END $$;

-- Curso: missing columns
ALTER TABLE "Curso" ADD COLUMN IF NOT EXISTS "certificadoTemplate" TEXT;
ALTER TABLE "Curso" ADD COLUMN IF NOT EXISTS "icone" TEXT;

-- ModuleConfig.updatedAt: schema has no default (drop is itself idempotent)
ALTER TABLE "ModuleConfig" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Notification.data
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "data" JSONB;

-- Progresso: missing columns
ALTER TABLE "Progresso" ADD COLUMN IF NOT EXISTS "reiniciado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Progresso" ADD COLUMN IF NOT EXISTS "restartCount" INTEGER NOT NULL DEFAULT 0;

-- User: missing columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVerificacao" TEXT;

-- Index renames to match schema-declared names (map: "moduloId" era names)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ModuleConfig_key_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ModuleConfig_key_key') THEN
    ALTER INDEX "ModuleConfig_key_idx" RENAME TO "ModuleConfig_key_key";
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Progresso_cursoId_aulaId_userId_key')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Progresso_moduloId_aulaId_userId_key') THEN
    ALTER INDEX "Progresso_cursoId_aulaId_userId_key" RENAME TO "Progresso_moduloId_aulaId_userId_key";
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Progresso_cursoId_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Progresso_moduloId_idx') THEN
    ALTER INDEX "Progresso_cursoId_idx" RENAME TO "Progresso_moduloId_idx";
  END IF;
END $$;
