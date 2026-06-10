-- Phase 3: unify paid zoom swap flow on ZoomSlotSwapRequest
DO $$
BEGIN
  CREATE TYPE "ZoomSwapStatus" AS ENUM (
    'PENDING_PAYMENT',
    'CONFIRMED',
    'CANCELLED',
    'EXPIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "ZoomSwapStatus" ADD VALUE 'PENDING_PAYMENT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "ZoomSwapStatus" ADD VALUE 'CONFIRMED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "ZoomSwapStatus" ADD VALUE 'CANCELLED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "ZoomSwapStatus" ADD VALUE 'EXPIRED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ZoomSlotSwapRequest"
  ALTER COLUMN "sessionIdFrom" DROP NOT NULL;

ALTER TABLE "ZoomSlotSwapRequest"
  ADD COLUMN IF NOT EXISTS "targetSlotId" TEXT,
  ADD COLUMN IF NOT EXISTS "fee" INTEGER NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS "month" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentStatus" "ZoomSwapStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "orderRef" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ZoomSlotSwapRequest_orderRef_key"
  ON "ZoomSlotSwapRequest"("orderRef");

CREATE INDEX IF NOT EXISTS "ZoomSlotSwapRequest_targetSlotId_createdAt_idx"
  ON "ZoomSlotSwapRequest"("targetSlotId", "createdAt");

CREATE INDEX IF NOT EXISTS "ZoomSlotSwapRequest_paymentStatus_createdAt_idx"
  ON "ZoomSlotSwapRequest"("paymentStatus", "createdAt");
