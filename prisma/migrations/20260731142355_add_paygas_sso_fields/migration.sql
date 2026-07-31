-- AlterTable
ALTER TABLE "User" ADD COLUMN "paygasSub" TEXT,
ADD COLUMN "telefone" TEXT,
ADD COLUMN "cpf" TEXT,
ADD COLUMN "perfil" TEXT,
ADD COLUMN "marketplaceId" TEXT,
ADD COLUMN "estabelecimentoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_paygasSub_key" ON "User"("paygasSub");
