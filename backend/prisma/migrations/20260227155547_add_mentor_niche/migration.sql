/*
  Warnings:

  - You are about to drop the `AIMentor` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Mentorship` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `MentorshipOffer` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DailyChoice" AS ENUM ('PENDING', 'CONFIRMED', 'SKIPPED', 'CONFIRMED_OLD');

-- CreateEnum
CREATE TYPE "DailyState" AS ENUM ('NEUTRAL', 'HAPPY', 'SAD', 'ANXIOUS');

-- CreateEnum
CREATE TYPE "DailyDrain" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- DropForeignKey
ALTER TABLE "AIMentor" DROP CONSTRAINT "AIMentor_expertId_fkey";

-- DropForeignKey
ALTER TABLE "Mentorship" DROP CONSTRAINT "Mentorship_mentorId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_mentorId_fkey";

-- DropForeignKey
ALTER TABLE "UserBalanceEntry" DROP CONSTRAINT "UserBalanceEntry_expertId_fkey";

-- DropForeignKey
ALTER TABLE "UserBalanceEntry" DROP CONSTRAINT "UserBalanceEntry_mentorId_fkey";

-- DropForeignKey
ALTER TABLE "UserMentorState" DROP CONSTRAINT "UserMentorState_mentorId_fkey";

-- DropForeignKey
ALTER TABLE "ZoomSession" DROP CONSTRAINT "ZoomSession_expertId_fkey";

-- DropIndex
DROP INDEX "User_expertId_key";

-- AlterTable
ALTER TABLE "DailyEntry" ADD COLUMN     "aiAnalysis" TEXT,
ADD COLUMN     "choice" "DailyChoice" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "dayFact" TEXT,
ADD COLUMN     "drain" "DailyDrain",
ADD COLUMN     "microSupport" JSONB,
ADD COLUMN     "state" "DailyState" NOT NULL DEFAULT 'NEUTRAL';

-- AlterTable
ALTER TABLE "Mentorship" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "MentorshipOffer" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "mentorId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "uiSettings" JSONB;

-- DropTable
DROP TABLE "AIMentor";

-- CreateTable
CREATE TABLE "Mentor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "niche" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "onboardingStage" TEXT,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "meta" JSONB NOT NULL DEFAULT '{}',
    "summary" JSONB NOT NULL DEFAULT '{}',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mentor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorSession" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "onboardingStage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FivePointsEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "progress" JSONB,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FivePointsEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FivePointsModule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "durationDays" INTEGER NOT NULL DEFAULT 0,
    "definition" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FivePointsModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelStage" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "FunnelStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiniCourse" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "definition" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT NOT NULL,
    "expertId" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiniCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalsSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goals" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalsSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mentor_userId_key" ON "Mentor"("userId");

-- CreateIndex
CREATE INDEX "Mentor_expertId_deletedAt_idx" ON "Mentor"("expertId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Mentor_expertId_slug_key" ON "Mentor"("expertId", "slug");

-- CreateIndex
CREATE INDEX "MentorSession_mentorId_lastMessageAt_idx" ON "MentorSession"("mentorId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "FivePointsEnrollment_userId_moduleId_idx" ON "FivePointsEnrollment"("userId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "FivePointsModule_code_key" ON "FivePointsModule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MiniCourse_slug_key" ON "MiniCourse"("slug");

-- CreateIndex
CREATE INDEX "GoalsSet_userId_idx" ON "GoalsSet"("userId");

-- AddForeignKey
ALTER TABLE "Mentor" ADD CONSTRAINT "Mentor_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentor" ADD CONSTRAINT "Mentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorSession" ADD CONSTRAINT "MentorSession_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorSession" ADD CONSTRAINT "MentorSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorMessage" ADD CONSTRAINT "MentorMessage_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorMessage" ADD CONSTRAINT "MentorMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MentorSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorMessage" ADD CONSTRAINT "MentorMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FivePointsEnrollment" ADD CONSTRAINT "FivePointsEnrollment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "FivePointsModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBalanceEntry" ADD CONSTRAINT "UserBalanceEntry_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMentorState" ADD CONSTRAINT "UserMentorState_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelStage" ADD CONSTRAINT "FunnelStage_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentorship" ADD CONSTRAINT "Mentorship_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipOffer" ADD CONSTRAINT "MentorshipOffer_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Mentor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiniCourse" ADD CONSTRAINT "MiniCourse_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiniCourse" ADD CONSTRAINT "MiniCourse_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalsSet" ADD CONSTRAINT "GoalsSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
