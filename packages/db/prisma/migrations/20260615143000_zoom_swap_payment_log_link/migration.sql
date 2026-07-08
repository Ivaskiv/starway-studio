ALTER TABLE "ZoomSlotSwapRequest"
ADD COLUMN "paymentLogId" TEXT;

ALTER TABLE "ZoomSlotSwapRequest"
ADD CONSTRAINT "ZoomSlotSwapRequest_paymentLogId_fkey"
FOREIGN KEY ("paymentLogId")
REFERENCES "PaymentLog"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "ZoomSlotSwapRequest_paymentLogId_idx"
ON "ZoomSlotSwapRequest"("paymentLogId");
