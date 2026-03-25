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
    WHEN "templateKey" LIKE 'level_up%' OR "templateKey" LIKE 'near_level%' THEN 'LEVEL_UP'::"NotificationType"
    WHEN "templateKey" = 'weekly_summary' THEN 'WEEKLY_SUMMARY'::"NotificationType"
    WHEN "templateKey" LIKE 'microtask_%' OR "templateKey" LIKE 'task_completed_%' OR "templateKey" = 'ai_reminder' THEN 'AI_REMINDER'::"NotificationType"
    ELSE 'SUBSCRIPTION'::"NotificationType"
  END,
  "title" = COALESCE("title", "templateKey"),
  "body" = COALESCE("body", ''),
  "data" = COALESCE("data", "payload")
WHERE "type" IS NULL OR "title" IS NULL OR "body" IS NULL OR "data" IS NULL;

CREATE INDEX IF NOT EXISTS "Notification_userId_type_status_idx" ON "Notification"("userId", "type", "status");
