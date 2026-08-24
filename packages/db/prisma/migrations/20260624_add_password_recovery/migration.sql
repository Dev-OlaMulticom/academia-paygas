-- AlterTable
ALTER TABLE "User" ADD COLUMN "tokenRecuperacao" TEXT;
ALTER TABLE "User" ADD COLUMN "tokenRecuperacaoExpiry" TIMESTAMP(3);
