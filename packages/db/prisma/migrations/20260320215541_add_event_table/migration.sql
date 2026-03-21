-- CreateTable
CREATE TABLE "BannerGeneration" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "subheadline" TEXT NOT NULL,
    "ctaText" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BannerGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeepLinkToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "path" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "DeepLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "state" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeepLinkToken_token_key" ON "DeepLinkToken"("token");

-- CreateIndex
CREATE INDEX "DeepLinkToken_userId_createdAt_idx" ON "DeepLinkToken"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DeepLinkToken_token_expiresAt_idx" ON "DeepLinkToken"("token", "expiresAt");

-- CreateIndex
CREATE INDEX "DeepLinkToken_target_createdAt_idx" ON "DeepLinkToken"("target", "createdAt");

-- CreateIndex
CREATE INDEX "Event_userId_createdAt_idx" ON "Event"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Event_type_createdAt_idx" ON "Event"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Event_source_createdAt_idx" ON "Event"("source", "createdAt");

-- CreateIndex
CREATE INDEX "Event_state_createdAt_idx" ON "Event"("state", "createdAt");

-- AddForeignKey
ALTER TABLE "DeepLinkToken" ADD CONSTRAINT "DeepLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
