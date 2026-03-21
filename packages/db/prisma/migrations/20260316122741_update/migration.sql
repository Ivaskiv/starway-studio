-- AlterEnum
DO $$ BEGIN
  CREATE TYPE "DailyChoice_new" AS ENUM ('CONFIRMED_OLD', 'CHOSE_NEW', 'PENDING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "public"."DailyCycleLog" ALTER COLUMN "choice" DROP DEFAULT;
ALTER TABLE "public"."DailyEntry" ALTER COLUMN "choice" DROP DEFAULT;

ALTER TABLE "DailyEntry" ALTER COLUMN "choice" TYPE "DailyChoice_new" USING ("choice"::text::"DailyChoice_new");
ALTER TABLE "DailyCycleLog" ALTER COLUMN "choice" TYPE "DailyChoice_new" USING ("choice"::text::"DailyChoice_new");

DO $$ BEGIN
  ALTER TYPE "DailyChoice" RENAME TO "DailyChoice_old";
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "DailyChoice_new" RENAME TO "DailyChoice";
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP TYPE "public"."DailyChoice_old";
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE "DailyCycleLog" ALTER COLUMN "choice" SET DEFAULT 'CONFIRMED_OLD';
ALTER TABLE "DailyEntry" ALTER COLUMN "choice" SET DEFAULT 'CONFIRMED_OLD';

-- AlterEnum
DO $$ BEGIN
  CREATE TYPE "DailyDrain_new" AS ENUM ('DOUBT', 'PROCRASTINATION', 'EMOTIONAL_DRAIN', 'EXTERNAL_PRESSURE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "DailyEntry" ALTER COLUMN "drain" TYPE "DailyDrain_new" USING ("drain"::text::"DailyDrain_new");
ALTER TABLE "DailyCycleLog" ALTER COLUMN "drain" TYPE "DailyDrain_new" USING ("drain"::text::"DailyDrain_new");

DO $$ BEGIN
  ALTER TYPE "DailyDrain" RENAME TO "DailyDrain_old";
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "DailyDrain_new" RENAME TO "DailyDrain";
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP TYPE "public"."DailyDrain_old";
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- AlterEnum
DO $$ BEGIN
  CREATE TYPE "DailyState_new" AS ENUM ('TENSION', 'FEAR', 'STABILITY', 'INNER_SUPPORT', 'NEUTRAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "public"."DailyCycleLog" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "public"."DailyEntry" ALTER COLUMN "state" DROP DEFAULT;

ALTER TABLE "DailyEntry" ALTER COLUMN "state" TYPE "DailyState_new" USING ("state"::text::"DailyState_new");
ALTER TABLE "DailyCycleLog" ALTER COLUMN "state" TYPE "DailyState_new" USING ("state"::text::"DailyState_new");

DO $$ BEGIN
  ALTER TYPE "DailyState" RENAME TO "DailyState_old";
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "DailyState_new" RENAME TO "DailyState";
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  DROP TYPE "public"."DailyState_old";
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE "DailyCycleLog" ALTER COLUMN "state" SET DEFAULT 'STABILITY';
ALTER TABLE "DailyEntry" ALTER COLUMN "state" SET DEFAULT 'STABILITY';

-- DropIndex
DROP INDEX IF EXISTS "MicroTask_dueDate_idx";
DROP INDEX IF EXISTS "MicroTask_expertId_userId_idx";
DROP INDEX IF EXISTS "MicroTask_userId_status_idx";

-- AlterTable DailyCycleLog
ALTER TABLE "DailyCycleLog"
  ALTER COLUMN "state" SET DEFAULT 'STABILITY',
  ALTER COLUMN "choice" SET DEFAULT 'CONFIRMED_OLD';

-- AlterTable DailyEntry
ALTER TABLE "DailyEntry"
  ALTER COLUMN "state" SET DEFAULT 'STABILITY',
  ALTER COLUMN "choice" SET DEFAULT 'CONFIRMED_OLD';

-- AlterTable MicroTask — drop old columns if they exist, add new ones if they don't
DO $$ BEGIN ALTER TABLE "MicroTask" DROP COLUMN "dueDate";      EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MicroTask" DROP COLUMN "linkedQuestionId"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MicroTask" DROP COLUMN "metadata";     EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MicroTask" DROP COLUMN "reason";       EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MicroTask" DROP COLUMN "source";       EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MicroTask" DROP COLUMN "status";       EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "MicroTask" DROP COLUMN "taskDetails";  EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE "MicroTask"
  ADD COLUMN IF NOT EXISTS "dueAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sphere"      TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MicroTask_userId_idx"            ON "MicroTask"("userId");
CREATE INDEX IF NOT EXISTS "MicroTask_userId_isCompleted_idx" ON "MicroTask"("userId", "isCompleted");