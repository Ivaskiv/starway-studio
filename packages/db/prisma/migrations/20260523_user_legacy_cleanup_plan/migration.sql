-- SAFE PLAN MIGRATION (MANUAL GATE)
-- This migration is intentionally non-destructive by default.
-- Apply DROP statements only after code audit is fully clean.

-- 1) Verification snapshot
-- SELECT
--   COUNT(*)                                                     AS users_total,
--   COUNT(*) FILTER (WHERE "name" IS NOT NULL AND btrim("name") <> '') AS users_with_legacy_name,
--   COUNT(*) FILTER (WHERE "uiSettings" IS NOT NULL)            AS users_with_legacy_ui_settings,
--   COUNT(*) FILTER (WHERE "onboardingStage" IS NOT NULL)       AS users_with_legacy_onboarding_stage,
--   COUNT(*) FILTER (WHERE "lifecycleState" IS NOT NULL)        AS users_with_legacy_lifecycle_state
-- FROM "User";

-- 2) Keep table unchanged in this migration.
SELECT 1;

-- 3) FINAL CLEANUP (uncomment only after full rollout and runtime verification)
-- ALTER TABLE "User" DROP COLUMN "name";
-- ALTER TABLE "User" DROP COLUMN "uiSettings";
-- ALTER TABLE "User" DROP COLUMN "onboardingStage";
-- ALTER TABLE "User" DROP COLUMN "lifecycleState";
