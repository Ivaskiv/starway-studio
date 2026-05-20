import { prisma } from '../backend/src/db/client.js'

async function resetAbTest(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      lifecycleState: true,
      testResultType: true,
      uiSettings: true,
      settings: true,
    },
  })

  if (!user) {
    console.error(`User not found: ${email}`)
    process.exit(1)
  }

  console.log('BEFORE:', JSON.stringify(user, null, 2))

  const existingUiSettings =
    user.uiSettings &&
    typeof user.uiSettings === 'object' &&
    !Array.isArray(user.uiSettings)
      ? { ...(user.uiSettings as Record<string, unknown>) }
      : {}

  const nextUiSettings: Record<string, unknown> = {
    ...existingUiSettings,
    ab_test_progress: null,
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lifecycleState: 'new',
      testResultType: null,
      uiSettings: nextUiSettings as any,
    },
  })

  const cancelledFollowup = await prisma.notification.updateMany({
    where: {
      userId: user.id,
      status: 'PENDING',
      templateKey: 'AB_TEST_FOLLOWUP',
    },
    data: {
      status: 'FAILED',
      failureReason: 'Cancelled by reset-ab-test script',
    },
  })

  const cancelledDojim = await prisma.notification.updateMany({
    where: {
      userId: user.id,
      status: 'PENDING',
      payload: {
        path: ['flow_timer_id'],
        string_starts_with: 'RESULT_DOJIM',
      },
    },
    data: {
      status: 'FAILED',
      failureReason: 'Cancelled by reset-ab-test script',
    },
  })

  const after = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      lifecycleState: true,
      testResultType: true,
      uiSettings: true,
    },
  })

  const pendingFollowups = await prisma.notification.count({
    where: {
      userId: user.id,
      status: 'PENDING',
      templateKey: 'AB_TEST_FOLLOWUP',
    },
  })

  console.log('AFTER:', JSON.stringify(after, null, 2))
  console.log(
    JSON.stringify(
      {
        cancelledFollowup: cancelledFollowup.count,
        cancelledDojim: cancelledDojim.count,
        pendingFollowups,
      },
      null,
      2
    )
  )

  await prisma.$disconnect()
}

resetAbTest('teachinform3@gmail.com').catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
