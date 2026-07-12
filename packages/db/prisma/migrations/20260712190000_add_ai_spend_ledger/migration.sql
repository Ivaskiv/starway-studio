CREATE TABLE "ai_spend_ledger" (
    "id" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "spentUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "dailyCapUsd" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_spend_ledger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_spend_ledger_jobKey_periodStart_key" ON "ai_spend_ledger"("jobKey", "periodStart");
