-- AlterTable
ALTER TABLE "User" ADD COLUMN "activeRole" "Role" NOT NULL DEFAULT 'USER';

-- Backfill: set activeRole to match existing role for all users
UPDATE "User" SET "activeRole" = "role";
