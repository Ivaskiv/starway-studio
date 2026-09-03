import type { Context } from 'telegraf'

import { coachBotContent } from '../../content/coachBot.content.js'
import { safeRate } from '../../../services/scheduler/daily/shared.js'
import { loadDailyCoachBriefingData } from '../../../services/scheduler/daily/coach/data.js'
import { replyOrEditPanelMessage } from '../coach-content/shared.js'

type CoachAnalytics = {
  newUsers: number
  testDone: number
  focusPaid: number
  zoomActive: number | null
  conversion: number
  monthRevenue: Array<{
    currency: string
    count: number
    sumCents: number
  }>
}

function formatCurrencyAmount(valueCents: number, currency: string): string {
  const amount = (valueCents / 100).toFixed(currency === 'UAH' ? 0 : 2)
  return `${amount} ${currency}`
}

function formatMonthRevenue(rows: CoachAnalytics['monthRevenue']): string {
  if (rows.length === 0) return '—'
  if (rows.length > 1) return 'Дані по валюті потребують звірки'

  const row = rows[0]
  return formatCurrencyAmount(row.sumCents, row.currency)
}

async function readCoachAnalytics(): Promise<CoachAnalytics> {
  const daily = await loadDailyCoachBriefingData()

  return {
    newUsers: daily.newUsers,
    testDone: daily.testsCompleted,
    focusPaid: daily.focusPaidUsers,
    zoomActive: null,
    conversion: safeRate(daily.focusPaidUsers, Math.max(daily.testsCompleted, 1)),
    monthRevenue: daily.monthRevenue,
  }
}

export async function analyticsHandler(ctx: Context): Promise<void> {
  const analytics = await readCoachAnalytics()

  if (analytics.newUsers === 0 && analytics.testDone === 0 && analytics.focusPaid === 0 && analytics.monthRevenue.length === 0) {
    await replyOrEditPanelMessage(
      ctx,
      `${coachBotContent.analytics.title}\n\n${coachBotContent.analytics.noData}`,
    )
    return
  }

  const lines = [
    coachBotContent.analytics.title,
    '',
    coachBotContent.analytics.today,
    '',
    `${coachBotContent.analytics.newUsers}: ${analytics.newUsers}`,
    `${coachBotContent.analytics.testDone}: ${analytics.testDone}`,
    `${coachBotContent.analytics.focusPaid}: ${analytics.focusPaid}`,
    ...(analytics.zoomActive === null
      ? []
      : [`${coachBotContent.analytics.zoomActive}: ${analytics.zoomActive}`]),
    '',
    coachBotContent.analytics.conversion,
    '',
    `${coachBotContent.analytics.testToFocus}: ${analytics.conversion}%`,
    '',
    coachBotContent.analytics.paymentsMonth,
    '',
    formatMonthRevenue(analytics.monthRevenue),
  ]

  await replyOrEditPanelMessage(ctx, lines.join('\n'))
}
