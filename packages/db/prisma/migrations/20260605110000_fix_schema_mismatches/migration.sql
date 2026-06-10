-- Align ZoomSession table with current Prisma schema.
ALTER TABLE "ZoomSession"
  ADD COLUMN IF NOT EXISTS "type" "ZoomSessionType" NOT NULL DEFAULT 'GROUP';
