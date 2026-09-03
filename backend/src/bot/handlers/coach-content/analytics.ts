import type { Context } from 'telegraf'

import {
  getCanonicalCoachMetrics,
  getFunnelStats,
  getLiveActivity,
  getOverviewStats,
  getRetentionStats,
} from '../../../modules/analytics/service.js'
import {
  coachPanelContent,
  formatKyivDateTime,
  formatMoney,
  replyOrEditPanelMessage,
  resolveCoachAccess,
  safeText,
} from './shared.js'

export async function handleCoachStatsCommand(ctx: Context): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  if (!coach || !chatId) return false

  const [overview, funnel, retention, liveActivity, canonical] = await Promise.all([
    getOverviewStats('30d'),
    getFunnelStats('30d'),
    getRetentionStats('30d'),
    getLiveActivity(5),
    getCanonicalCoachMetrics(),
  ])

  const funnelSummary = funnel.stages
    .map(stage => `${stage.stage}:${stage.users} (${stage.conversionRate}%)`)
    .join(' | ')

  const liveSummary = liveActivity.length > 0
    ? liveActivity
      .map(item => `• ${formatKyivDateTime(item.createdAt)} — ${item.type} — ${safeText(item.user.label)}`)
      .join('\n')
    : '—'

    await replyOrEditPanelMessage(ctx, [
      coachPanelContent.analytics.title,
      '',
      `Учасників у базі: ${canonical.totalUsers}`,
      `У процесі тесту: ${canonical.testInProgress}`,
      `${coachPanelContent.analytics.testDone}: ${canonical.testCompleted}`,
      `${coachPanelContent.analytics.focusPaid}: ${canonical.focusPaid}`,
      `${coachPanelContent.analytics.zoomActive}: ${canonical.activeZoomUsers}`,
      `${coachPanelContent.analytics.testToFocus}: ${canonical.testToFocusConversion}%`,
      `Оплати за весь період: ${formatMoney(canonical.revenueCents / 100)}`,
      `Поточний MRR: ${formatMoney(canonical.mrr)}`,
      '',
      `${coachPanelContent.stats.newUsers}: ${overview.newUsers}`,
      `${coachPanelContent.stats.avgActions}: ${overview.avgActionsPerUser}`,
      `${coachPanelContent.stats.streakUsers}: ${overview.streakUsers}`,
      '',
      `${coachPanelContent.stats.retention}: D1 ${retention.day1}% | D3 ${retention.day3}% | D7 ${retention.day7}%`,
      '',
      `${coachPanelContent.stats.funnel}: ${funnelSummary}`,
      '',
      `${coachPanelContent.stats.liveActivity}:`,
      liveSummary,
    ].join('\n'))
  return true
}
