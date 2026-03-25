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
  true,
  false,
  540,
  1260,
  'Europe/Kyiv',
  true,
  true,
  true
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
