-- Rename Modulo table to Curso
ALTER TABLE "Modulo" RENAME TO "Curso";

-- Rename foreign key in Aula
ALTER TABLE "Aula" RENAME COLUMN "moduloId" TO "cursoId";
ALTER TABLE "Aula" RENAME CONSTRAINT "Aula_moduloId_fkey" TO "Aula_cursoId_fkey";

-- Rename index in Aula  
ALTER INDEX "Aula_moduloId_idx" RENAME TO "Aula_cursoId_idx";

-- Rename foreign key and column in Progresso
ALTER TABLE "Progresso" RENAME COLUMN "moduloId" TO "cursoId";
ALTER TABLE "Progresso" RENAME CONSTRAINT "Progresso_moduloId_fkey" TO "Progresso_cursoId_fkey";

-- Rename unique constraint in Progresso
ALTER TABLE "Progresso" RENAME CONSTRAINT "Progresso_moduloId_aulaId_userId_key" TO "Progresso_cursoId_aulaId_userId_key";

-- Rename index in Progresso
ALTER INDEX "Progresso_moduloId_idx" RENAME TO "Progresso_cursoId_idx";

-- Rename foreign key and column in Certificate
ALTER TABLE "Certificate" RENAME COLUMN "moduloId" TO "cursoId";
ALTER TABLE "Certificate" RENAME CONSTRAINT "Certificate_moduloId_fkey" TO "Certificate_cursoId_fkey";

-- Rename unique constraint in Certificate
ALTER TABLE "Certificate" RENAME CONSTRAINT "Certificate_userId_moduloId_key" TO "Certificate_userId_cursoId_key";

-- Rename index in Certificate
ALTER INDEX "Certificate_moduloId_idx" RENAME TO "Certificate_cursoId_idx";
