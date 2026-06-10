-- CreateEnum
CREATE TYPE "LexType" AS ENUM ('REQUIRED', 'FORBIDDEN');

-- CreateTable
CREATE TABLE "Lexicon" (
    "id" TEXT NOT NULL,
    "profileKey" TEXT NOT NULL,
    "type" "LexType" NOT NULL,
    "word" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lexicon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "launchContext" TEXT NOT NULL,
    "audienceTemp" TEXT NOT NULL,
    "objections" TEXT NOT NULL,
    "resistance" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lexicon_profileKey_type_idx" ON "Lexicon"("profileKey", "type");

-- CreateIndex
CREATE INDEX "CampaignMemory_userId_isActive_idx" ON "CampaignMemory"("userId", "isActive");
