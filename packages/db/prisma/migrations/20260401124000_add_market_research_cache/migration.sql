CREATE TABLE "MarketResearchCache" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "niche" TEXT NOT NULL DEFAULT 'coaching_personal_dev',
  "platform" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3) NOT NULL,
  "promptUsed" TEXT,
  "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',

  CONSTRAINT "MarketResearchCache_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketResearchCache_type_platform_idx" ON "MarketResearchCache"("type", "platform");
CREATE INDEX "MarketResearchCache_validUntil_idx" ON "MarketResearchCache"("validUntil");
