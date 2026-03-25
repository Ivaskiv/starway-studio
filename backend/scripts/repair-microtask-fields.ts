import { prisma } from '../src/db/client.js'

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "MicroTask" ADD COLUMN IF NOT EXISTS "why" TEXT;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "MicroTask" ADD COLUMN IF NOT EXISTS "steps" JSONB;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "MicroTask" ADD COLUMN IF NOT EXISTS "stepsCompleted" JSONB;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "MicroTask" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'medium';
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "MicroTask" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "MicroTask" ADD COLUMN IF NOT EXISTS "xpReward" INTEGER NOT NULL DEFAULT 20;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "MicroTask" ADD COLUMN IF NOT EXISTS "daysToComplete" INTEGER NOT NULL DEFAULT 1;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "MicroTask" ADD COLUMN IF NOT EXISTS "generatedFromEntryId" TEXT;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "MicroTask" ADD COLUMN IF NOT EXISTS "aiContext" TEXT;
  `)

  await prisma.$executeRawUnsafe(`
    UPDATE "MicroTask"
    SET
      "status" = CASE
        WHEN "isCompleted" = true THEN 'done'
        ELSE 'active'
      END,
      "steps" = COALESCE("steps", '[]'::jsonb),
      "stepsCompleted" = COALESCE("stepsCompleted", '[]'::jsonb);
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MicroTask_userId_status_idx" ON "MicroTask"("userId", "status");
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MicroTask_dueAt_idx" ON "MicroTask"("dueAt");
  `)

  console.log('MicroTask fields repaired successfully')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
