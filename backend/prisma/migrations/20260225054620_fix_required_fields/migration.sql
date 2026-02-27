/*
  Warnings:

  - You are about to drop the column `drainDays` on the `Streak` table. All the data in the column will be lost.
  - You are about to drop the column `stabilityDays` on the `Streak` table. All the data in the column will be lost.
  - You are about to drop the column `telegramId` on the `TelegramLink` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,ruleKey]` on the table `Streak` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `TelegramLink` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[expertId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "FunnelType" AS ENUM ('FAST_CASH', 'DIAGNOSTIC', 'EVERGREEN');

-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('WHEEL', 'AI_MENTOR', 'VIDEO_REMINDER', 'UPSELL_5_POINTS');

-- DropForeignKey
ALTER TABLE "UserBalanceEntry" DROP CONSTRAINT "UserBalanceEntry_expertId_fkey";

-- DropForeignKey
ALTER TABLE "ZoomSession" DROP CONSTRAINT "ZoomSession_expertId_fkey";

-- DropIndex
DROP INDEX "Streak_expertId_userId_idx";

-- DropIndex
DROP INDEX "Streak_userId_idx";

-- DropIndex
DROP INDEX "TelegramLink_telegramId_key";

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Funnel" ADD COLUMN     "blueprint" JSONB,
ADD COLUMN     "type" "FunnelType";

-- AlterTable
ALTER TABLE "MentorConfig" ALTER COLUMN "config" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "kind" "ProductKind";

-- AlterTable
ALTER TABLE "Streak" DROP COLUMN "drainDays",
DROP COLUMN "stabilityDays",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "current" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "longest" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ruleKey" TEXT NOT NULL DEFAULT 'daily_checkin',
ADD COLUMN     "ruleVer" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "totalDays" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "startAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "TelegramLink" DROP COLUMN "telegramId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '7 days';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStage" TEXT,
ADD COLUMN     "onboardingStartedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserBalanceEntry" ALTER COLUMN "expertId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ZoomSession" ALTER COLUMN "expertId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Enrollment_expiresAt_idx" ON "Enrollment"("expiresAt");

-- CreateIndex
CREATE INDEX "Streak_userId_expertId_idx" ON "Streak"("userId", "expertId");

-- CreateIndex
CREATE UNIQUE INDEX "Streak_userId_ruleKey_key" ON "Streak"("userId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLink_code_key" ON "TelegramLink"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_expertId_key" ON "User"("expertId");

-- AddForeignKey
ALTER TABLE "UserBalanceEntry" ADD CONSTRAINT "UserBalanceEntry_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoomSession" ADD CONSTRAINT "ZoomSession_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;
