-- Reconcile migration: align DB with schema.prisma
-- Removes legacy Trilha tables, fixes Certificate FK from trilhaId to moduloId
-- Idempotent: safe to run on DBs that already match schema.prisma

-- Drop TrilhaAtendente table (legacy, not in schema.prisma)
DROP TABLE IF EXISTS "TrilhaAtendente" CASCADE;

-- Drop Trilha table (legacy, not in schema.prisma)
DROP TABLE IF EXISTS "Trilha" CASCADE;

-- Drop Modulo.trilhaId column and index (legacy)
DROP INDEX IF EXISTS "Modulo_trilhaId_idx";
ALTER TABLE "Modulo" DROP COLUMN IF EXISTS "trilhaId";

-- Drop old Certificate.trilhaId index
DROP INDEX IF EXISTS "Certificate_trilhaId_idx";

-- Add Certificate.moduloId column if it doesn't exist
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "moduloId" TEXT;

-- Backfill moduloId from related Aula data where possible
-- (maps Certificate to the Modulo whose Aula's Quiz the user passed)
DO $$
BEGIN
  UPDATE "Certificate" c
  SET "moduloId" = sub."moduloId"
  FROM (
    SELECT DISTINCT ON (qr."userId") qr."userId", a."moduloId"
    FROM "QuizResponse" qr
    JOIN "Quiz" q ON q."id" = qr."quizId"
    JOIN "Aula" a ON a."id" = q."aulaId"
    WHERE qr."concluido" = true
    ORDER BY qr."userId", qr."createdAt" DESC
  ) sub
  WHERE c."userId" = sub."userId" AND c."moduloId" IS NULL;
EXCEPTION WHEN OTHERS THEN
  -- Tables or columns may not exist, skip backfill
END $$;

-- Drop Certificate.trilhaId column (legacy)
ALTER TABLE "Certificate" DROP COLUMN IF EXISTS "trilhaId";

-- Add FK constraint for Certificate.moduloId (idempotent)
DO $$
BEGIN
  ALTER TABLE "Certificate"
  ADD CONSTRAINT "Certificate_moduloId_fkey"
  FOREIGN KEY ("moduloId") REFERENCES "Modulo" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists
END $$;

-- Create index for Certificate.moduloId
CREATE INDEX IF NOT EXISTS "Certificate_moduloId_idx" ON "Certificate"("moduloId");

-- Add ForumPost.autorId FK constraint (idempotent — may have been added by db push)
DO $$
BEGIN
  ALTER TABLE "ForumPost"
  ADD CONSTRAINT "ForumPost_autorId_fkey"
  FOREIGN KEY ("autorId") REFERENCES "User" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists
END $$;

-- Add PointsTransaction FK constraint (idempotent)
DO $$
BEGIN
  ALTER TABLE "PointsTransaction"
  ADD CONSTRAINT "PointsTransaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists
END $$;

-- Add Licao.aulaId FK constraint (idempotent)
DO $$
BEGIN
  ALTER TABLE "Licao"
  ADD CONSTRAINT "Licao_aulaId_fkey"
  FOREIGN KEY ("aulaId") REFERENCES "Aula" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists
END $$;
