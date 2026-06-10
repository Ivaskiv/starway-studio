-- Add new notification types used by AB-system and lifecycle follow-up flows.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INSTAGRAM_ARRIVAL_2H';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INSTAGRAM_ARRIVAL_24H';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INSTAGRAM_ARRIVAL_72H';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TEST_DROPOUT_1H';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TEST_DROPOUT_24H';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TEST_DROPOUT_72H';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRE_ZOOM_24H';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRE_ZOOM_2H';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_EXPIRING_7D';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_EXPIRING_3D';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_EXPIRING_1D';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AI_UPGRADE_BRIDGE';

-- Backfill Telegram link timestamps for already-linked users.
UPDATE "User" AS u
SET "telegramLinkedAt" = COALESCE(u."telegramLinkedAt", u."updatedAt", u."createdAt", NOW())
WHERE u."telegramLinkedAt" IS NULL
  AND (
    u."telegramUserId" IS NOT NULL
    OR u."telegramChatId" IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM "TelegramLink" tl
      WHERE tl."userId" = u."id"
        AND tl."isActive" = TRUE
    )
  );
