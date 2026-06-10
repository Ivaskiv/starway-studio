CREATE TABLE "UserCreationAudit" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "payloadSummary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserCreationAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserCreationAudit_userId_createdAt_idx"
  ON "UserCreationAudit"("userId", "createdAt");

CREATE INDEX "UserCreationAudit_source_createdAt_idx"
  ON "UserCreationAudit"("source", "createdAt");

ALTER TABLE "UserCreationAudit"
  ADD CONSTRAINT "UserCreationAudit_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
