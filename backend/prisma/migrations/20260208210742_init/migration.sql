-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'MENTOR');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('TRIAL', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "OnboardingStage" AS ENUM ('ENTRY', 'VISION', 'GOAL', 'CHOICE', 'ACTIONS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DailyState" AS ENUM ('tension', 'fear', 'stability', 'innerSupport');

-- CreateEnum
CREATE TYPE "DailyDrain" AS ENUM ('doubt', 'procrastination', 'emotional_drain', 'externalPressure');

-- CreateEnum
CREATE TYPE "DailyChoice" AS ENUM ('confirmed_old', 'chose_new');

-- CreateEnum
CREATE TYPE "MirrorType" AS ENUM ('trial_day4', 'trial_final', 'weekly', 'monthly');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ZoomStatus" AS ENUM ('SCHEDULED', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "telegramUserName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'TRIAL',
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "subscriptionEndsAt" TIMESTAMP(3),
    "onboardingStage" "OnboardingStage" DEFAULT 'ENTRY',
    "onboardingStartedAt" TIMESTAMP(3),
    "onboardingCompletedAt" TIMESTAMP(3),
    "onboardingCurrentStageStartedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mentor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mentor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mentorId" TEXT,
    "productId" TEXT NOT NULL,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "trialEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WheelAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "weakestSphere" TEXT NOT NULL,
    "focusSphere" TEXT NOT NULL,
    "analysis" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WheelAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" "DailyState" NOT NULL,
    "drain" "DailyDrain" NOT NULL,
    "choice" "DailyChoice" NOT NULL,
    "dayFact" TEXT NOT NULL,
    "microSupport" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalStabilityDays" INTEGER NOT NULL DEFAULT 0,
    "totalDrainDays" INTEGER NOT NULL DEFAULT 0,
    "drainRecoveryCount" INTEGER NOT NULL DEFAULT 0,
    "supportCompletionRate" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mirror" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MirrorType" NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "analysis" JSONB NOT NULL,
    "aiInsight" TEXT NOT NULL,
    "beforeAfterContrast" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mirror_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisionStatement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionnaire" JSONB NOT NULL,
    "statement" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisionStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalsSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goals" JSONB NOT NULL,
    "primaryGoalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalsSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionsSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionsSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionCheck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyEntryId" TEXT NOT NULL,
    "choice" "DailyChoice" NOT NULL,
    "alignsWithGoal" BOOLEAN NOT NULL,
    "isBetrayingDecision" BOOLEAN NOT NULL,
    "aiExplanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicroTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicroTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "trigger" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoomSession" (
    "id" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ZoomStatus" NOT NULL DEFAULT 'SCHEDULED',
    "requests" JSONB NOT NULL,
    "postSessionReport" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZoomSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoomSessionAttendee" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ZoomSessionAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorshipOffer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stabilityDays" INTEGER NOT NULL,
    "qualifies" BOOLEAN NOT NULL DEFAULT false,
    "offeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorshipOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mentorship" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mentorship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Mentor_userId_key" ON "Mentor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "WheelAssessment_userId_createdAt_idx" ON "WheelAssessment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DailyEntry_userId_date_idx" ON "DailyEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyEntry_userId_date_key" ON "DailyEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Streak_userId_key" ON "Streak"("userId");

-- CreateIndex
CREATE INDEX "Mirror_userId_type_idx" ON "Mirror"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "VisionStatement_userId_key" ON "VisionStatement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoalsSet_userId_key" ON "GoalsSet"("userId");

-- CreateIndex
CREATE INDEX "ActionsSet_userId_idx" ON "ActionsSet"("userId");

-- CreateIndex
CREATE INDEX "DecisionCheck_userId_createdAt_idx" ON "DecisionCheck"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MicroTask_userId_completed_idx" ON "MicroTask"("userId", "completed");

-- CreateIndex
CREATE INDEX "Consultation_userId_status_idx" ON "Consultation"("userId", "status");

-- CreateIndex
CREATE INDEX "ZoomSessionAttendee_userId_idx" ON "ZoomSessionAttendee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ZoomSessionAttendee_sessionId_userId_key" ON "ZoomSessionAttendee"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MentorshipOffer_userId_key" ON "MentorshipOffer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Mentorship_userId_key" ON "Mentorship"("userId");

-- AddForeignKey
ALTER TABLE "Mentor" ADD CONSTRAINT "Mentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelAssessment" ADD CONSTRAINT "WheelAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "DecisionCheck" ADD CONSTRAINT "DecisionCheck_dailyEntryId_fkey" FOREIGN KEY ("dailyEntryId") REFERENCES "DailyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroTask" ADD CONSTRAINT "MicroTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoomSessionAttendee" ADD CONSTRAINT "ZoomSessionAttendee_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ZoomSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoomSessionAttendee" ADD CONSTRAINT "ZoomSessionAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipOffer" ADD CONSTRAINT "MentorshipOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentorship" ADD CONSTRAINT "Mentorship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
