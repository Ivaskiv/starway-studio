CREATE TABLE "DailyAnswer" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "questionType" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DailyAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyAnswer_userId_date_questionId_key"
  ON "DailyAnswer"("userId", "date", "questionId");

CREATE INDEX "DailyAnswer_userId_date_idx"
  ON "DailyAnswer"("userId", "date");

ALTER TABLE "DailyAnswer"
  ADD CONSTRAINT "DailyAnswer_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
