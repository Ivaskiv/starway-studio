DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SwapStatus') THEN
    CREATE TYPE "SwapStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ZoomSlotSwapRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "targetUserId" TEXT,
  "sessionIdFrom" TEXT NOT NULL,
  "sessionIdTo" TEXT,
  "status" "SwapStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "ZoomSlotSwapRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ZoomSlotSwapRequest_requesterId_idx"
  ON "ZoomSlotSwapRequest"("requesterId");

CREATE INDEX IF NOT EXISTS "ZoomSlotSwapRequest_sessionIdFrom_idx"
  ON "ZoomSlotSwapRequest"("sessionIdFrom");

CREATE INDEX IF NOT EXISTS "ZoomSlotSwapRequest_status_expiresAt_idx"
  ON "ZoomSlotSwapRequest"("status", "expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ZoomSlotSwapRequest_requesterId_fkey'
  ) THEN
    ALTER TABLE "ZoomSlotSwapRequest"
      ADD CONSTRAINT "ZoomSlotSwapRequest_requesterId_fkey"
      FOREIGN KEY ("requesterId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ZoomSlotSwapRequest_sessionIdFrom_fkey'
  ) THEN
    ALTER TABLE "ZoomSlotSwapRequest"
      ADD CONSTRAINT "ZoomSlotSwapRequest_sessionIdFrom_fkey"
      FOREIGN KEY ("sessionIdFrom") REFERENCES "ZoomSession"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
