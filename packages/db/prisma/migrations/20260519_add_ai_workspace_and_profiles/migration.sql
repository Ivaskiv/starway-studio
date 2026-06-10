-- CreateTable
CREATE TABLE "AiBehaviorProfile" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemAnchor" TEXT NOT NULL,
    "supportedOutputs" TEXT[],
    "supportedProtocols" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiBehaviorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAiWorkspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "allowedModels" TEXT[] DEFAULT ARRAY['gpt-4o']::TEXT[],
    "maxTokensPerMonth" INTEGER NOT NULL DEFAULT 500000,
    "usedTokensThisMonth" INTEGER NOT NULL DEFAULT 0,
    "activeProfileId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAiWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTooltip" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "elementKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "whatItDoes" TEXT NOT NULL,
    "howToUse" TEXT NOT NULL,

    CONSTRAINT "AiTooltip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesAssistantGeneration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "protocol" TEXT,
    "userContext" TEXT NOT NULL,
    "request" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesAssistantGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiBehaviorProfile_key_key" ON "AiBehaviorProfile"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserAiWorkspace_userId_key" ON "UserAiWorkspace"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiTooltip_profileId_elementKey_key" ON "AiTooltip"("profileId", "elementKey");

-- CreateIndex
CREATE INDEX "SalesAssistantGeneration_workspaceId_createdAt_idx" ON "SalesAssistantGeneration"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesAssistantGeneration_contentType_idx" ON "SalesAssistantGeneration"("contentType");

-- AddForeignKey
ALTER TABLE "UserAiWorkspace" ADD CONSTRAINT "UserAiWorkspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAiWorkspace" ADD CONSTRAINT "UserAiWorkspace_activeProfileId_fkey" FOREIGN KEY ("activeProfileId") REFERENCES "AiBehaviorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTooltip" ADD CONSTRAINT "AiTooltip_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AiBehaviorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAssistantGeneration" ADD CONSTRAINT "SalesAssistantGeneration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "UserAiWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
