-- Create enums/tables/columns historically added via `db push` only.
-- Idempotent: safe on DBs where these objects already exist.
-- Must run before 20260619_add_xp_config (ALTERs PointsAction/PointsTransaction/User.xp)
-- and 20260701_add_new_roles_and_access_control (ALTERs Role enum).

-- Enum: Role
DO $$
BEGIN
  CREATE TYPE "Role" AS ENUM ('ADMIN', 'GESTOR', 'ATENDENTE', 'PARCEIRO_ACREDITADO', 'ERPS_REPRESENTANTE');
EXCEPTION WHEN duplicate_object THEN
  -- Enum already exists
END $$;

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PARCEIRO_ACREDITADO';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ERPS_REPRESENTANTE';

-- Convert User.role TEXT -> Role enum only when it is still plain text
-- (DBs migrated via db push already have the enum type and skip this).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'role' AND data_type = 'text'
  ) THEN
    ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
  END IF;
END $$;

-- Enum: PointsAction
DO $$
BEGIN
  CREATE TYPE "PointsAction" AS ENUM (
    'LOGIN', 'MODULE_OPEN', 'LESSON_VIEW', 'LESSON_COMPLETE',
    'MODULE_COMPLETE', 'QUIZ_CORRECT', 'QUIZ_PASS', 'CERTIFICATE'
  );
EXCEPTION WHEN duplicate_object THEN
  -- Enum already exists
END $$;

ALTER TYPE "PointsAction" ADD VALUE IF NOT EXISTS 'LOGIN';
ALTER TYPE "PointsAction" ADD VALUE IF NOT EXISTS 'MODULE_OPEN';
ALTER TYPE "PointsAction" ADD VALUE IF NOT EXISTS 'LESSON_VIEW';
ALTER TYPE "PointsAction" ADD VALUE IF NOT EXISTS 'LESSON_COMPLETE';
ALTER TYPE "PointsAction" ADD VALUE IF NOT EXISTS 'MODULE_COMPLETE';
ALTER TYPE "PointsAction" ADD VALUE IF NOT EXISTS 'QUIZ_CORRECT';
ALTER TYPE "PointsAction" ADD VALUE IF NOT EXISTS 'QUIZ_PASS';
ALTER TYPE "PointsAction" ADD VALUE IF NOT EXISTS 'CERTIFICATE';

-- Column: User.xp (created via db push historically)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "xp" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Table: PointsTransaction
CREATE TABLE IF NOT EXISTS "PointsTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "PointsAction" NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PointsTransaction_userId_idx" ON "PointsTransaction"("userId");
CREATE INDEX IF NOT EXISTS "PointsTransaction_createdAt_idx" ON "PointsTransaction"("createdAt");
CREATE INDEX IF NOT EXISTS "PointsTransaction_action_idx" ON "PointsTransaction"("action");

-- FK constraint (idempotent — same pattern as 20260619_reconcile_schema)
DO $$
BEGIN
  ALTER TABLE "PointsTransaction"
  ADD CONSTRAINT "PointsTransaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists
END $$;
