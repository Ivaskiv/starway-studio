// backend/src/services/scheduler/daily.jobs.ts — daily mentor/streak notification jobs.
// Інструкція: тут щоденні нагадування, streak-логіка, weekly summary та inactive AI checks.

import { Markup } from 'telegraf'

import { coachBot } from '../../../../lib/telegram.js'
import { sendTelegramMessage } from '../../../../lib/telegram/messageFormatter.js'
import { generateAiBriefingInsights } from '../../daily-briefing.ai.js'
import {
escapeHtml,
formatKyivDate,
formatKyivDateTime,
formatMoney,
getCoachChatId,
safeRate,
} from '../shared.js'
import {
type CoachReportButton,
type DailyCoachBriefingData,
type MonthlyStrategicSnapshot,
type ProductRevenueAggregate,
type WeeklyPlannerSnapshot,
formatProductRevenueSummary,
formatRevenueSummary,
} from './data.js'

function pickBestConversion(snapshot: DailyCoachBriefingData): string {
  const testConversion = safeRate(snapshot.testsCompleted, Math.max(snapshot.testsStarted, 1))
  const focusConversion = safeRate(snapshot.focusPaidUsers, Math.max(snapshot.focusOfferShown, 1))
  const checkoutConversion = safeRate(snapshot.focusPaidUsers, Math.max(snapshot.checkoutOpenedUsers, 1))
  const entries = [
    { label: 'test → completion', value: testConversion },
    { label: 'offer → payment', value: focusConversion },
    { label: 'checkout → payment', value: checkoutConversion },
  ].sort((left, right) => right.value - left.value)

  const best = entries[0]
  return `${best.label} — ${best.value}%`
}

function pickWeakestBlock(snapshot: DailyCoachBriefingData): string {
  const blocks = [
    { label: 'Тест', drop: safeRate(snapshot.blockedTestUsers, Math.max(snapshot.testsStarted, 1)), count: snapshot.blockedTestUsers },
    { label: 'Focus Offer', drop: safeRate(snapshot.blockedOfferUsers, Math.max(snapshot.focusOfferShown, 1)), count: snapshot.blockedOfferUsers },
    { label: 'Checkout', drop: safeRate(snapshot.blockedCheckoutUsers, Math.max(snapshot.checkoutOpenedUsers, 1)), count: snapshot.blockedCheckoutUsers },
  ].sort((left, right) => right.drop - left.drop)

  const weakest = blocks[0]
  return `${weakest.label} — ${weakest.count} втрат (${weakest.drop}%)`
}

function pickSlippingProduct(rows: ProductRevenueAggregate[]): string {
  if (rows.length === 0) return 'Недостатньо продажів, щоб виділити продукт.'
  const weakest = [...rows].sort((left, right) => left.sumCents - right.sumCents)[0]
  return `${weakest.name} (${weakest.code}) — ${formatMoney(weakest.sumCents, weakest.currency)}`
}

