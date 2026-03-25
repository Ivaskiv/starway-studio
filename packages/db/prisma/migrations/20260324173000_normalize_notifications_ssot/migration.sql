-- Create enums for normalized notification SSOT.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    CREATE TYPE "NotificationType" AS ENUM (
      'DAILY_MORNING',
      'DAILY_EVENING',
      'STREAK_ALERT',
      'LEVEL_UP',
      'WEEKLY_SUMMARY',
      'AI_REMINDER',
      'SUBSCRIPTION'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationJobStatus') THEN
    CREATE TYPE "NotificationJobStatus" AS ENUM (
      'PENDING',
      'PROCESSING',
      'DONE',
      'FAILED'
    );
  END IF;
END $$;

ALTER TABLE "Notification"
  ADD COLUMN IF NOT EXISTS "type" "NotificationType",
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "body" TEXT,
  ADD COLUMN IF NOT EXISTS "data" JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

UPDATE "Notification"
SET
  "type" = CASE
    WHEN "templateKey" = 'daily_morning' THEN 'DAILY_MORNING'::"NotificationType"
    WHEN "templateKey" = 'daily_evening' THEN 'DAILY_EVENING'::"NotificationType"
    WHEN "templateKey" IN ('streak_alert', 'streak_broken') THEN 'STREAK_ALERT'::"NotificationType"
    WHEN "templateKey" = 'level_up' THEN 'LEVEL_UP'::"NotificationType"
    WHEN "templateKey" = 'weekly_summary' THEN 'WEEKLY_SUMMARY'::"NotificationType"
    WHEN "templateKey" = 'ai_reminder' THEN 'AI_REMINDER'::"NotificationType"
    ELSE 'SUBSCRIPTION'::"NotificationType"
  END,
  "title" = COALESCE("title", "templateKey"),
  "body" = COALESCE("body", ''),
  "data" = COALESCE("data", "payload");

CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "telegramEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "dailyMorningTime" INTEGER NOT NULL DEFAULT 540,
  "dailyEveningTime" INTEGER NOT NULL DEFAULT 1260,
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Kyiv',
  "streakAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "weeklySummaryEnabled" BOOLEAN NOT NULL DEFAULT true,
  "aiRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
CREATE INDEX IF NOT EXISTS "NotificationPreference_timezone_idx" ON "NotificationPreference"("timezone");

INSERT INTO "NotificationPreference" (
  "id",
  "userId",
  "telegramEnabled",
  "emailEnabled",
  "dailyMorningTime",
  "dailyEveningTime",
  "timezone",
  "streakAlertsEnabled",
  "weeklySummaryEnabled",
  "aiRemindersEnabled"
)
SELECT
  md5(random()::text || clock_timestamp()::text || u."id"),
  u."id",
  COALESCE((u."uiSettings"->'notifications'->>'enabled')::boolean, true),
  false,
  COALESCE(
    CASE
      WHEN u."uiSettings"->'notifications'->>'morningTime' ~ '^\d{1,2}:\d{2}$'
        THEN split_part(u."uiSettings"->'notifications'->>'morningTime', ':', 1)::int * 60
           + split_part(u."uiSettings"->'notifications'->>'morningTime', ':', 2)::int
      ELSE NULL
    END,
    540
  ),
  COALESCE(
    CASE
      WHEN u."uiSettings"->'notifications'->>'eveningTime' ~ '^\d{1,2}:\d{2}$'
        THEN split_part(u."uiSettings"->'notifications'->>'eveningTime', ':', 1)::int * 60
           + split_part(u."uiSettings"->'notifications'->>'eveningTime', ':', 2)::int
      ELSE NULL
    END,
    1260
  ),
  'Europe/Kyiv',
  COALESCE((u."uiSettings"->'notifications'->'types'->>'streakAlert')::boolean, true),
  COALESCE((u."uiSettings"->'notifications'->'types'->>'weeklySummary')::boolean, true),
  COALESCE(
    (
      COALESCE((u."uiSettings"->'notifications'->'types'->>'dailyMorning')::boolean, true)
      OR COALESCE((u."uiSettings"->'notifications'->'types'->>'dailyEvening')::boolean, true)
      OR COALESCE((u."uiSettings"->'notifications'->'types'->>'levelUp')::boolean, true)
    ),
    true
  )
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "NotificationPreference" np WHERE np."userId" = u."id"
);

CREATE TABLE IF NOT EXISTS "NotificationJob" (
  "id" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "runAt" TIMESTAMP(3) NOT NULL,
  "status" "NotificationJobStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NotificationJob_status_runAt_idx" ON "NotificationJob"("status", "runAt");
CREATE INDEX IF NOT EXISTS "NotificationJob_type_status_idx" ON "NotificationJob"("type", "status");

CREATE INDEX IF NOT EXISTS "Notification_userId_type_status_idx" ON "Notification"("userId", "type", "status");
