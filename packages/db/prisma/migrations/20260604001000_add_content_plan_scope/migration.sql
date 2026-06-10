-- Add scope and period bounds for weekly/monthly content plans
ALTER TABLE "ContentPlan"
ADD COLUMN "planScope" TEXT NOT NULL DEFAULT 'WEEKLY',
ADD COLUMN "periodStart" TIMESTAMP(3),
ADD COLUMN "periodEnd" TIMESTAMP(3);
