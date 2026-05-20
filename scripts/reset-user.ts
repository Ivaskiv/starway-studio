import { prisma } from '../backend/src/db/client.js'

type JsonRecord = Record<string, unknown>

function toJsonRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as JsonRecord) }
    : {}
}

async function main() {
  const email = process.argv[2]

  if (!email) {
    console.error('Usage: pnpm exec tsx reset-user.ts email@example.com')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      uiSettings: true,
      settings: true,
    },
  })

  if (!user) {
    console.error(`User not found: ${email}`)
    process.exit(1)
  }

  console.log(`Resetting user: ${user.email}`)

  const ui = toJsonRecord(user.uiSettings)
  const settings = toJsonRecord(user.settings)

// ── Clear AB state ─────────────────────

  delete ui.abTest
  delete ui.dominantBlock
  delete ui.ab_test_progress
  delete ui.bridgeSentAt

  delete settings.bridgeSentAt
  delete settings.hardBridgeSentAt
  delete settings.stateCourseSentAt
  delete settings.leadFollowup3dSentAt
  delete settings.leadFollowup7dSentAt
  delete settings.referralSentAt
  delete settings.behavioralTest

// ── Reset user ─────────────────────

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lifecycleState: 'new',
      testResultType: null,
      onboardingStage: null,
      onboardingStartedAt: null,
      currentStep: 'LINK_TELEGRAM',

      uiSettings: ui as any,
      settings: settings as any,
    },
  })

// ── Delete pending notifications ─────────────────────
// НАЙКРАЩЕ для dev reset

  const deleted = await prisma.notification.deleteMany({
    where: {
      userId: user.id,
      status: 'PENDING',
    },
  })

  console.log('Reset complete')
  console.log(`Deleted notifications: ${deleted.count}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
