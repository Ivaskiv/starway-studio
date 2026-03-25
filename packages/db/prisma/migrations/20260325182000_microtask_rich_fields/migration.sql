ALTER TABLE "MicroTask"
  ADD COLUMN IF NOT EXISTS "why" TEXT,
  ADD COLUMN IF NOT EXISTS "steps" JSONB,
  ADD COLUMN IF NOT EXISTS "stepsCompleted" JSONB,
  ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "xpReward" INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS "daysToComplete" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "generatedFromEntryId" TEXT,
  ADD COLUMN IF NOT EXISTS "aiContext" TEXT;

UPDATE "MicroTask"
SET
  "status" = CASE
    WHEN "isCompleted" = true THEN 'done'
    ELSE 'active'
  END,
  "stepsCompleted" = COALESCE("stepsCompleted", '[]'::jsonb),
  "steps" = COALESCE("steps", '[]'::jsonb)
WHERE
  "status" IS NULL
  OR "stepsCompleted" IS NULL
  OR "steps" IS NULL;

CREATE INDEX IF NOT EXISTS "MicroTask_userId_status_idx" ON "MicroTask"("userId", "status");
CREATE INDEX IF NOT EXISTS "MicroTask_dueAt_idx" ON "MicroTask"("dueAt");
