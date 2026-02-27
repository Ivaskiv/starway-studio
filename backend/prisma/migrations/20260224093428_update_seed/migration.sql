-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_expertId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "expertId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "Expert"("id") ON DELETE SET NULL ON UPDATE CASCADE;
