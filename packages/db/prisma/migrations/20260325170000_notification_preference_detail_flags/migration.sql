ALTER TABLE "NotificationPreference"
  ADD COLUMN IF NOT EXISTS "dailyMorningEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "dailyEveningEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "levelUpEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "streakRiskEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "streakBrokenEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "subscriptionEnabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "NotificationPreference"
SET
  "dailyMorningEnabled" = COALESCE("dailyMorningEnabled", "aiRemindersEnabled"),
  "dailyEveningEnabled" = COALESCE("dailyEveningEnabled", "aiRemindersEnabled"),
  "levelUpEnabled" = COALESCE("levelUpEnabled", "aiRemindersEnabled"),
  "streakRiskEnabled" = COALESCE("streakRiskEnabled", "streakAlertsEnabled"),
  "streakBrokenEnabled" = COALESCE("streakBrokenEnabled", "streakAlertsEnabled"),
  "subscriptionEnabled" = COALESCE("subscriptionEnabled", true);
