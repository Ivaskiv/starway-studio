-- FINAL USER LEGACY DROP MIGRATION (GUARDED)
-- Preconditions:
-- 1) Runtime reads from legacy columns are removed (audit == 0).
-- 2) USER_LIFECYCLE_STRICT_MODE=true has been validated in staging.
-- 3) Backfill has been executed and verified.

DO $$
DECLARE
  users_with_legacy_name bigint;
  users_with_legacy_ui_settings bigint;
  users_with_legacy_onboarding_stage bigint;
BEGIN
  SELECT COUNT(*) INTO users_with_legacy_name
  FROM "User"
  WHERE "name" IS NOT NULL AND btrim("name") <> '';

  SELECT COUNT(*) INTO users_with_legacy_ui_settings
  FROM "User"
  WHERE "uiSettings" IS NOT NULL;

  SELECT COUNT(*) INTO users_with_legacy_onboarding_stage
  FROM "User"
  WHERE "onboardingStage" IS NOT NULL;

  IF users_with_legacy_name > 0 THEN
    RAISE EXCEPTION 'Preflight failed: User.name still populated (% rows)', users_with_legacy_name;
  END IF;
  IF users_with_legacy_ui_settings > 0 THEN
    RAISE EXCEPTION 'Preflight failed: User.uiSettings still populated (% rows)', users_with_legacy_ui_settings;
  END IF;
  IF users_with_legacy_onboarding_stage > 0 THEN
    RAISE EXCEPTION 'Preflight failed: User.onboardingStage still populated (% rows)', users_with_legacy_onboarding_stage;
  END IF;
END $$;

ALTER TABLE "User" DROP COLUMN IF EXISTS "name";
ALTER TABLE "User" DROP COLUMN IF EXISTS "uiSettings";
ALTER TABLE "User" DROP COLUMN IF EXISTS "onboardingStage";
ALTER TABLE "User" DROP COLUMN IF EXISTS "lifecycleState";
