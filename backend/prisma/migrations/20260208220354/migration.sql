/*
  Warnings:

  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
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

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "Users" (
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

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE INDEX "Users_email_idx" ON "Users"("email");

-- AddForeignKey
ALTER TABLE "Mentor" ADD CONSTRAINT "Mentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelAssessment" ADD CONSTRAINT "WheelAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mirror" ADD CONSTRAINT "Mirror_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionStatement" ADD CONSTRAINT "VisionStatement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalsSet" ADD CONSTRAINT "GoalsSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionsSet" ADD CONSTRAINT "ActionsSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionCheck" ADD CONSTRAINT "DecisionCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroTask" ADD CONSTRAINT "MicroTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoomSessionAttendee" ADD CONSTRAINT "ZoomSessionAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipOffer" ADD CONSTRAINT "MentorshipOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentorship" ADD CONSTRAINT "Mentorship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
