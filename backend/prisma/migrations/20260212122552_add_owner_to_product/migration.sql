/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `funnels` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `funnels` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `checkType` to the `DecisionCheck` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `funnels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DecisionCheck" ADD COLUMN     "checkType" TEXT NOT NULL,
ADD COLUMN     "comment" TEXT,
ADD COLUMN     "followUpAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "funnels" ADD COLUMN     "code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "ownerId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "five_points_modules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isPremium" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "five_points_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FivePointsLesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "duration" INTEGER,
    "contentUrl" TEXT,

    CONSTRAINT "FivePointsLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FivePointsTask" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "points" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3),

    CONSTRAINT "FivePointsTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "five_points_enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "progressId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "five_points_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "five_points_progress" (
    "id" TEXT NOT NULL,
    "completedLessons" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "five_points_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "five_points_modules_code_key" ON "five_points_modules"("code");

-- CreateIndex
CREATE UNIQUE INDEX "five_points_enrollments_progressId_key" ON "five_points_enrollments"("progressId");

-- CreateIndex
CREATE UNIQUE INDEX "five_points_enrollments_userId_moduleId_key" ON "five_points_enrollments"("userId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "funnels_code_key" ON "funnels"("code");

-- CreateIndex
CREATE UNIQUE INDEX "funnels_name_key" ON "funnels"("name");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FivePointsLesson" ADD CONSTRAINT "FivePointsLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "five_points_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FivePointsTask" ADD CONSTRAINT "FivePointsTask_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "FivePointsLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "five_points_enrollments" ADD CONSTRAINT "five_points_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "five_points_enrollments" ADD CONSTRAINT "five_points_enrollments_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "five_points_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "five_points_enrollments" ADD CONSTRAINT "five_points_enrollments_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "five_points_progress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
