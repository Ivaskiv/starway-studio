-- Repair migration: align User tracking/lifecycle columns with schema.prisma
-- Safe for production: additive only, no data loss.

DO $$
BEGIN
  CREATE TYPE "UserLifecycleState" AS ENUM (
    'NEW_USER',
    'TEST_NOT_STARTED',
    'TEST_IN_PROGRESS',
    'TEST_DONE',
    'OFFER_SHOWN',
    'FOCUS_PAID',
    'ZOOM_MEMBER',
    'POST_ZOOM_1',
    'UPSELL',
    'EXPIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserLifecycleState" ADD VALUE 'NEW_USER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserLifecycleState" ADD VALUE 'TEST_NOT_STARTED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserLifecycleState" ADD VALUE 'TEST_IN_PROGRESS';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserLifecycleState" ADD VALUE 'TEST_DONE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserLifecycleState" ADD VALUE 'OFFER_SHOWN';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserLifecycleState" ADD VALUE 'FOCUS_PAID';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserLifecycleState" ADD VALUE 'ZOOM_MEMBER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserLifecycleState" ADD VALUE 'POST_ZOOM_1';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserLifecycleState" ADD VALUE 'UPSELL';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserLifecycleState" ADD VALUE 'EXPIRED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "lifecycleState" "UserLifecycleState" NOT NULL DEFAULT 'NEW_USER',
  ADD COLUMN IF NOT EXISTS "testStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "testCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "offerShownAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "swapsUsedThisMonth" INTEGER NOT NULL DEFAULT 0;
