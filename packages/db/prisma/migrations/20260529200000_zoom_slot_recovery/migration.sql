-- Recovery migration: create missing Zoom scheduling tables in environments
-- where migration history is marked applied but physical tables are absent.

DO $$
BEGIN
  CREATE TYPE "ZoomSlotStatus" AS ENUM (
    'OPEN',
    'CLOSED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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

CREATE TABLE IF NOT EXISTS "ZoomSlot" (
  "id" TEXT NOT NULL,
  "coachId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "hour" INTEGER NOT NULL,
  "status" "ZoomSlotStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ZoomSlot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ZoomSlot_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ZoomSlot_coachId_date_hour_key"
  ON "ZoomSlot"("coachId", "date", "hour");

CREATE INDEX IF NOT EXISTS "ZoomSlot_coachId_date_idx"
  ON "ZoomSlot"("coachId", "date");

CREATE INDEX IF NOT EXISTS "ZoomSlot_status_date_idx"
  ON "ZoomSlot"("status", "date");

CREATE TABLE IF NOT EXISTS "ZoomSwap" (
  "id" TEXT NOT NULL,
  "initiatorId" TEXT NOT NULL,
  "targetSlotId" TEXT NOT NULL,
  "fee" INTEGER NOT NULL DEFAULT 75,
  "status" "ZoomSwapStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "month" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  "orderRef" TEXT,
  CONSTRAINT "ZoomSwap_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ZoomSwap_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ZoomSwap_targetSlotId_fkey" FOREIGN KEY ("targetSlotId") REFERENCES "ZoomSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ZoomSwap_orderRef_key"
  ON "ZoomSwap"("orderRef");

CREATE INDEX IF NOT EXISTS "ZoomSwap_initiatorId_createdAt_idx"
  ON "ZoomSwap"("initiatorId", "createdAt");

CREATE INDEX IF NOT EXISTS "ZoomSwap_targetSlotId_createdAt_idx"
  ON "ZoomSwap"("targetSlotId", "createdAt");

CREATE INDEX IF NOT EXISTS "ZoomSwap_status_createdAt_idx"
  ON "ZoomSwap"("status", "createdAt");

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
