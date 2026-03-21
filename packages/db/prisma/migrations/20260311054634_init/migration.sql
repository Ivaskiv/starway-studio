-- CreateEnum
CREATE TYPE "CTAType" AS ENUM ('TELEGRAM', 'MINI_APP');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('DAILY', 'AI_CHECKIN', 'FUNNEL');

-- CreateEnum
CREATE TYPE "GenerationType" AS ENUM ('MORNING_SESSION', 'EVENING_SESSION', 'WHEEL_ANALYSIS', 'WEEKLY_ANALYSIS', 'AFFIRMATION', 'MICRO_TASK', 'CHAT', 'PDF_REPORT');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('HERO', 'AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_TIKTOK', 'AD_STORIES', 'EMAIL_SUBJECT', 'SEO_TITLE', 'LANDING_SECTION');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'EXPERT', 'USER', 'MENTOR');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('WHEEL', 'AI_MENTOR', 'VIDEO_REMINDER', 'UPSELL_5_POINTS');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('FUNNEL', 'VIDEO', 'MINI_COURSE');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FunnelType" AS ENUM ('FAST_CASH', 'DIAGNOSTIC', 'EVERGREEN');

-- CreateEnum
CREATE TYPE "MicroTaskStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MicroTaskReason" AS ENUM ('low_score', 'instability', 'growth', 'wheel_gap', 'stagnation');

-- CreateEnum
CREATE TYPE "DailyState" AS ENUM ('NEUTRAL', 'HAPPY', 'SAD', 'ANXIOUS');

-- CreateEnum
CREATE TYPE "DailyChoice" AS ENUM ('PENDING', 'CONFIRMED', 'SKIPPED', 'CONFIRMED_OLD');

