DO $$
BEGIN
    CREATE TYPE "UserState" AS ENUM (
        'NEW',
        'TELEGRAM_LINKED',
        'TRIAL_DAY_1',
        'TRIAL_DAY_2',
        'TRIAL_DAY_3',
        'TRIAL_DAY_4',
        'TRIAL_DAY_5',
        'TRIAL_DAY_6',
        'TRIAL_DAY_7',
        'PAID_ONBOARDING',
        'ACTIVE',
        'INACTIVE'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "UserStep" AS ENUM (
        'NONE',
        'LINK_TELEGRAM',
        'START_FLOW',
        'WHEEL',
        'DAILY_MORNING',
        'DAILY_EVENING',
        'TRIAL_MIRROR',
        'TRIAL_FINAL',
        'PAYWALL'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "currentState" "UserState" NOT NULL DEFAULT 'NEW',
    ADD COLUMN IF NOT EXISTS "currentStep" "UserStep" NOT NULL DEFAULT 'LINK_TELEGRAM',
    ADD COLUMN IF NOT EXISTS "telegramLinkedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "trialStartAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "trialEndAt" TIMESTAMP(3);
