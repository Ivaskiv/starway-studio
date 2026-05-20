/// <reference types="node" />
import { prisma } from '../backend/src/db/client.js'

const TELEGRAM_USERNAME = 'vira_333'
const TELEGRAM_USER_ID = '630111093'
const TELEGRAM_CHAT_ID = '630111093'

async function resetGuestUser(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lifecycleState: 'new',
      testResultType: null,
      onboardingStage: null,
      currentStep: 'LINK_TELEGRAM',
      uiSettings: {},
      settings: {},
    },
  })
  console.log(`✅ Reset done for userId: ${userId}`)
  console.log('   lifecycleState → new')
  console.log('   uiSettings → {}')
  console.log('   testResultType → null')
  console.log('')
  console.log('→ Restart backend, then /start in bot')
}

async function main() {
  const email = process.argv[2]
  const shouldReset = process.argv.includes('--reset')

  // ── Part 1: by email ──────────────────────────────────────────
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!user) {
      console.error('❌ User not found:', email)
    } else {
      console.log('\n━━━━━━━━ USER ━━━━━━━━')
      console.log({
        id: user.id,
        email: user.email,
        lifecycleState: user.lifecycleState,
        currentStep: user.currentStep,
        onboardingStage: user.onboardingStage,
        testResultType: user.testResultType,
        telegramUserId: user.telegramUserId,
        telegramUserName: user.telegramUserName,
        telegramChatId: user.telegramChatId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })

      console.log('\n━━━━━━━━ UI SETTINGS ━━━━━━━━')
      console.dir(user.uiSettings, { depth: null })

      console.log('\n━━━━━━━━ SETTINGS ━━━━━━━━')
      console.dir(user.settings, { depth: null })

      console.log('\n━━━━━━━━ NOTIFICATIONS (last 20) ━━━━━━━━')
      for (const n of user.notifications) {
        console.log({
          type: n.type,
          status: n.status,
          scheduledAt: n.scheduledAt,
          createdAt: n.createdAt,
        })
      }
    }
  }

  // ── Part 2: find ALL users linked to Telegram ─────────────────
  console.log(`\n━━━━━━━━ ALL USERS BY telegramUserName ${TELEGRAM_USERNAME} ━━━━━━━━`)
  const byUsername = await prisma.user.findMany({
    where: { telegramUserName: TELEGRAM_USERNAME },
    select: {
      id: true,
      email: true,
      lifecycleState: true,
      testResultType: true,
      telegramUserId: true,
      telegramChatId: true,
      uiSettings: true,
    },
  })
  console.log(JSON.stringify(byUsername, null, 2))

  console.log(`\n━━━━━━━━ ALL USERS BY telegramUserId ${TELEGRAM_USER_ID} ━━━━━━━━`)
  const byTelegramId = await prisma.user.findMany({
    where: { telegramUserId: TELEGRAM_USER_ID },
    select: {
      id: true,
      email: true,
      lifecycleState: true,
      testResultType: true,
      telegramChatId: true,
      uiSettings: true,
    },
  })
  console.log(JSON.stringify(byTelegramId, null, 2))

  console.log(`\n━━━━━━━━ ALL USERS BY telegramChatId ${TELEGRAM_CHAT_ID} ━━━━━━━━`)
  const byChatId = await prisma.user.findMany({
    where: { telegramChatId: TELEGRAM_CHAT_ID },
    select: {
      id: true,
      email: true,
      lifecycleState: true,
      testResultType: true,
      telegramUserId: true,
      uiSettings: true,
    },
  })
  console.log(JSON.stringify(byChatId, null, 2))

  // ── Part 3: reset guest user if --reset flag passed ───────────
  // IMPORTANT: bot always uses the Telegram guest user, NOT email user
  // Always reset by telegramUserId, not by email
  if (shouldReset) {
    console.log('\n━━━━━━━━ RESET TELEGRAM GUEST USER ━━━━━━━━')

    // Find the guest user by telegramUserId
    const guestUser = byTelegramId[0] ?? byChatId[0]

    if (!guestUser) {
      console.error('❌ No guest user found for telegramUserId:', TELEGRAM_USER_ID)
    } else {
      console.log(`Resetting: ${guestUser.email} (${guestUser.id})`)
      await resetGuestUser(guestUser.id)
    }
  } else if (byTelegramId.length > 0 || byChatId.length > 0) {
    const guestUser = byTelegramId[0] ?? byChatId[0]
    if (guestUser && (guestUser.lifecycleState !== 'new')) {
      console.log('\n━━━━━━━━ ⚠️  GUEST USER HAS PROGRESS ━━━━━━━━')
      console.log(`Guest: ${guestUser.email}`)
      console.log(`lifecycleState: ${guestUser.lifecycleState}`)
      console.log('')
      console.log('To reset for fresh bot test run:')
      console.log('  pnpm tsx user-stats.ts --reset')
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())