-- CreateEnum
CREATE TYPE "AIMessageRole" AS ENUM ('user', 'assistant', 'system');

-- CreateEnum
CREATE TYPE "FunnelStatus" AS ENUM ('LEAD', 'TRIAL', 'CONVERTED', 'CHURNED');

-- AlterTable
ALTER TABLE "UserAIMentor" ADD COLUMN     "behaviorPattern" TEXT,
ADD COLUMN     "blocker" TEXT,
ADD COLUMN     "clarityLevel" TEXT,
ADD COLUMN     "currentState" TEXT,
ADD COLUMN     "insight" TEXT,
ADD COLUMN     "lastAnalyzedAt" TIMESTAMP(3),
ADD COLUMN     "realGoal" TEXT,
ADD COLUMN     "recommendedFocus" TEXT,
ADD COLUMN     "stage" TEXT;

-- CreateTable
CREATE TABLE "trial_mirrors" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "analysis" TEXT NOT NULL,
    "entries" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trial_mirrors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AIMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "topic" TEXT,
    "content" TEXT NOT NULL,
    "platform" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelLead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT,
    "status" "FunnelStatus" NOT NULL DEFAULT 'LEAD',
    "convertedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trial_mirrors_userId_idx" ON "trial_mirrors"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "trial_mirrors_userId_day_key" ON "trial_mirrors"("userId", "day");

-- CreateIndex
CREATE INDEX "AIConversation_userId_idx" ON "AIConversation"("userId");

-- CreateIndex
CREATE INDEX "AIConversation_userId_createdAt_idx" ON "AIConversation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AIMessage_conversationId_idx" ON "AIMessage"("conversationId");

-- CreateIndex
CREATE INDEX "AIMessage_conversationId_createdAt_idx" ON "AIMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AIMemory_userId_idx" ON "AIMemory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AIMemory_userId_key_key" ON "AIMemory"("userId", "key");

-- CreateIndex
CREATE INDEX "PromptVersion_name_isActive_idx" ON "PromptVersion"("name", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_name_version_key" ON "PromptVersion"("name", "version");

-- CreateIndex
CREATE INDEX "ContentItem_userId_idx" ON "ContentItem"("userId");

-- CreateIndex
CREATE INDEX "ContentItem_userId_status_idx" ON "ContentItem"("userId", "status");

-- CreateIndex
CREATE INDEX "ContentItem_userId_type_idx" ON "ContentItem"("userId", "type");

-- CreateIndex
CREATE INDEX "FunnelLead_userId_idx" ON "FunnelLead"("userId");

-- CreateIndex
CREATE INDEX "FunnelLead_status_idx" ON "FunnelLead"("status");

-- CreateIndex
CREATE INDEX "FunnelLead_source_status_idx" ON "FunnelLead"("source", "status");

-- CreateIndex
CREATE INDEX "UserAIMentor_userId_idx" ON "UserAIMentor"("userId");

-- CreateIndex
CREATE INDEX "UserMentorConfig_userId_idx" ON "UserMentorConfig"("userId");

-- AddForeignKey
ALTER TABLE "trial_mirrors" ADD CONSTRAINT "trial_mirrors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMemory" ADD CONSTRAINT "AIMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelLead" ADD CONSTRAINT "FunnelLead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
