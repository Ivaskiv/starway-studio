import { prisma } from '../backend/src/db/client.js'

async function main() {
  await prisma.$executeRawUnsafe(`
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
  `)

  await prisma.$executeRawUnsafe(`
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
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Notification"
      ADD COLUMN IF NOT EXISTS "type" "NotificationType",
      ADD COLUMN IF NOT EXISTS "title" TEXT,
      ADD COLUMN IF NOT EXISTS "body" TEXT,
      ADD COLUMN IF NOT EXISTS "data" JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
  `)

  await prisma.$executeRawUnsafe(`
    UPDATE "Notification"
    SET
      "type" = CASE
        WHEN "templateKey" = 'daily_morning' THEN 'DAILY_MORNING'::"NotificationType"
        WHEN "templateKey" = 'daily_evening' THEN 'DAILY_EVENING'::"NotificationType"
        WHEN "templateKey" IN ('streak_alert', 'streak_broken') THEN 'STREAK_ALERT'::"NotificationType"
        WHEN "templateKey" LIKE 'level_up%' OR "templateKey" LIKE 'near_level%' THEN 'LEVEL_UP'::"NotificationType"
        WHEN "templateKey" = 'weekly_summary' THEN 'WEEKLY_SUMMARY'::"NotificationType"
        WHEN "templateKey" LIKE 'microtask_%' OR "templateKey" LIKE 'task_completed_%' OR "templateKey" = 'ai_reminder' THEN 'AI_REMINDER'::"NotificationType"
        ELSE 'SUBSCRIPTION'::"NotificationType"
      END,
      "title" = COALESCE("title", "templateKey"),
      "body" = COALESCE("body", ''),
      "data" = COALESCE("data", "payload")
    WHERE "type" IS NULL OR "title" IS NULL OR "body" IS NULL OR "data" IS NULL;
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Notification_userId_type_status_idx" ON "Notification"("userId", "type", "status");
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "NotificationPreference" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "telegramEnabled" BOOLEAN NOT NULL DEFAULT true,
      "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
      "dailyMorningTime" INTEGER NOT NULL DEFAULT 540,
      "dailyEveningTime" INTEGER NOT NULL DEFAULT 1260,
      "timezone" TEXT NOT NULL DEFAULT 'Europe/Kyiv',
      "dailyMorningEnabled" BOOLEAN NOT NULL DEFAULT true,
      "dailyEveningEnabled" BOOLEAN NOT NULL DEFAULT true,
      "levelUpEnabled" BOOLEAN NOT NULL DEFAULT true,
      "streakRiskEnabled" BOOLEAN NOT NULL DEFAULT true,
      "streakBrokenEnabled" BOOLEAN NOT NULL DEFAULT true,
      "streakAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
      "weeklySummaryEnabled" BOOLEAN NOT NULL DEFAULT true,
      "subscriptionEnabled" BOOLEAN NOT NULL DEFAULT true,
      "aiRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "NotificationPreference_timezone_idx" ON "NotificationPreference"("timezone");
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "dailyMorningEnabled" BOOLEAN NOT NULL DEFAULT true;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "dailyEveningEnabled" BOOLEAN NOT NULL DEFAULT true;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "levelUpEnabled" BOOLEAN NOT NULL DEFAULT true;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "streakRiskEnabled" BOOLEAN NOT NULL DEFAULT true;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "streakBrokenEnabled" BOOLEAN NOT NULL DEFAULT true;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "subscriptionEnabled" BOOLEAN NOT NULL DEFAULT true;
  `)

  await prisma.$executeRawUnsafe(`
    INSERT INTO "NotificationPreference" (
      "id",
      "userId",
      "telegramEnabled",
      "emailEnabled",
      "dailyMorningTime",
      "dailyEveningTime",
      "timezone",
      "dailyMorningEnabled",
      "dailyEveningEnabled",
      "levelUpEnabled",
      "streakRiskEnabled",
      "streakBrokenEnabled",
      "streakAlertsEnabled",
      "weeklySummaryEnabled",
      "subscriptionEnabled",
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
      true,
      true,
      true,
      true,
      true,
      true,
      true
    FROM "User" u
    WHERE NOT EXISTS (
      SELECT 1 FROM "NotificationPreference" np WHERE np."userId" = u."id"
    );
  `)

  await prisma.$executeRawUnsafe(`
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
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "NotificationJob_status_runAt_idx" ON "NotificationJob"("status", "runAt");
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "NotificationJob_type_status_idx" ON "NotificationJob"("type", "status");
  `)

  console.log('Notification, NotificationPreference and NotificationJob repaired successfully')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
