CREATE TABLE IF NOT EXISTS "ZoomChannelPost" (
  "id" TEXT NOT NULL,
  "messageId" INTEGER NOT NULL,
  "chatId" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ZoomChannelPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ZoomChannelPost_messageId_key"
  ON "ZoomChannelPost"("messageId");
