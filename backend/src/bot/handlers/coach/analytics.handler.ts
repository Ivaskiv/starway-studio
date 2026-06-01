import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { coachBotContent } from '../../content/coachBot.content.js'

type CoachAnalytics = {
  total: number
  inTest: number
  testDone: number
  focusPaid: number
  zoomActive: number
  conversion: number
}

async function readCoachAnalytics(): Promise<CoachAnalytics> {
  const total = await prisma.user.count({
    where: { telegramUserId: { not: null } },
  })

  const inTest = await prisma.user.count({
    where: {
      testStartedAt: { not: null },
      testCompletedAt: null,
    },
  })

  const testDone = await prisma.user.count({
    where: {
      testCompletedAt: { not: null },
    },
  })

  const focusPaid = await prisma.user.count({
    where: {
      focusPaid: true,
    },
  })

  const zoomActive = await prisma.zoomSessionAttendee.count({
    where: { attended: true },
  })

  const conversion = testDone > 0 ? Number(((focusPaid / testDone) * 100).toFixed(1)) : 0

  return {
    total,
    inTest,
    testDone,
    focusPaid,
    zoomActive,
    conversion,
  }
}

export async function analyticsHandler(ctx: Context): Promise<void> {
  const analytics = await readCoachAnalytics()

  if (analytics.total === 0) {
    await ctx.reply(`${coachBotContent.analytics.title}\n\n${coachBotContent.analytics.noData}`)
    return
  }

  const lines = [
    `📊 ${coachBotContent.analytics.title}`,
    '─────────────────',
    `👥 ${coachBotContent.analytics.total}: ${analytics.total}`,
    `🔬 ${coachBotContent.analytics.inTest}: ${analytics.inTest}`,
    `✅ ${coachBotContent.analytics.testDone}: ${analytics.testDone}`,
    `💳 ${coachBotContent.analytics.focusPaid}: ${analytics.focusPaid}`,
    `🎥 ${coachBotContent.analytics.zoomActive}: ${analytics.zoomActive}`,
    `📈 ${coachBotContent.analytics.conversion}: ${analytics.conversion}%`,
  ]

  await ctx.reply(lines.join('\n'))
}