-- CreateEnum
CREATE TYPE "DailyDrain" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "MentorshipStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ACCEPTED', 'PAUSED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('TELEGRAM', 'IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ZoomStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expert" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "telegramBotToken" TEXT,
    "telegramBotName" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "expertId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "telegramUserId" TEXT,
    "telegramUserName" TEXT,
    "telegramChatId" TEXT,
    "passwordHash" TEXT,
    "uiSettings" JSONB,
    "settings" JSONB,
    "lastLoginAt" TIMESTAMP(3),
    "onboardingStage" TEXT,
    "onboardingStartedAt" TIMESTAMP(3),
    "trialStartsAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "role" "Role" NOT NULL DEFAULT 'USER',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMentorConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMentorConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMentor" (
    "id" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "niche" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "generatorConfig" JSONB NOT NULL,
    "runtimeConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMentor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAIMentor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aiMentorId" TEXT NOT NULL,
    "state" JSONB,
    "meta" JSONB,
    "currentStep" TEXT NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "lastInteractionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAIMentor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userMentorId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'idle',
    "step" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMentorMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMentorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMentorState" (
    "id" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aiMentorId" TEXT NOT NULL,
    "currentStep" TEXT NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "lastInteractionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMentorState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "expertId" TEXT,
    "ownerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "kind" "ProductKind",
    "features" JSONB,
    "limits" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "systemPrompt" TEXT,
    "mentorConfig" JSONB,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "trialEnd" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "payRef" TEXT,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertId" TEXT,
    "productId" TEXT,
    "startsAt" TIMESTAMP(3),
    "status" "SubscriptionStatus" NOT NULL,
    "planCode" TEXT NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT,
    "moduleType" "StageType" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CTAInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CTAType" NOT NULL,
    "moduleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CTAInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "nextReminderAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "PaymentStatus" NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertId" TEXT,
    "productId" TEXT,
    "funnelId" TEXT,
    "miniCourseId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funnel" (
    "id" TEXT NOT NULL,
    "expertId" TEXT,
    "ownerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "definition" JSONB NOT NULL DEFAULT '{}',
    "blueprint" JSONB,
    "type" "FunnelType",
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelProduct" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "FunnelProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelStage" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "FunnelStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoModule" (
    "id" TEXT NOT NULL,
    "expertId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "duration" INTEGER,
    "definition" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoStage" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VideoStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFunnelStageProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "funnelStageId" TEXT NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "stageIndex" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFunnelStageProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserVideoStageProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoStageId" TEXT NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "stageIndex" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserVideoStageProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMiniCourseStageProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "miniCourseStageId" TEXT NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "stageIndex" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMiniCourseStageProgress_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "MiniCourseStage" (
    "id" TEXT NOT NULL,
    "miniCourseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MiniCourseStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FivePointsEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "progress" JSONB NOT NULL DEFAULT '{}',
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
CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "completedBlocks" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "state" "DailyState" NOT NULL DEFAULT 'NEUTRAL',
    "choice" "DailyChoice" NOT NULL DEFAULT 'PENDING',
    "drain" "DailyDrain",
    "dayFact" TEXT,
    "aiAnalysis" TEXT,
    "microSupport" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicroTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MicroTaskStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" "MicroTaskReason",
    "source" TEXT,
    "linkedQuestionId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "taskDetails" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicroTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCycleLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "state" "DailyState" NOT NULL DEFAULT 'NEUTRAL',
    "choice" "DailyChoice" NOT NULL DEFAULT 'PENDING',
    "drain" "DailyDrain",
    "dayFact" TEXT,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCycleLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicroSupportItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "source" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MicroSupportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleStreakMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "daysStable" INTEGER NOT NULL DEFAULT 0,
    "drainsCount" INTEGER NOT NULL DEFAULT 0,
    "recoveryAfterDrain" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleStreakMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "current" INTEGER NOT NULL DEFAULT 1,
    "longest" INTEGER NOT NULL DEFAULT 1,
    "totalDays" INTEGER NOT NULL DEFAULT 1,
    "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ruleKey" TEXT NOT NULL DEFAULT 'daily_checkin',
    "ruleVer" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalsSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goals" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalsSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceWheelConfig" (
    "id" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "spheres" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BalanceWheelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBalanceEntry" (
    "id" TEXT NOT NULL,
    "expertId" TEXT,
    "userId" TEXT NOT NULL,
    "aiMentorId" TEXT,
    "balanceConfigId" TEXT NOT NULL,
    "scores" JSONB NOT NULL DEFAULT '{}',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBalanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisionStatement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertId" TEXT,
    "statement" TEXT NOT NULL,
    "questionnaire" JSONB NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisionStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WheelAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expertId" TEXT,
    "statement" TEXT,
    "scores" JSONB NOT NULL,
    "weakestSphere" TEXT,
    "focusSphere" TEXT,
    "analysis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WheelAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mentorship" (
    "id" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "MentorshipStatus" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mentorship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorshipOffer" (
    "id" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offerDetails" JSONB NOT NULL DEFAULT '{}',
    "status" "MentorshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorshipOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "expertId" TEXT,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "templateKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (now() + '7 days'::interval),

    CONSTRAINT "TelegramLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoomSession" (
    "id" TEXT NOT NULL,
    "expertId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "topic" TEXT NOT NULL,
    "status" "ZoomStatus" NOT NULL DEFAULT 'SCHEDULED',
    "requests" JSONB NOT NULL DEFAULT '[]',
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZoomSessionAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "baseLimit" INTEGER NOT NULL DEFAULT 33,
    "purchased" INTEGER NOT NULL DEFAULT 0,
    "totalTokensInput" INTEGER NOT NULL DEFAULT 0,
    "totalTokensOutput" INTEGER NOT NULL DEFAULT 0,
    "totalCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "type" "GenerationType" NOT NULL,
    "model" TEXT NOT NULL,
    "tokensInput" INTEGER NOT NULL,
    "tokensOutput" INTEGER NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "taskPrompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProducerConfig" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "utp" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'inspiring',
    "brandColors" TEXT,
    "modules" JSONB NOT NULL,
    "lastHeroGenAt" TIMESTAMP(3),
    "lastSeoGenAt" TIMESTAMP(3),
    "lastReportGenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProducerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "overallScore" INTEGER,
    "completionRate" INTEGER,
    "streakDays" INTEGER,
    "topInsights" JSONB,
    "growthAreas" JSONB,
    "struggleAreas" JSONB,
    "wheelDelta" JSONB,
    "summaryText" TEXT,
    "motivationText" TEXT,
    "nextWeekFocus" TEXT,
    "nextWeekTasks" JSONB,
    "pdfUrl" TEXT,
    "metrics" JSONB NOT NULL,
    "analysis" JSONB NOT NULL,
    "heroVariants" JSONB NOT NULL,
    "adTexts" JSONB NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfSentAt" TIMESTAMP(3),

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorWeeklyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "behaviorPattern" TEXT NOT NULL,
    "engagementRhythm" TEXT NOT NULL,
    "mainPainThisWeek" TEXT NOT NULL,
    "emotionalTone" TEXT NOT NULL,
    "retentionRisk" INTEGER NOT NULL,
    "retentionFactors" JSONB NOT NULL,
    "churnSignals" JSONB NOT NULL,
    "upsellReady" BOOLEAN NOT NULL,
    "upsellProduct" TEXT NOT NULL,
    "upsellTiming" TEXT NOT NULL,
    "upsellReasoning" TEXT NOT NULL,
    "offerShownAt" TIMESTAMP(3),
    "nextMessageTone" TEXT NOT NULL,
    "triggerForContact" TEXT NOT NULL,
    "recommendedOffer" TEXT NOT NULL,
    "systemNotes" TEXT NOT NULL,

    CONSTRAINT "MentorWeeklyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "variant" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductScore" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subscribers" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceProduct" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "category" TEXT,
    "tags" TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateLink" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Expert_email_key" ON "Expert"("email");

-- CreateIndex
CREATE INDEX "Expert_isActive_deletedAt_idx" ON "Expert"("isActive", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramUserId_key" ON "User"("telegramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramUserName_key" ON "User"("telegramUserName");

-- CreateIndex
CREATE INDEX "User_expertId_idx" ON "User"("expertId");

-- CreateIndex
CREATE INDEX "User_telegramUserName_idx" ON "User"("telegramUserName");

-- CreateIndex
CREATE INDEX "User_expertId_email_idx" ON "User"("expertId", "email");

-- CreateIndex
CREATE INDEX "User_expertId_deletedAt_idx" ON "User"("expertId", "deletedAt");

-- CreateIndex
CREATE INDEX "User_expertId_createdAt_idx" ON "User"("expertId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_expertId_telegramUserId_key" ON "User"("expertId", "telegramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMentorConfig_userId_key" ON "UserMentorConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AIMentor_expertId_slug_key" ON "AIMentor"("expertId", "slug");

-- CreateIndex
CREATE INDEX "UserAIMentor_userId_updatedAt_idx" ON "UserAIMentor"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAIMentor_userId_aiMentorId_key" ON "UserAIMentor"("userId", "aiMentorId");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_sessions_userId_key" ON "mentor_sessions"("userId");

-- CreateIndex
CREATE INDEX "UserMentorState_expertId_lastInteractionAt_idx" ON "UserMentorState"("expertId", "lastInteractionAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserMentorState_userId_aiMentorId_key" ON "UserMentorState"("userId", "aiMentorId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMentorState_expertId_userId_aiMentorId_key" ON "UserMentorState"("expertId", "userId", "aiMentorId");

-- CreateIndex
CREATE UNIQUE INDEX "MentorConfig_userId_key" ON "MentorConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Enrollment_userId_idx" ON "Enrollment"("userId");

-- CreateIndex
CREATE INDEX "Enrollment_expiresAt_idx" ON "Enrollment"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_productId_key" ON "Enrollment"("userId", "productId");

-- CreateIndex
CREATE INDEX "Subscription_expertId_userId_status_idx" ON "Subscription"("expertId", "userId", "status");

-- CreateIndex
CREATE INDEX "AIRecommendation_userId_moduleType_idx" ON "AIRecommendation"("userId", "moduleType");

-- CreateIndex
CREATE INDEX "CTAInteraction_userId_type_idx" ON "CTAInteraction"("userId", "type");

-- CreateIndex
CREATE INDEX "Reminder_userId_type_idx" ON "Reminder"("userId", "type");

-- CreateIndex
CREATE INDEX "PaymentLog_userId_status_idx" ON "PaymentLog"("userId", "status");

-- CreateIndex
CREATE INDEX "PaymentLog_expertId_createdAt_idx" ON "PaymentLog"("expertId", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseHistory_userId_createdAt_idx" ON "PurchaseHistory"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Funnel_code_key" ON "Funnel"("code");

-- CreateIndex
CREATE INDEX "Funnel_expertId_isActive_idx" ON "Funnel"("expertId", "isActive");

-- CreateIndex
CREATE INDEX "Funnel_expertId_deletedAt_idx" ON "Funnel"("expertId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Funnel_expertId_slug_key" ON "Funnel"("expertId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelProduct_funnelId_productId_key" ON "FunnelProduct"("funnelId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoModule_slug_key" ON "VideoModule"("slug");

-- CreateIndex
CREATE INDEX "VideoStage_videoId_order_idx" ON "VideoStage"("videoId", "order");

-- CreateIndex
CREATE INDEX "UserFunnelStageProgress_userId_idx" ON "UserFunnelStageProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFunnelStageProgress_userId_funnelStageId_key" ON "UserFunnelStageProgress"("userId", "funnelStageId");

-- CreateIndex
CREATE INDEX "UserVideoStageProgress_userId_idx" ON "UserVideoStageProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserVideoStageProgress_userId_videoStageId_key" ON "UserVideoStageProgress"("userId", "videoStageId");

-- CreateIndex
CREATE INDEX "UserMiniCourseStageProgress_userId_idx" ON "UserMiniCourseStageProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMiniCourseStageProgress_userId_miniCourseStageId_key" ON "UserMiniCourseStageProgress"("userId", "miniCourseStageId");

-- CreateIndex
CREATE UNIQUE INDEX "MiniCourse_slug_key" ON "MiniCourse"("slug");

-- CreateIndex
CREATE INDEX "MiniCourse_ownerId_idx" ON "MiniCourse"("ownerId");

-- CreateIndex
CREATE INDEX "MiniCourse_expertId_idx" ON "MiniCourse"("expertId");

-- CreateIndex
CREATE INDEX "MiniCourseStage_miniCourseId_order_idx" ON "MiniCourseStage"("miniCourseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");

-- CreateIndex
CREATE INDEX "CourseEnrollment_userId_idx" ON "CourseEnrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseEnrollment_userId_courseId_key" ON "CourseEnrollment"("userId", "courseId");

-- CreateIndex
CREATE INDEX "FivePointsEnrollment_userId_moduleId_idx" ON "FivePointsEnrollment"("userId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "FivePointsModule_code_key" ON "FivePointsModule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_userId_key" ON "UserProgress"("userId");

-- CreateIndex
CREATE INDEX "DailyEntry_expertId_userId_idx" ON "DailyEntry"("expertId", "userId");

-- CreateIndex
CREATE INDEX "DailyEntry_userId_date_idx" ON "DailyEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyEntry_userId_date_key" ON "DailyEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "MicroTask_expertId_userId_idx" ON "MicroTask"("expertId", "userId");

-- CreateIndex
CREATE INDEX "MicroTask_userId_status_idx" ON "MicroTask"("userId", "status");

-- CreateIndex
CREATE INDEX "MicroTask_dueDate_idx" ON "MicroTask"("dueDate");

-- CreateIndex
CREATE INDEX "DailyCycleLog_userId_date_idx" ON "DailyCycleLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCycleLog_userId_date_key" ON "DailyCycleLog"("userId", "date");

-- CreateIndex
CREATE INDEX "MicroSupportItem_userId_action_idx" ON "MicroSupportItem"("userId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "CycleStreakMetric_userId_key" ON "CycleStreakMetric"("userId");

-- CreateIndex
CREATE INDEX "Streak_userId_expertId_idx" ON "Streak"("userId", "expertId");

-- CreateIndex
CREATE UNIQUE INDEX "Streak_userId_ruleKey_key" ON "Streak"("userId", "ruleKey");

-- CreateIndex
CREATE INDEX "GoalsSet_userId_idx" ON "GoalsSet"("userId");

-- CreateIndex
CREATE INDEX "BalanceWheelConfig_expertId_isDefault_idx" ON "BalanceWheelConfig"("expertId", "isDefault");

-- CreateIndex
CREATE INDEX "BalanceWheelConfig_expertId_deletedAt_idx" ON "BalanceWheelConfig"("expertId", "deletedAt");

-- CreateIndex
CREATE INDEX "UserBalanceEntry_expertId_userId_createdAt_idx" ON "UserBalanceEntry"("expertId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserBalanceEntry_expertId_userId_balanceConfigId_createdAt_idx" ON "UserBalanceEntry"("expertId", "userId", "balanceConfigId", "createdAt");

-- CreateIndex
CREATE INDEX "UserBalanceEntry_expertId_aiMentorId_createdAt_idx" ON "UserBalanceEntry"("expertId", "aiMentorId", "createdAt");

-- CreateIndex
CREATE INDEX "VisionStatement_userId_idx" ON "VisionStatement"("userId");

-- CreateIndex
CREATE INDEX "VisionStatement_expertId_userId_idx" ON "VisionStatement"("expertId", "userId");

-- CreateIndex
CREATE INDEX "WheelAssessment_userId_idx" ON "WheelAssessment"("userId");

-- CreateIndex
CREATE INDEX "WheelAssessment_expertId_userId_idx" ON "WheelAssessment"("expertId", "userId");

-- CreateIndex
CREATE INDEX "Mentorship_userId_status_idx" ON "Mentorship"("userId", "status");

-- CreateIndex
CREATE INDEX "Mentorship_expertId_status_idx" ON "Mentorship"("expertId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Mentorship_expertId_userId_key" ON "Mentorship"("expertId", "userId");

-- CreateIndex
CREATE INDEX "MentorshipOffer_expertId_userId_idx" ON "MentorshipOffer"("expertId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_status_idx" ON "Notification"("userId", "status");

-- CreateIndex
CREATE INDEX "Notification_expertId_status_scheduledAt_idx" ON "Notification"("expertId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Notification_templateKey_status_idx" ON "Notification"("templateKey", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLink_code_key" ON "TelegramLink"("code");

-- CreateIndex
CREATE INDEX "TelegramLink_userId_idx" ON "TelegramLink"("userId");

-- CreateIndex
CREATE INDEX "Report_expertId_userId_createdAt_idx" ON "Report"("expertId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "ZoomSession_expertId_status_idx" ON "ZoomSession"("expertId", "status");

-- CreateIndex
CREATE INDEX "ZoomSession_scheduledAt_idx" ON "ZoomSession"("scheduledAt");

-- CreateIndex
CREATE INDEX "ZoomSessionAttendee_sessionId_idx" ON "ZoomSessionAttendee"("sessionId");

-- CreateIndex
CREATE INDEX "ZoomSessionAttendee_userId_idx" ON "ZoomSessionAttendee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ZoomSessionAttendee_sessionId_userId_key" ON "ZoomSessionAttendee"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationQuota_userId_key" ON "GenerationQuota"("userId");

-- CreateIndex
CREATE INDEX "GenerationLog_userId_createdAt_idx" ON "GenerationLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProducerConfig_productId_key" ON "ProducerConfig"("productId");

-- CreateIndex
CREATE INDEX "WeeklyReport_productId_weekStart_idx" ON "WeeklyReport"("productId", "weekStart");

-- CreateIndex
CREATE INDEX "WeeklyReport_userId_weekStart_idx" ON "WeeklyReport"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_userId_weekStart_key" ON "WeeklyReport"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "MentorWeeklyProfile_userId_weekStart_idx" ON "MentorWeeklyProfile"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "MentorWeeklyProfile_userId_weekStart_key" ON "MentorWeeklyProfile"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "ContentVariant_productId_type_idx" ON "ContentVariant"("productId", "type");

-- CreateIndex
CREATE INDEX "AssistantMemory_userId_idx" ON "AssistantMemory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductScore_productId_key" ON "ProductScore"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceProduct_productId_key" ON "MarketplaceProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateLink_code_key" ON "AffiliateLink"("code");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMentorConfig" ADD CONSTRAINT "UserMentorConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMentor" ADD CONSTRAINT "AIMentor_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAIMentor" ADD CONSTRAINT "UserAIMentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAIMentor" ADD CONSTRAINT "UserAIMentor_aiMentorId_fkey" FOREIGN KEY ("aiMentorId") REFERENCES "AIMentor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_sessions" ADD CONSTRAINT "mentor_sessions_userMentorId_fkey" FOREIGN KEY ("userMentorId") REFERENCES "UserAIMentor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_sessions" ADD CONSTRAINT "mentor_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMentorMessage" ADD CONSTRAINT "AIMentorMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "mentor_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMentorState" ADD CONSTRAINT "UserMentorState_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMentorState" ADD CONSTRAINT "UserMentorState_aiMentorId_fkey" FOREIGN KEY ("aiMentorId") REFERENCES "AIMentor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMentorState" ADD CONSTRAINT "UserMentorState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorConfig" ADD CONSTRAINT "MentorConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRecommendation" ADD CONSTRAINT "AIRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CTAInteraction" ADD CONSTRAINT "CTAInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseHistory" ADD CONSTRAINT "PurchaseHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseHistory" ADD CONSTRAINT "PurchaseHistory_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseHistory" ADD CONSTRAINT "PurchaseHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseHistory" ADD CONSTRAINT "PurchaseHistory_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseHistory" ADD CONSTRAINT "PurchaseHistory_miniCourseId_fkey" FOREIGN KEY ("miniCourseId") REFERENCES "MiniCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelProduct" ADD CONSTRAINT "FunnelProduct_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelProduct" ADD CONSTRAINT "FunnelProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelStage" ADD CONSTRAINT "FunnelStage_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoModule" ADD CONSTRAINT "VideoModule_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoStage" ADD CONSTRAINT "VideoStage_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "VideoModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFunnelStageProgress" ADD CONSTRAINT "UserFunnelStageProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFunnelStageProgress" ADD CONSTRAINT "UserFunnelStageProgress_funnelStageId_fkey" FOREIGN KEY ("funnelStageId") REFERENCES "FunnelStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVideoStageProgress" ADD CONSTRAINT "UserVideoStageProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVideoStageProgress" ADD CONSTRAINT "UserVideoStageProgress_videoStageId_fkey" FOREIGN KEY ("videoStageId") REFERENCES "VideoStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMiniCourseStageProgress" ADD CONSTRAINT "UserMiniCourseStageProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMiniCourseStageProgress" ADD CONSTRAINT "UserMiniCourseStageProgress_miniCourseStageId_fkey" FOREIGN KEY ("miniCourseStageId") REFERENCES "MiniCourseStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiniCourse" ADD CONSTRAINT "MiniCourse_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiniCourse" ADD CONSTRAINT "MiniCourse_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiniCourseStage" ADD CONSTRAINT "MiniCourseStage_miniCourseId_fkey" FOREIGN KEY ("miniCourseId") REFERENCES "MiniCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FivePointsEnrollment" ADD CONSTRAINT "FivePointsEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FivePointsEnrollment" ADD CONSTRAINT "FivePointsEnrollment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "FivePointsModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroTask" ADD CONSTRAINT "MicroTask_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroTask" ADD CONSTRAINT "MicroTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCycleLog" ADD CONSTRAINT "DailyCycleLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroSupportItem" ADD CONSTRAINT "MicroSupportItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleStreakMetric" ADD CONSTRAINT "CycleStreakMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalsSet" ADD CONSTRAINT "GoalsSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceWheelConfig" ADD CONSTRAINT "BalanceWheelConfig_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBalanceEntry" ADD CONSTRAINT "UserBalanceEntry_balanceConfigId_fkey" FOREIGN KEY ("balanceConfigId") REFERENCES "BalanceWheelConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBalanceEntry" ADD CONSTRAINT "UserBalanceEntry_aiMentorId_fkey" FOREIGN KEY ("aiMentorId") REFERENCES "AIMentor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBalanceEntry" ADD CONSTRAINT "UserBalanceEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBalanceEntry" ADD CONSTRAINT "UserBalanceEntry_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionStatement" ADD CONSTRAINT "VisionStatement_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionStatement" ADD CONSTRAINT "VisionStatement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelAssessment" ADD CONSTRAINT "WheelAssessment_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelAssessment" ADD CONSTRAINT "WheelAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentorship" ADD CONSTRAINT "Mentorship_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentorship" ADD CONSTRAINT "Mentorship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipOffer" ADD CONSTRAINT "MentorshipOffer_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipOffer" ADD CONSTRAINT "MentorshipOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLink" ADD CONSTRAINT "TelegramLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoomSession" ADD CONSTRAINT "ZoomSession_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoomSessionAttendee" ADD CONSTRAINT "ZoomSessionAttendee_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ZoomSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoomSessionAttendee" ADD CONSTRAINT "ZoomSessionAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationQuota" ADD CONSTRAINT "GenerationQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProducerConfig" ADD CONSTRAINT "ProducerConfig_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorWeeklyProfile" ADD CONSTRAINT "MentorWeeklyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantSession" ADD CONSTRAINT "AssistantSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AssistantSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantMemory" ADD CONSTRAINT "AssistantMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductScore" ADD CONSTRAINT "ProductScore_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceProduct" ADD CONSTRAINT "MarketplaceProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateLink" ADD CONSTRAINT "AffiliateLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateLink" ADD CONSTRAINT "AffiliateLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
