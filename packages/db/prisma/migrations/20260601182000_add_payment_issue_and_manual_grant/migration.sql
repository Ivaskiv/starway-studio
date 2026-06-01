-- Additive payment state machine fields
ALTER TABLE "CheckoutSession"
ADD COLUMN "paymentIssueReportedAt" TIMESTAMP(3);

ALTER TABLE "product_subscriptions"
ADD COLUMN "manuallyGrantedBy" TEXT,
ADD COLUMN "manualGrantNote" TEXT,
ADD COLUMN "paymentIssueCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastPaymentIssueAt" TIMESTAMP(3);
