import { prisma } from '../../../db/client.js'

const EMAIL = 'teachinform3@gmail.com'

async function wipe() {
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true },
  })

  if (!user) {
    console.error('User not found:', EMAIL)
    process.exit(1)
  }

  const id = user.id
  console.log('Wiping user:', id)

  // 1. Clear all uiSettings and settings
  await prisma.user.update({
    where: { id },
    data: {
      testResultType: null,
      onboardingStartedAt: null,
      currentStep: 'LINK_TELEGRAM',
      funnelStage: 'LEAD',
      funnelUpdatedAt: null,
      leadMagnetSentAt: null,
      settings: {},
    },
  })
  console.log('✅ User fields reset')

  // 2. Clear pending notifications
  try {
    // Delete instead of cancel since CANCELLED is not in enum
    const deleted = await prisma.notification.deleteMany({
      where: { userId: id, status: 'PENDING' },
    })
    console.log('✅ Pending notifications removed:', deleted.count)
  } catch (e) {
    console.warn('⚠️  Could not clear notifications — skip')
  }

  // 3. Delete AB test events
  try {
    const deleted = await prisma.event.deleteMany({
      where: {
        userId: id,
        type: {
          in: [
            'AB_TEST_STARTED',
            'AB_TEST_COMPLETED',
            'AB_TEST_RESULT_OPENED',
            'AB_TEST_QUESTION_ANSWERED',
            'AB_TEST_FOLLOWUP_SCHEDULED',
            'AB_TEST_CTA_INTERACTION',
            'AB_TEST_PAYMENT_SUCCESS',
            'AB_TEST_QUESTION_OPENED',
            'AB_TEST_REOPENED',
            'AB_TEST_STALE_CALLBACK_REJECTED',
            'AB_TEST_REPLAY_REJECTED',
          ],
        },
      },
    })
    console.log('✅ Events deleted:', deleted.count)
  } catch {
    console.warn('⚠️  Events table skip')
  }

  // 4. Delete product subscriptions
  try {
    const deleted = await prisma.productSubscription.deleteMany({
      where: { userId: id },
    })
    console.log('✅ ProductSubscriptions deleted:', deleted.count)
  } catch {
    console.warn('⚠️  ProductSubscription skip')
  }

  // 5. Delete payment logs
  try {
    const deleted = await prisma.paymentLog.deleteMany({
      where: { userId: id },
    })
    console.log('✅ PaymentLogs deleted:', deleted.count)
  } catch {
    console.warn('⚠️  PaymentLog skip')
  }

  // 6. Verify final state
  const final = await prisma.user.findUnique({
    where: { id },
    select: {
      testResultType: true,
      currentStep: true,
      settings: true,
    },
  })
  console.log('\n=== FINAL STATE ===')
  console.log(JSON.stringify(final, null, 2))
  console.log('\n✅ Wipe complete. Restart backend → send /start in bot.')

  await prisma.$disconnect()
}

wipe().catch((err) => {
  console.error('Fatal error during wipe:', err)
  process.exit(1)
})
