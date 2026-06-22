-- AlterTable: Add unique constraint on [userId, moduloId] for Certificate table
-- This prevents duplicate certificates for the same user and module
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_moduloId_key" UNIQUE ("userId", "moduloId");
