-- CreateEnum
CREATE TYPE "VoiceEntryType" AS ENUM ('TELEGRAM_VOICE', 'TELEGRAM_AUDIO');

-- CreateTable
CREATE TABLE "VoiceEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "state" "DailyState" NOT NULL DEFAULT 'NEUTRAL',
    "intensity" INTEGER NOT NULL DEFAULT 1,
    "confidence" DOUBLE PRECISION,
    "type" "VoiceEntryType" NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'voice',
    "decision" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceEntry_userId_createdAt_idx" ON "VoiceEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VoiceEntry_userId_state_createdAt_idx" ON "VoiceEntry"("userId", "state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserMemory_userId_key" ON "UserMemory"("userId");

-- AddForeignKey
ALTER TABLE "VoiceEntry" ADD CONSTRAINT "VoiceEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMemory" ADD CONSTRAINT "UserMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
