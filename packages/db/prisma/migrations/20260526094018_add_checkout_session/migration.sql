CREATE TYPE "CheckoutSessionStatus" AS ENUM (
  'CREATED',
  'OPENED',
  'PROCESSING',
  'COMPLETED',
  'EXPIRED',
  'INVALIDATED'
);

CREATE TABLE "CheckoutSession" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderReference" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'UAH',
  "productCode" TEXT NOT NULL,
  "status" "CheckoutSessionStatus" NOT NULL DEFAULT 'CREATED',
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "openedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "invalidatedAt" TIMESTAMP(3),
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "lastOpenedAt" TIMESTAMP(3),

  CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CheckoutSession_token_key" ON "CheckoutSession"("token");
CREATE INDEX "CheckoutSession_userId_createdAt_idx" ON "CheckoutSession"("userId", "createdAt");
CREATE INDEX "CheckoutSession_status_expiresAt_idx" ON "CheckoutSession"("status", "expiresAt");
CREATE INDEX "CheckoutSession_orderReference_idx" ON "CheckoutSession"("orderReference");

ALTER TABLE "CheckoutSession"
ADD CONSTRAINT "CheckoutSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
