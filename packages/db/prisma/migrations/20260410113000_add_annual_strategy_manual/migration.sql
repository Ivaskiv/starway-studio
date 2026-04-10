CREATE TABLE IF NOT EXISTS "AnnualStrategyMap" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "vision" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AnnualStrategyMap_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AnnualStrategyMap_userId_key"
  ON "AnnualStrategyMap"("userId");

CREATE INDEX IF NOT EXISTS "AnnualStrategyMap_year_idx"
  ON "AnnualStrategyMap"("year");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'AnnualStrategyMap_userId_fkey'
      AND table_name = 'AnnualStrategyMap'
  ) THEN
    ALTER TABLE "AnnualStrategyMap"
      ADD CONSTRAINT "AnnualStrategyMap_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "StrategyGoal" (
  "id" TEXT NOT NULL,
  "mapId" TEXT NOT NULL,
  "sphere" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "monthlyActions" JSONB NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StrategyGoal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StrategyGoal_mapId_priority_idx"
  ON "StrategyGoal"("mapId", "priority");

CREATE INDEX IF NOT EXISTS "StrategyGoal_sphere_idx"
  ON "StrategyGoal"("sphere");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'StrategyGoal_mapId_fkey'
      AND table_name = 'StrategyGoal'
  ) THEN
    ALTER TABLE "StrategyGoal"
      ADD CONSTRAINT "StrategyGoal_mapId_fkey"
      FOREIGN KEY ("mapId") REFERENCES "AnnualStrategyMap"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MonthlyStrategyReview" (
  "id" TEXT NOT NULL,
  "mapId" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "aiAnalysis" TEXT,
  "completedActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "skippedActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "nextStepsByAi" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MonthlyStrategyReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyStrategyReview_mapId_month_year_key"
  ON "MonthlyStrategyReview"("mapId", "month", "year");

CREATE INDEX IF NOT EXISTS "MonthlyStrategyReview_year_month_idx"
  ON "MonthlyStrategyReview"("year", "month");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'MonthlyStrategyReview_mapId_fkey'
      AND table_name = 'MonthlyStrategyReview'
  ) THEN
    ALTER TABLE "MonthlyStrategyReview"
      ADD CONSTRAINT "MonthlyStrategyReview_mapId_fkey"
      FOREIGN KEY ("mapId") REFERENCES "AnnualStrategyMap"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