export async function buildCoachDailyBriefingText(snapshot: DailyCoachBriefingData): Promise<string> {
  const aiInsights = await generateAiBriefingInsights(snapshot)
  const resultBreakdown = snapshot.resultCounts.length > 0
    ? snapshot.resultCounts.map((item) => `${item.label}: ${item.count}`).join(' | ')
    : 'невизначено: 0'
  const dailyCurrency = snapshot.dailyRevenue[0]?.currency ?? snapshot.monthRevenue[0]?.currency ?? 'EUR'
  const monthCurrency = snapshot.monthRevenue[0]?.currency ?? dailyCurrency

  return [
    `📈 <b>Coach Daily Briefing</b>`,
    `${formatKyivDate(snapshot.monthNow)}`,
    '',
    `1) <b>Funnel Overview</b>`,
    `• Нові ліди: <b>${snapshot.leads}</b>`,
    `• Нові тести: <b>${snapshot.testsStarted}</b>`,
    `• Завершені тести: <b>${snapshot.testsCompleted}</b>`,
    `• Результати тестів: ${resultBreakdown}`,
    `• Focus offer побачили: <b>${snapshot.focusOfferShown}</b>`,
    `• Checkout відкрили: <b>${snapshot.checkoutOpenedUsers}</b>`,
    `• Успішні оплати Focus: <b>${snapshot.focusPaidUsers}</b>`,
    `• Конверсія test → pay: <b>${safeRate(snapshot.focusPaidUsers, Math.max(snapshot.testsCompleted, 1))}%</b>`,
    `• Конверсія offer → pay: <b>${safeRate(snapshot.focusPaidUsers, Math.max(snapshot.focusOfferShown, 1))}%</b>`,
    '',
    `2) <b>Revenue</b>`,
    `• Оплати за добу: <b>${snapshot.dailyRevenue.reduce((sum, row) => sum + row.count, 0)}</b>`,
    `• Сума за добу: <b>${formatRevenueSummary(snapshot.dailyRevenue)}</b>`,
    `• Paid users за добу: <b>${snapshot.dailyPaidUsers}</b>`,
    `• ARPU за добу: <b>${formatMoney(snapshot.dailyArpuCents, dailyCurrency)}</b>`,
    `• MTD: <b>${formatRevenueSummary(snapshot.monthRevenue)}</b>`,
    `• Paid users за місяць: <b>${snapshot.monthPaidUsers}</b>`,
    `• ARPU за місяць: <b>${formatMoney(snapshot.monthArpuCents, monthCurrency)}</b>`,
    `• MRR: <b>${formatMoney(snapshot.monthMrrCents, monthCurrency)}</b>`,
    `• Активні підписки: <b>${snapshot.activeSubscriptions}</b>`,
    `• Завершені підписки: <b>${snapshot.completedSubscriptions}</b>`,
    `• Продовження підписок: <b>${snapshot.renewals}</b>`,
    '',
    `3) <b>User Activity</b>`,
    `• Нові користувачі: <b>${snapshot.newUsers}</b>`,
    `• Активні користувачі: <b>${snapshot.activeUsers}</b>`,
    `• Користувачі без активності: <b>${snapshot.inactiveUsers}</b>`,
    `• Користувачі, що зникли &gt;7 днів: <b>${snapshot.gone7dUsers}</b>`,
    `• Потребують реактивації: <b>${snapshot.reactivationUsers}</b>`,
    '',
    `4) <b>Funnel Blockers</b>`,
    `• Тест: ${snapshot.testsStarted} стартували / ${snapshot.testsCompleted} завершили / ${snapshot.blockedTestUsers} відпали`,
    `• Focus Offer: ${snapshot.focusOfferShown} побачили / ${snapshot.checkoutOpenedUsers} відкрили checkout / ${snapshot.blockedOfferUsers} не відкрили checkout`,
    `• Checkout: ${snapshot.checkoutOpenedUsers} відкрили / ${snapshot.focusPaidUsers} оплатили / ${snapshot.blockedCheckoutUsers} не завершили оплату`,
    '',
    `5) <b>AI Recommendations</b>${aiInsights ? '' : ' <i>(стандартний режим)</i>'}`,
    `• Найбільший вузол втрати: ${aiInsights?.weakestBlock ?? pickWeakestBlock(snapshot)}`,
    `• Найкраща конверсія: ${aiInsights?.bestConversion ?? pickBestConversion(snapshot)}`,
    `• Що потребує уваги: ${aiInsights?.attentionNeeded ?? (snapshot.blockedCheckoutUsers > snapshot.blockedOfferUsers ? 'Checkout — тут втрачаємо найбільше грошей' : 'Focus Offer — слабко веде в checkout')}`,
    `• Який продукт просідає: ${aiInsights?.slippingProduct ?? pickSlippingProduct(snapshot.productRevenue)}`,
    '',
    `6) <b>Coach Prompt</b>`,
    aiInsights?.coachPrompt ?? 'Що робимо сьогодні?',
  ].join('\n')
}

