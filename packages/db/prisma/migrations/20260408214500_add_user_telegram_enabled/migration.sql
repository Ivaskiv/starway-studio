-- Additive user-level Telegram enhancement flag.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "telegramEnabled" BOOLEAN NOT NULL DEFAULT true;
