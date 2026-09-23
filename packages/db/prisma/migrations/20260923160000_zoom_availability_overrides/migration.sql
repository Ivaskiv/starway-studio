CREATE TABLE "ZoomAvailabilityOverride" (
    "id" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Kyiv',
    "windows" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZoomAvailabilityOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ZoomAvailabilityOverride_expertId_date_key" ON "ZoomAvailabilityOverride"("expertId", "date");
CREATE INDEX "ZoomAvailabilityOverride_expertId_date_idx" ON "ZoomAvailabilityOverride"("expertId", "date");

ALTER TABLE "ZoomAvailabilityOverride" ADD CONSTRAINT "ZoomAvailabilityOverride_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
