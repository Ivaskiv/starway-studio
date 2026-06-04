CREATE TABLE "Note" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'coach_bot',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Note_userId_createdAt_idx"
  ON "Note"("userId", "createdAt");

CREATE INDEX "Note_source_createdAt_idx"
  ON "Note"("source", "createdAt");

ALTER TABLE "Note"
  ADD CONSTRAINT "Note_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ContentPlan" (
  "id" TEXT NOT NULL,
  "expertId" TEXT NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContentPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentPlan_expertId_weekStart_type_key"
  ON "ContentPlan"("expertId", "weekStart", "type");

CREATE INDEX "ContentPlan_expertId_weekStart_idx"
  ON "ContentPlan"("expertId", "weekStart");

CREATE INDEX "ContentPlan_expertId_createdAt_idx"
  ON "ContentPlan"("expertId", "createdAt");

ALTER TABLE "ContentPlan"
  ADD CONSTRAINT "ContentPlan_expertId_fkey"
  FOREIGN KEY ("expertId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
