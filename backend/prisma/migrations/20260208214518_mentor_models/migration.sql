-- AlterTable
ALTER TABLE "Mentor" ADD COLUMN     "chatContext" JSONB,
ADD COLUMN     "config" JSONB,
ADD COLUMN     "contextMeta" JSONB;
