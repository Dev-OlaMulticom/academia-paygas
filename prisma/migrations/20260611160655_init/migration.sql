-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "gestorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLogin" DATETIME,
    CONSTRAINT "User_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Trilha" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Modulo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trilhaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "videoUrl" TEXT,
    "videoInicio" INTEGER,
    "videoFim" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Modulo_trilhaId_fkey" FOREIGN KEY ("trilhaId") REFERENCES "Trilha" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Aula" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduloId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "videoUrl" TEXT,
    "videoInicio" INTEGER,
    "videoFim" INTEGER,
    "duracaoMin" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Aula_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "Modulo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aulaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "autoGerarCertificado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quiz_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizPergunta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "pergunta" TEXT NOT NULL,
    "opcaoA" TEXT NOT NULL,
    "opcaoB" TEXT NOT NULL,
    "opcaoC" TEXT,
    "opcaoD" TEXT,
    "correta" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuizPergunta_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuizResponse_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrilhaAtendente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trilhaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrilhaAtendente_trilhaId_fkey" FOREIGN KEY ("trilhaId") REFERENCES "Trilha" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrilhaAtendente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Progresso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduloId" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Progresso_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "Modulo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Progresso_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Progresso_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "trilhaId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "pdfUrl" TEXT,
    "htmlContent" TEXT,
    "aprovadoPor" TEXT,
    "aprovadoEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Certificate_trilhaId_fkey" FOREIGN KEY ("trilhaId") REFERENCES "Trilha" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "detalhes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_gestorId_idx" ON "User"("gestorId");

-- CreateIndex
CREATE INDEX "Modulo_trilhaId_idx" ON "Modulo"("trilhaId");

-- CreateIndex
CREATE INDEX "Aula_moduloId_idx" ON "Aula"("moduloId");

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_aulaId_key" ON "Quiz"("aulaId");

-- CreateIndex
CREATE INDEX "Quiz_aulaId_idx" ON "Quiz"("aulaId");

-- CreateIndex
CREATE INDEX "QuizPergunta_quizId_idx" ON "QuizPergunta"("quizId");

-- CreateIndex
CREATE INDEX "QuizResponse_quizId_idx" ON "QuizResponse"("quizId");

-- CreateIndex
CREATE INDEX "QuizResponse_userId_idx" ON "QuizResponse"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizResponse_quizId_userId_key" ON "QuizResponse"("quizId", "userId");

-- CreateIndex
CREATE INDEX "TrilhaAtendente_trilhaId_idx" ON "TrilhaAtendente"("trilhaId");

-- CreateIndex
CREATE INDEX "TrilhaAtendente_userId_idx" ON "TrilhaAtendente"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrilhaAtendente_trilhaId_userId_key" ON "TrilhaAtendente"("trilhaId", "userId");

-- CreateIndex
CREATE INDEX "Progresso_moduloId_idx" ON "Progresso"("moduloId");

-- CreateIndex
CREATE INDEX "Progresso_aulaId_idx" ON "Progresso"("aulaId");

-- CreateIndex
CREATE INDEX "Progresso_userId_idx" ON "Progresso"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Progresso_moduloId_aulaId_userId_key" ON "Progresso"("moduloId", "aulaId", "userId");

-- CreateIndex
CREATE INDEX "Certificate_userId_idx" ON "Certificate"("userId");

-- CreateIndex
CREATE INDEX "Certificate_trilhaId_idx" ON "Certificate"("trilhaId");

-- CreateIndex
CREATE INDEX "Notification_fromId_idx" ON "Notification"("fromId");

-- CreateIndex
CREATE INDEX "Notification_toId_idx" ON "Notification"("toId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
