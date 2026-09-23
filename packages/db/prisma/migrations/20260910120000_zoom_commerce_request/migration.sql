-- CreateEnum
CREATE TYPE "ZoomCommerceKind" AS ENUM ('INDIVIDUAL', 'BATTLE');

-- CreateEnum
CREATE TYPE "ZoomCommerceStatus" AS ENUM ('REQUESTED', 'APPROVED_PENDING_PAYMENT', 'REJECTED', 'PAID', 'EXPIRED');

-- CreateTable
CREATE TABLE "ZoomCommerceRequest" (
    "id" TEXT NOT NULL,
    "kind" "ZoomCommerceKind" NOT NULL,
    "status" "ZoomCommerceStatus" NOT NULL DEFAULT 'REQUESTED',
    "requesterUserId" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "zoomSessionId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "checkoutOrderReference" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZoomCommerceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZoomCommerceRequest_checkoutOrderReference_key" ON "ZoomCommerceRequest"("checkoutOrderReference");

-- CreateIndex
CREATE INDEX "ZoomCommerceRequest_expertId_status_scheduledAt_idx" ON "ZoomCommerceRequest"("expertId", "status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "ZoomCommerceRequest" ADD CONSTRAINT "ZoomCommerceRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A stable coach lock serializes expiry/reapproval; this constraint also prevents accidental double ownership.
CREATE UNIQUE INDEX "ZoomCommerceRequest_individual_active_slot_key"
ON "ZoomCommerceRequest" ("expertId", "scheduledAt")
WHERE "kind" = 'INDIVIDUAL' AND "status" IN ('APPROVED_PENDING_PAYMENT', 'PAID');

ALTER TABLE "ZoomCommerceRequest" ADD CONSTRAINT "ZoomCommerceRequest_amount_check"
CHECK ("amount" > 0 AND ("kind" <> 'INDIVIDUAL' OR ("amount" = 60 AND "currency" = 'EUR')));

-- AddForeignKey
ALTER TABLE "ZoomCommerceRequest" ADD CONSTRAINT "ZoomCommerceRequest_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoomCommerceRequest" ADD CONSTRAINT "ZoomCommerceRequest_zoomSessionId_fkey" FOREIGN KEY ("zoomSessionId") REFERENCES "ZoomSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
