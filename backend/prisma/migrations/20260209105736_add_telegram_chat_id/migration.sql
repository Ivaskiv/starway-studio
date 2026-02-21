/*
  Warnings:

  - The values [confirmed_old,chose_new] on the enum `DailyChoice` will be removed. If these variants are still used in the database, this will fail.
  - The values [emotional_drain] on the enum `DailyDrain` will be removed. If these variants are still used in the database, this will fail.
  - The values [trial_day4,trial_final] on the enum `MirrorType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `Mentor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Users` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MentorRole" AS ENUM ('user', 'mentor', 'system');

-- AlterEnum
BEGIN;
CREATE TYPE "DailyChoice_new" AS ENUM ('confirmedOld', 'choseNew');
ALTER TABLE "DailyEntry" ALTER COLUMN "choice" TYPE "DailyChoice_new" USING ("choice"::text::"DailyChoice_new");
ALTER TABLE "DecisionCheck" ALTER COLUMN "choice" TYPE "DailyChoice_new" USING ("choice"::text::"DailyChoice_new");
ALTER TYPE "DailyChoice" RENAME TO "DailyChoice_old";
ALTER TYPE "DailyChoice_new" RENAME TO "DailyChoice";
DROP TYPE "public"."DailyChoice_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "DailyDrain_new" AS ENUM ('doubt', 'procrastination', 'emotionalDrain', 'externalPressure');
ALTER TABLE "DailyEntry" ALTER COLUMN "drain" TYPE "DailyDrain_new" USING ("drain"::text::"DailyDrain_new");
ALTER TYPE "DailyDrain" RENAME TO "DailyDrain_old";
ALTER TYPE "DailyDrain_new" RENAME TO "DailyDrain";
DROP TYPE "public"."DailyDrain_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "MirrorType_new" AS ENUM ('trialDay4', 'trialFinal', 'weekly', 'monthly');
ALTER TABLE "Mirror" ALTER COLUMN "type" TYPE "MirrorType_new" USING ("type"::text::"MirrorType_new");
ALTER TYPE "MirrorType" RENAME TO "MirrorType_old";
ALTER TYPE "MirrorType_new" RENAME TO "MirrorType";
DROP TYPE "public"."MirrorType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ActionsSet" DROP CONSTRAINT "ActionsSet_userId_fkey";

-- DropForeignKey
ALTER TABLE "Consultation" DROP CONSTRAINT "Consultation_userId_fkey";

-- DropForeignKey
ALTER TABLE "DailyEntry" DROP CONSTRAINT "DailyEntry_userId_fkey";

-- DropForeignKey
ALTER TABLE "DecisionCheck" DROP CONSTRAINT "DecisionCheck_userId_fkey";

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_userId_fkey";

-- DropForeignKey
ALTER TABLE "GoalsSet" DROP CONSTRAINT "GoalsSet_userId_fkey";

-- DropForeignKey
ALTER TABLE "Mentor" DROP CONSTRAINT "Mentor_userId_fkey";

-- DropForeignKey
ALTER TABLE "Mentorship" DROP CONSTRAINT "Mentorship_userId_fkey";

-- DropForeignKey
ALTER TABLE "MentorshipOffer" DROP CONSTRAINT "MentorshipOffer_userId_fkey";

-- DropForeignKey
ALTER TABLE "MicroTask" DROP CONSTRAINT "MicroTask_userId_fkey";

-- DropForeignKey
ALTER TABLE "Mirror" DROP CONSTRAINT "Mirror_userId_fkey";

-- DropForeignKey
ALTER TABLE "Streak" DROP CONSTRAINT "Streak_userId_fkey";

-- DropForeignKey
ALTER TABLE "VisionStatement" DROP CONSTRAINT "VisionStatement_userId_fkey";

-- DropForeignKey
ALTER TABLE "WheelAssessment" DROP CONSTRAINT "WheelAssessment_userId_fkey";

-- DropForeignKey
ALTER TABLE "ZoomSessionAttendee" DROP CONSTRAINT "ZoomSessionAttendee_userId_fkey";

-- AlterTable
ALTER TABLE "DailyEntry" ADD COLUMN     "aiAnalysis" TEXT,
ALTER COLUMN "drain" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MicroTask" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "linkedDailyEntryId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'ai';

-- DropTable
DROP TABLE "Mentor";

-- DropTable
DROP TABLE "Users";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "telegramUserName" TEXT,
    "telegramChatId" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'TRIAL',
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "subscriptionEndsAt" TIMESTAMP(3),
    "onboardingStage" "OnboardingStage" DEFAULT 'ENTRY',
    "onboardingStartedAt" TIMESTAMP(3),
    "onboardingCompletedAt" TIMESTAMP(3),
    "onboardingCurrentStageStartedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentors" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "meta" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_messages" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "role" "MentorRole" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentorConfigs" (
    "userId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentorConfigs_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "mentorContext" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MentorRole" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentorContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyAnswer" (
    "id" TEXT NOT NULL,
    "dailyEntryId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mentors_userId_key" ON "mentors"("userId");

-- CreateIndex
CREATE INDEX "mentor_messages_mentorId_createdAt_idx" ON "mentor_messages"("mentorId", "createdAt");

-- CreateIndex
CREATE INDEX "mentorContext_userId_createdAt_idx" ON "mentorContext"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DailyAnswer_dailyEntryId_idx" ON "DailyAnswer"("dailyEntryId");

-- CreateIndex
CREATE INDEX "MicroTask_userId_dueDate_idx" ON "MicroTask"("userId", "dueDate");

-- AddForeignKey
ALTER TABLE "mentors" ADD CONSTRAINT "mentors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_messages" ADD CONSTRAINT "mentor_messages_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "mentors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorConfigs" ADD CONSTRAINT "mentorConfigs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorContext" ADD CONSTRAINT "mentorContext_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelAssessment" ADD CONSTRAINT "WheelAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAnswer" ADD CONSTRAINT "DailyAnswer_dailyEntryId_fkey" FOREIGN KEY ("dailyEntryId") REFERENCES "DailyEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroTask" ADD CONSTRAINT "MicroTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mirror" ADD CONSTRAINT "Mirror_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionStatement" ADD CONSTRAINT "VisionStatement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalsSet" ADD CONSTRAINT "GoalsSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionsSet" ADD CONSTRAINT "ActionsSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionCheck" ADD CONSTRAINT "DecisionCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoomSessionAttendee" ADD CONSTRAINT "ZoomSessionAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipOffer" ADD CONSTRAINT "MentorshipOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentorship" ADD CONSTRAINT "Mentorship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
