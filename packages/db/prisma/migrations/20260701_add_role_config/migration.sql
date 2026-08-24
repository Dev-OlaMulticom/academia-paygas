-- CreateTable
CREATE TABLE "RoleConfig" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleConfig_role_key" ON "RoleConfig"("role");

-- Seed default role configs
INSERT INTO "RoleConfig" ("id", "role", "label", "description", "ativo", "ordem", "permissions", "createdAt", "updatedAt") VALUES
('rc_admin', 'ADMIN', 'SuperAdministrador', 'Acesso total ao sistema', true, 1,
'[{"action":"manage","subject":"all"}]',
NOW(), NOW()),

('rc_gestor', 'GESTOR', 'Gestor / Líder', 'Gerencia equipe de atendentes', true, 2,
'[{"action":"read","subject":"User"},{"action":"update","subject":"User","conditions":{"gestorId":"__userId__"}},{"action":"create","subject":"User","conditions":{"role":"ATENDENTE"}},{"action":"viewTeam","subject":"Team"},{"action":"sendNotification","subject":"Notification"},{"action":"read","subject":"Notification"},{"action":"read","subject":"Certificate"},{"action":"approveCertificate","subject":"Certificate"},{"action":"issueCertificate","subject":"Certificate"},{"action":"read","subject":"Modulo"},{"action":"read","subject":"Aula"},{"action":"read","subject":"Licao"},{"action":"read","subject":"PointsTransaction"},{"action":"read","subject":"Conquista"},{"action":"read","subject":"Progresso"}]',
NOW(), NOW()),

('rc_atendente', 'ATENDENTE', 'Atendente/Frentista', 'Acesso a cursos e quiz', true, 3,
'[{"action":"read","subject":"User","conditions":{"id":"__userId__"}},{"action":"update","subject":"User","conditions":{"id":"__userId__"}},{"action":"read","subject":"Progresso"},{"action":"update","subject":"Progresso"},{"action":"read","subject":"Certificate"},{"action":"create","subject":"Certificate"},{"action":"read","subject":"Notification"},{"action":"read","subject":"Modulo"},{"action":"read","subject":"Aula"},{"action":"read","subject":"Licao"},{"action":"read","subject":"Quiz"},{"action":"create","subject":"Quiz"},{"action":"read","subject":"PointsTransaction"},{"action":"read","subject":"Conquista"},{"action":"read","subject":"ForumPost"},{"action":"create","subject":"ForumPost"}]',
NOW(), NOW()),

('rc_parceiro', 'PARCEIRO_ACREDITADO', 'Administrador', 'Parceiro com acesso a conteudo exclusivo', true, 4,
'[{"action":"read","subject":"User","conditions":{"id":"__userId__"}},{"action":"update","subject":"User","conditions":{"id":"__userId__"}},{"action":"read","subject":"Progresso"},{"action":"update","subject":"Progresso"},{"action":"read","subject":"Certificate"},{"action":"create","subject":"Certificate"},{"action":"read","subject":"Notification"},{"action":"read","subject":"Modulo"},{"action":"read","subject":"Aula"},{"action":"read","subject":"Licao"},{"action":"read","subject":"Quiz"},{"action":"create","subject":"Quiz"},{"action":"read","subject":"PointsTransaction"},{"action":"read","subject":"Conquista"},{"action":"read","subject":"ForumPost"},{"action":"create","subject":"ForumPost"}]',
NOW(), NOW()),

('rc_erps', 'ERPS_REPRESENTANTE', 'ERPs Representante', 'Representante de ERPs com acesso tecnico', true, 5,
'[{"action":"read","subject":"User","conditions":{"id":"__userId__"}},{"action":"update","subject":"User","conditions":{"id":"__userId__"}},{"action":"read","subject":"Progresso"},{"action":"update","subject":"Progresso"},{"action":"read","subject":"Certificate"},{"action":"create","subject":"Certificate"},{"action":"read","subject":"Notification"},{"action":"read","subject":"Modulo"},{"action":"read","subject":"Aula"},{"action":"read","subject":"Licao"},{"action":"read","subject":"Quiz"},{"action":"create","subject":"Quiz"},{"action":"read","subject":"PointsTransaction"},{"action":"read","subject":"Conquista"},{"action":"read","subject":"ForumPost"},{"action":"create","subject":"ForumPost"}]',
NOW(), NOW());