export function buildCoachWeeklyReminderText(title: string, snapshot: WeeklyPlannerSnapshot): string {
  const zoomLines = snapshot.zooms.length > 0
    ? snapshot.zooms.slice(0, 5).map((zoom) => {
      const time = formatKyivDateTime(zoom.scheduledAt)
      const audioBadge = zoom.hasAudio ? ' 🎧' : ''
      return `• ${time} — ${escapeHtml(zoom.topic)} (${escapeHtml(zoom.type)}, ${escapeHtml(zoom.status)})${audioBadge}`
    }).join('\n')
    : '• Zoom-сесій цього тижня ще немає'

  const noteLines = snapshot.notes.length > 0
    ? snapshot.notes.slice(0, 3).map((note) => `• ${formatKyivDateTime(note.createdAt)} — ${escapeHtml(note.content.slice(0, 140))}`).join('\n')
    : '• Нових нотаток немає'

  const audioLines = snapshot.audioItems.length > 0
    ? snapshot.audioItems.slice(0, 3).map((audio) => `• ${formatKyivDateTime(audio.createdAt)} — ${escapeHtml(audio.fileName)}${audio.folder ? ` (${escapeHtml(audio.folder)})` : ''}`).join('\n')
    : '• Нових аудіо немає'

  return [
    `🧭 <b>${escapeHtml(title)}</b>`,
    '',
    `• Zoom-сесії тижня: <b>${snapshot.zooms.length}</b>`,
    `• Нові нотатки: <b>${snapshot.notes.length}</b>`,
    `• Нові аудіо: <b>${snapshot.audioItems.length}</b>`,
    `• Готовність контенту: <b>${snapshot.contentPlanReady ? 'підтверджено' : 'ще не готово'}</b>`,
    `• Планів тижня: <b>${snapshot.contentPlans}</b> (draft: ${snapshot.contentPlanDrafts})`,
    '',
    '📅 <b>Zoom цього тижня</b>',
    zoomLines,
    '',
    '📝 <b>Нові нотатки</b>',
    noteLines,
    '',
    '🎧 <b>Нові аудіо</b>',
    audioLines,
    '',
    'CTA: /planner',
  ].join('\n')
}

