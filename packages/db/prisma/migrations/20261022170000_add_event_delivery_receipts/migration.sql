-- Recipient-level, fenced delivery records for durable business Events.
-- Existing Event rows remain untouched; only future expiry Events create rows.
CREATE TYPE "EventDeliveryRecipient" AS ENUM ('USER', 'COACH', 'OPS');
CREATE TYPE "EventDeliveryState" AS ENUM ('PENDING', 'SENDING', 'DELIVERED', 'UNKNOWN', 'SKIPPED');

CREATE TABLE "EventDelivery" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "recipient" "EventDeliveryRecipient" NOT NULL,
  "state" "EventDeliveryState" NOT NULL DEFAULT 'PENDING',
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "attemptStartedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "telegramMessageId" TEXT,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventDelivery_eventId_recipient_key" ON "EventDelivery"("eventId", "recipient");
CREATE INDEX "EventDelivery_state_leaseExpiresAt_idx" ON "EventDelivery"("state", "leaseExpiresAt");
ALTER TABLE "EventDelivery" ADD CONSTRAINT "EventDelivery_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
