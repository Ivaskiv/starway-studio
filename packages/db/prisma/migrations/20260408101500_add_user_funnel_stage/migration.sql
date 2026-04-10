-- Add persisted funnel stage on users to avoid lifecycle drift across cron/bot/web
CREATE TYPE "UserFunnelStage" AS ENUM ('ANONYMOUS', 'LEAD', 'TRIAL', 'PAID', 'CHURNED');

ALTER TABLE "User"
  ADD COLUMN "funnelStage" "UserFunnelStage" NOT NULL DEFAULT 'LEAD',
  ADD COLUMN "funnelUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "leadMagnetSentAt" TIMESTAMP(3);

CREATE INDEX "User_funnelStage_idx" ON "User"("funnelStage");
