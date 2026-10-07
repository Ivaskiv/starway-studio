import { parse as parseEnv } from 'dotenv'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const env = parseEnv(readFileSync(resolve(process.cwd(), '.env')))

for (const [key, value] of Object.entries(env)) {
  process.env[key] = value
}

const { prisma } = await import('../db/client.js')

function describeDatabaseTarget(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return { configured: false, host: 'missing', port: 'missing' }
  }

  const parsed = new URL(databaseUrl)
  return {
    configured: true,
    host: parsed.hostname,
    port: parsed.port || '5432',
  }
}

const CANONICAL_COACH_TELEGRAM_ID = '7469228524'
const LOCAL_COACH_TELEGRAM_ID = '630111093'
const AVAILABILITY_OVERRIDE_MIGRATION = '20260923160000_zoom_availability_overrides'

async function main() {
  await prisma.$queryRaw`SELECT 1`

  const [canonicalCoach, localCoach, migrations] = await Promise.all([
    prisma.user.findFirst({
      where: { telegramUserId: CANONICAL_COACH_TELEGRAM_ID },
      select: { id: true, expertId: true },
    }),
    prisma.user.findFirst({
      where: { telegramUserId: LOCAL_COACH_TELEGRAM_ID },
      select: { id: true, expertId: true },
    }),
    prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM "_prisma_migrations"
    `,
  ])

  const canonicalExpert = canonicalCoach?.expertId
    ? await prisma.expert.findUnique({
        where: { id: canonicalCoach.expertId },
        select: {
          id: true,
          zoomAvailability: true,
          _count: { select: { zoomAvailabilityOverrides: true, zoomSessions: true } },
        },
      })
    : null

  console.log(JSON.stringify({
    connected: true,
    database: describeDatabaseTarget(process.env.DATABASE_URL?.trim()),
    canonicalCoach: canonicalCoach ?? null,
    localCoach: localCoach ?? null,
    canonicalExpert: canonicalExpert
      ? {
          id: canonicalExpert.id,
          hasRecurringAvailability: Object.keys(canonicalExpert.zoomAvailability ?? {}).length > 0,
          availabilityOverrideCount: canonicalExpert._count.zoomAvailabilityOverrides,
          zoomSessionCount: canonicalExpert._count.zoomSessions,
        }
      : null,
    requiredMigrationApplied: migrations.some(
      ({ migration_name }) => migration_name === AVAILABILITY_OVERRIDE_MIGRATION,
    ),
  }, null, 2))
}

main()
  .catch((error) => {
    console.error('[canonical-db-verify] failed', error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
