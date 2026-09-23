ALTER TABLE "ZoomCommerceRequest"
  DROP CONSTRAINT "ZoomCommerceRequest_amount_check";

ALTER TABLE "ZoomCommerceRequest"
  ADD CONSTRAINT "ZoomCommerceRequest_amount_check"
  CHECK ("amount" > 0);
