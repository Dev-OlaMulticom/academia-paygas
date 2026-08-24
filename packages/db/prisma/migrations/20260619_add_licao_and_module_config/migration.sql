-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "Licao" (
    "id" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT,
    "tipo" "AulaTipo" NOT NULL DEFAULT 'TEXTO',
    "ordem" INTEGER NOT NULL,
    "duracaoMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Licao_pkey" PRIMARY KEY ("id")
);

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "ModuleConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModuleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "ModuleConfig_key_idx" ON "ModuleConfig"("key");
CREATE INDEX IF NOT EXISTS "Licao_aulaId_idx" ON "Licao"("aulaId");

-- Insert default module configs (only if not exists)
INSERT INTO "ModuleConfig" ("id", "key", "label", "enabled", "createdAt", "updatedAt")
SELECT replace(gen_random_uuid()::text, '-', ''), v.key, v.label, v.enabled, NOW(), NOW()
FROM (VALUES
  ('dashboard', 'Dashboard', true),
  ('trilhas', 'Trilhas de Aprendizado', true),
  ('certificados', 'Certificados', true),
  ('cms', 'Gestao de Conteudo', true),
  ('equipe', 'Equipes', true),
  ('usuarios', 'Usuarios', true),
  ('relatorios', 'Relatorios', true),
  ('notificacoes', 'Notificacoes', true),
  ('perfil', 'Meu Perfil', true),
  ('forum', 'Forum', true),
  ('analytics', 'Analytics', true),
  ('ranking', 'Ranking Nacional', true),
  ('mapa', 'Mapa Nacional', true),
  ('nacional', 'Painel Nacional', true),
  ('conquistas', 'Conquistas', true)
) AS v(key, label, enabled)
WHERE NOT EXISTS (SELECT 1 FROM "ModuleConfig" WHERE "ModuleConfig".key = v.key);
