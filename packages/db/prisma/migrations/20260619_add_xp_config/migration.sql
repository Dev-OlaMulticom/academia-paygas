-- Add LESSON_VIEW to PointsAction enum
ALTER TYPE "PointsAction" ADD VALUE IF NOT EXISTS 'LESSON_VIEW';

-- AlterTable: Change points and xp columns to support decimal values
ALTER TABLE "PointsTransaction" ALTER COLUMN "points" TYPE DOUBLE PRECISION USING "points"::DOUBLE PRECISION;
ALTER TABLE "User" ALTER COLUMN "xp" TYPE DOUBLE PRECISION USING "xp"::DOUBLE PRECISION;

-- CreateTable: XPConfig
CREATE TABLE IF NOT EXISTS "XPConfig" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XPConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "XPConfig_action_key" ON "XPConfig"("action");

-- Insert default XP configuration values
INSERT INTO "XPConfig" ("id", "action", "label", "points", "description", "createdAt", "updatedAt")
SELECT replace(gen_random_uuid()::text, '-', ''), v.action, v.label, v.points, v.description, NOW(), NOW()
FROM (VALUES
  ('LOGIN', 'Login / Acesso à plataforma', 0.05, 'Pontos por cada login realizado (máx 1 por dia)'),
  ('MODULE_OPEN', 'Abrir Módulo', 0.05, 'Pontos por acessar um módulo de curso'),
  ('LESSON_VIEW', 'Visualizar Lição', 0.1, 'Pontos por visualizar uma lição'),
  ('LESSON_COMPLETE', 'Completar Lição', 1.0, 'Pontos por concluir uma lição/aula'),
  ('MODULE_COMPLETE', 'Completar Módulo', 5.0, 'Pontos por concluir todos as aulas de um módulo'),
  ('QUIZ_CORRECT', 'Resposta Correta no Quiz', 0.5, 'Pontos por cada resposta correta no quiz'),
  ('QUIZ_PASS', 'Aprovar Quiz', 2.0, 'Pontos por aprovar no quiz (nota >= mínima)'),
  ('CERTIFICATE', 'Obter Certificado', 10.0, 'Pontos por obter um certificado')
) AS v(action, label, points, description)
WHERE NOT EXISTS (SELECT 1 FROM "XPConfig" WHERE "XPConfig".action = v.action);
