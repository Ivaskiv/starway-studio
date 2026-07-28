CREATE TYPE "BonusSubscriptionRequestType" AS ENUM ('BONUS_SUBSCRIPTION');

CREATE TYPE "BonusSubscriptionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "bonus_subscription_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BonusSubscriptionRequestType" NOT NULL,
    "campaign" TEXT NOT NULL,
    "status" "BonusSubscriptionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "dedupKey" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bonus_subscription_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bonus_subscription_requests_userId_type_campaign_key"
ON "bonus_subscription_requests"("userId", "type", "campaign");

CREATE INDEX "bonus_subscription_requests_userId_idx"
ON "bonus_subscription_requests"("userId");

CREATE INDEX "bonus_subscription_requests_campaign_status_idx"
ON "bonus_subscription_requests"("campaign", "status");

CREATE INDEX "bonus_subscription_requests_dedupKey_idx"
ON "bonus_subscription_requests"("dedupKey");

ALTER TABLE "bonus_subscription_requests"
ADD CONSTRAINT "bonus_subscription_requests_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bonus_subscription_requests"
ADD CONSTRAINT "bonus_subscription_requests_approvedById_fkey"
FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bonus_subscription_requests"
ADD CONSTRAINT "bonus_subscription_requests_rejectedById_fkey"
FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
