-- CreateTable
CREATE TABLE "MentorQuestionSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "morning" JSONB NOT NULL DEFAULT '[]',
    "evening" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorQuestionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamificationProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bitMind" INTEGER NOT NULL DEFAULT 0,
    "mindXP" INTEGER NOT NULL DEFAULT 0,
    "neuroGems" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamificationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MentorQuestionSet_isActive_idx" ON "MentorQuestionSet"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GamificationProfile_userId_key" ON "GamificationProfile"("userId");

-- CreateIndex
CREATE INDEX "GamificationProfile_mindXP_idx" ON "GamificationProfile"("mindXP");

-- CreateIndex
CREATE INDEX "GamificationProfile_level_idx" ON "GamificationProfile"("level");

-- AddForeignKey
ALTER TABLE "GamificationProfile" ADD CONSTRAINT "GamificationProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
