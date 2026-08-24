-- CreateTable
CREATE TABLE "Estabelecimento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "tipo" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estabelecimento_pkey" PRIMARY KEY ("id")
);

-- Backfill from existing users so the FK below can be created with data present
INSERT INTO "Estabelecimento" ("id", "nome", "createdAt", "updatedAt")
SELECT DISTINCT u."estabelecimentoId", u."estabelecimentoId", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" u
WHERE u."estabelecimentoId" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

-- AlterTable (relação: a coluna já existia; cria FK e índice)
ALTER TABLE "User" ADD CONSTRAINT "User_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "User_estabelecimentoId_idx" ON "User"("estabelecimentoId");
