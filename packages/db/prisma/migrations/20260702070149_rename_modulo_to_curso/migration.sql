-- Rename Modulo table to Curso (idempotent: safe on DBs already renamed via db push
-- and on partially-renamed states). Each statement is guarded by a catalog check.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Modulo') THEN
    ALTER TABLE "Modulo" RENAME TO "Curso";
  END IF;
END $$;

-- Rename foreign key in Aula
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Aula' AND column_name = 'moduloId') THEN
    ALTER TABLE "Aula" RENAME COLUMN "moduloId" TO "cursoId";
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Aula_moduloId_fkey') THEN
    ALTER TABLE "Aula" RENAME CONSTRAINT "Aula_moduloId_fkey" TO "Aula_cursoId_fkey";
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Aula_moduloId_idx') THEN
    ALTER INDEX "Aula_moduloId_idx" RENAME TO "Aula_cursoId_idx";
  END IF;
END $$;

-- Rename foreign key and column in Progresso
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Progresso' AND column_name = 'moduloId') THEN
    ALTER TABLE "Progresso" RENAME COLUMN "moduloId" TO "cursoId";
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Progresso_moduloId_fkey') THEN
    ALTER TABLE "Progresso" RENAME CONSTRAINT "Progresso_moduloId_fkey" TO "Progresso_cursoId_fkey";
  END IF;
END $$;

-- Rename unique in Progresso (created as UNIQUE INDEX in init, may be a constraint on db push DBs)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Progresso_moduloId_aulaId_userId_key') THEN
    ALTER TABLE "Progresso" RENAME CONSTRAINT "Progresso_moduloId_aulaId_userId_key" TO "Progresso_cursoId_aulaId_userId_key";
  ELSIF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Progresso_moduloId_aulaId_userId_key') THEN
    ALTER INDEX "Progresso_moduloId_aulaId_userId_key" RENAME TO "Progresso_cursoId_aulaId_userId_key";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Progresso_moduloId_idx') THEN
    ALTER INDEX "Progresso_moduloId_idx" RENAME TO "Progresso_cursoId_idx";
  END IF;
END $$;

-- Rename foreign key and column in Certificate
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Certificate' AND column_name = 'moduloId') THEN
    ALTER TABLE "Certificate" RENAME COLUMN "moduloId" TO "cursoId";
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Certificate_moduloId_fkey') THEN
    ALTER TABLE "Certificate" RENAME CONSTRAINT "Certificate_moduloId_fkey" TO "Certificate_cursoId_fkey";
  END IF;
END $$;

-- Rename unique constraint in Certificate (created as constraint in 20260622000000, may be index on db push DBs)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Certificate_userId_moduloId_key') THEN
    ALTER TABLE "Certificate" RENAME CONSTRAINT "Certificate_userId_moduloId_key" TO "Certificate_userId_cursoId_key";
  ELSIF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Certificate_userId_moduloId_key') THEN
    ALTER INDEX "Certificate_userId_moduloId_key" RENAME TO "Certificate_userId_cursoId_key";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Certificate_moduloId_idx') THEN
    ALTER INDEX "Certificate_moduloId_idx" RENAME TO "Certificate_cursoId_idx";
  END IF;
END $$;
