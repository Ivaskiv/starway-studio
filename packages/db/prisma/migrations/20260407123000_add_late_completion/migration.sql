DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'DayStatus'
  ) THEN
    CREATE TYPE "DayStatus" AS ENUM (
      'PENDING',
      'IN_PROGRESS',
      'COMPLETED',
      'COMPLETED_LATE',
      'PARTIAL',
      'SKIPPED'
    );
  END IF;
END $$;

ALTER TABLE "DailyEntry"
  ADD COLUMN IF NOT EXISTS "status" "DayStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "lateCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "canCatchUpUntil" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType'
      AND e.enumlabel = 'MISSED_DAY_CATCHUP'
  ) THEN
    RETURN;
  END IF;

  ALTER TYPE "NotificationType" ADD VALUE 'MISSED_DAY_CATCHUP';
END $$;

CREATE INDEX IF NOT EXISTS "DailyEntry_userId_status_idx" ON "DailyEntry"("userId", "status");
