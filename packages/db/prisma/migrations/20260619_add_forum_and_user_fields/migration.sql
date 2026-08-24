-- AlterTable
ALTER TABLE "User" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "avatarUrl" TEXT,
ADD COLUMN "state" TEXT;

-- CreateTable
CREATE TABLE "ForumPost" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "tags" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForumPost_autorId_idx" ON "ForumPost"("autorId");
