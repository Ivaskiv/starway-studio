DO $$ BEGIN
CREATE TYPE "PipelineStatus" AS ENUM (
  'PENDING',
  'GENERATING',
  'AWAITING_CHOICE',
  'PRODUCING',
  'PREVIEW_SENT',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED',
  'CANCELLED'
);
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ContentPipeline" (
  "id" TEXT NOT NULL,
  "inputType" TEXT NOT NULL,
  "inputText" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "variantA" JSONB,
  "variantB" JSONB,
  "variantC" JSONB,
  "selectedVariant" TEXT,
  "videoUrl" TEXT,
  "audioUrl" TEXT,
  "videoScenes" JSONB,
  "status" "PipelineStatus" NOT NULL DEFAULT 'PENDING',
  "instagramPostId" TEXT,
  "telegramMessageId" INTEGER,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT NOT NULL,
  CONSTRAINT "ContentPipeline_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ContentPipeline_status_createdAt_idx"
ON "ContentPipeline"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "ContentPipeline_createdBy_createdAt_idx"
ON "ContentPipeline"("createdBy", "createdAt");
