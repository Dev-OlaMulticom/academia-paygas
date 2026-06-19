-- CreateTable
CREATE TABLE "Conquista" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "icone" TEXT NOT NULL DEFAULT '🏆',
    "cor" TEXT NOT NULL DEFAULT '#F47C20',
    "pontosMinimos" INTEGER NOT NULL DEFAULT 0,
    "xpRecompensa" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conquista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConquista" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conquistaId" TEXT NOT NULL,
    "dataConquista" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserConquista_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserConquista_userId_conquistaId_key" ON "UserConquista"("userId", "conquistaId");

-- CreateIndex
CREATE INDEX "Conquista_ativo_idx" ON "Conquista"("ativo");

-- CreateIndex
CREATE INDEX "Conquista_pontosMinimos_idx" ON "Conquista"("pontosMinimos");

-- CreateIndex
CREATE INDEX "UserConquista_userId_idx" ON "UserConquista"("userId");

-- CreateIndex
CREATE INDEX "UserConquista_conquistaId_idx" ON "UserConquista"("conquistaId");

-- AddForeignKey
ALTER TABLE "UserConquista" ADD CONSTRAINT "UserConquista_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConquista" ADD CONSTRAINT "UserConquista_conquistaId_fkey" FOREIGN KEY ("conquistaId") REFERENCES "Conquista"("id") ON DELETE CASCADE ON UPDATE CASCADE;
