/*
  Warnings:

  - A unique constraint covering the columns `[chatId]` on the table `TelegramLink` will be added. If there are existing duplicate values, this will fail.
  - Made the column `features` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `TelegramLink` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "features" SET NOT NULL,
ALTER COLUMN "features" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "TelegramLink" ADD COLUMN     "chatId" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "expert_profiles" (
    "id" TEXT NOT NULL,
    "expertId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "specialty" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "expert_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expert_bot_configs" (
    "id" TEXT NOT NULL,
    "expertId" TEXT,
    "productId" TEXT,
    "botToken" TEXT NOT NULL,
    "botUsername" TEXT NOT NULL,
    "botName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expert_bot_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'trial',
    "trialEndsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "amount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expert_profiles_expertId_key" ON "expert_profiles"("expertId");

-- CreateIndex
CREATE UNIQUE INDEX "expert_bot_configs_productId_key" ON "expert_bot_configs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_subscriptions_userId_productId_key" ON "product_subscriptions"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLink_chatId_key" ON "TelegramLink"("chatId");

-- AddForeignKey
ALTER TABLE "expert_profiles" ADD CONSTRAINT "expert_profiles_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_bot_configs" ADD CONSTRAINT "expert_bot_configs_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expert_bot_configs" ADD CONSTRAINT "expert_bot_configs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
