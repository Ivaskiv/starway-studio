CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "intent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MessageLog_userId_timestamp_idx" ON "MessageLog"("userId", "timestamp");
CREATE INDEX "MessageLog_userId_idx" ON "MessageLog"("userId");

ALTER TABLE "MessageLog"
ADD CONSTRAINT "MessageLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
