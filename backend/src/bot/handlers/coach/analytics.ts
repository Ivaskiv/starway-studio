import type { Context } from 'telegraf'

import { coachBotContent } from '../../content/coachBot.content.js'
import { getCanonicalCoachMetrics } from '../../../modules/analytics/service.js'

type CoachAnalytics = {
  total: number
  inTest: number
  testDone: number
  focusPaid: number
  zoomActive: number
  conversion: number
  abSystemUpgrades: number
  revenueCents: number
  mrr: number
}

async function replyOrEditAnalytics(ctx: Context, text: string): Promise<void> {
  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text).catch(() => undefined)
      return
    } catch (error) {
      console.error('[coach-analytics:edit-fallback] failed', error)
    }
  }

  await ctx.reply(text).catch(() => undefined)
}

function formatMoney(value: number): string {
  return `€${value.toFixed(2)}`
}

async function readCoachAnalytics(): Promise<CoachAnalytics> {
  const canonical = await getCanonicalCoachMetrics()

  return {
    total: canonical.totalUsers,
    inTest: canonical.testInProgress,
    testDone: canonical.testCompleted,
    focusPaid: canonical.focusPaid,
    zoomActive: canonical.activeZoomUsers,
    conversion: canonical.testToFocusConversion,
    abSystemUpgrades: canonical.abSystemUpgrades,
    revenueCents: canonical.revenueCents,
    mrr: canonical.mrr,
  }
}

export async function analyticsHandler(ctx: Context): Promise<void> {
  const analytics = await readCoachAnalytics()

  if (analytics.total === 0) {
    await replyOrEditAnalytics(ctx, `${coachBotContent.analytics.title}\n\n${coachBotContent.analytics.noData}`)
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
    `🚀 ${coachBotContent.analytics.abSystemUpgrades}: ${analytics.abSystemUpgrades}`,
    `💰 ${coachBotContent.analytics.revenue}: ${formatMoney(analytics.revenueCents / 100)}`,
    `📆 ${coachBotContent.analytics.mrr}: ${formatMoney(analytics.mrr)}`,
  ]

  await replyOrEditAnalytics(ctx, lines.join('\n'))
}
