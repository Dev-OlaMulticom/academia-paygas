-- CreateTable
CREATE TABLE "Licao" (
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

-- CreateTable
CREATE TABLE "ModuleConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModuleConfig_key_idx" ON "ModuleConfig"("key");

-- CreateIndex
CREATE INDEX "Licao_aulaId_idx" ON "Licao"("aulaId");

-- Insert default module configs
INSERT INTO "ModuleConfig" ("key", "label", "enabled") VALUES
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
  ('conquistas', 'Conquistas', true);