export function buildCoachMonthlyStrategicText(snapshot: MonthlyStrategicSnapshot): string {
  const bestProduct = snapshot.productRevenue.length > 0
    ? [...snapshot.productRevenue].sort((left, right) => right.sumCents - left.sumCents)[0]
    : null
  const weakestProduct = snapshot.productRevenue.length > 0
    ? [...snapshot.productRevenue].sort((left, right) => left.sumCents - right.sumCents)[0]
    : null
  const testDrop = Math.max(0, snapshot.funnel.testsStarted - snapshot.funnel.testsCompleted)
  const offerDrop = Math.max(0, snapshot.funnel.focusOfferShown - snapshot.funnel.checkoutOpenedUsers)
  const checkoutDrop = Math.max(0, snapshot.funnel.checkoutOpenedUsers - snapshot.funnel.focusPaidUsers)
  const bottleneck = [
    { label: 'Test', drop: safeRate(testDrop, Math.max(snapshot.funnel.testsStarted, 1)) },
    { label: 'Focus', drop: safeRate(offerDrop, Math.max(snapshot.funnel.focusOfferShown, 1)) },
    { label: 'Checkout', drop: safeRate(checkoutDrop, Math.max(snapshot.funnel.checkoutOpenedUsers, 1)) },
  ].sort((left, right) => right.drop - left.drop)[0]
  const currency = snapshot.revenue[0]?.currency ?? 'EUR'

  return [
    `📊 <b>Monthly Strategic Planner</b>`,
    `${formatKyivDate(snapshot.monthStart)} — ${formatKyivDate(snapshot.monthEnd)}`,
    '',
    `1) <b>Revenue</b>`,
    `• Місячний дохід: <b>${formatRevenueSummary(snapshot.revenue)}</b>`,
    `• Кількість оплат: <b>${snapshot.paymentsCount}</b>`,
    `• Paid users: <b>${snapshot.paidUsers}</b>`,
    `• Середній чек: <b>${snapshot.avgCheckCents > 0 ? formatMoney(snapshot.avgCheckCents, snapshot.revenue[0]?.currency ?? 'EUR') : '—'}</b>`,
    `• ARPU: <b>${formatMoney(snapshot.arpuCents, currency)}</b>`,
    `• MRR: <b>${formatMoney(snapshot.mrrCents, currency)}</b>`,
    `• Продовження підписок: <b>${snapshot.renewals}</b>`,
    `• Топ продуктів: <b>${escapeHtml(formatProductRevenueSummary(snapshot.productRevenue, 3))}</b>`,
    '',
    `2) <b>Funnel</b>`,
    `• Тести: ${snapshot.funnel.testsStarted}`,
    `• Завершили тест: ${snapshot.funnel.testsCompleted}`,
    `• Focus побачили: ${snapshot.funnel.focusOfferShown}`,
    `• Checkout відкрили: ${snapshot.funnel.checkoutOpenedUsers}`,
    `• Оплатили: ${snapshot.funnel.focusPaidUsers}`,
    `• Конверсія test → pay: ${snapshot.funnel.testToPayRate}%`,
    `• Конверсія offer → pay: ${snapshot.funnel.offerToPayRate}%`,
    '',
    `3) <b>Audience</b>`,
    `• Приріст бази: <b>${snapshot.audience.newUsers}</b>`,
    `• Активні користувачі: <b>${snapshot.audience.activeUsers}</b>`,
    `• Відтік: <b>${snapshot.audience.churnUsers}</b>`,
    '',
    `4) <b>Content</b>`,
    `• Zoom: <b>${snapshot.content.zooms}</b>`,
    `• Аудіо: <b>${snapshot.content.audios}</b>`,
    `• Контент-плани: <b>${snapshot.content.contentPlans}</b>`,
    `• Reels: <b>${snapshot.content.reels}</b>`,
    '',
    `5) <b>Strategic Recommendations</b>`,
    `• Що масштабувати: ${bestProduct ? `${bestProduct.name} (${formatMoney(bestProduct.sumCents, bestProduct.currency ?? 'EUR')})` : 'Немає даних по продуктам'}`,
    `• Що прибрати: ${weakestProduct ? `${weakestProduct.name} (${formatMoney(weakestProduct.sumCents, weakestProduct.currency ?? 'EUR')})` : 'Немає даних по продуктам'}`,
    `• Де вузьке місце: ${bottleneck.label} (${bottleneck.drop}%)`,
    `• Де втрачено грошей: ${formatMoney(Math.max(0, checkoutDrop) * Math.max(1, snapshot.avgCheckCents), snapshot.revenue[0]?.currency ?? 'EUR')}`,
    '',
    `6) <b>Planning CTA</b>`,
    `Створити план місяця / Запустити планер / Переглянути аналітику`,
  ].join('\n')
}

export async function sendCoachPanelReport(
  text: string,
  buttons: CoachReportButton[][],
): Promise<void> {
  const chatId = getCoachChatId()
  if (!chatId) {
    throw new Error('coach_chat_id_missing')
  }

  const keyboard = buttons.map((row) => row.map((button) => {
    return 'url' in button
      ? Markup.button.url(button.text, button.url)
      : Markup.button.callback(button.text, button.callback_data)
  }))

  await sendTelegramMessage(coachBot, chatId, {
    text,
    parseMode: 'HTML',
  }, {
    replyMarkup: Markup.inlineKeyboard(keyboard).reply_markup,
  })
}
