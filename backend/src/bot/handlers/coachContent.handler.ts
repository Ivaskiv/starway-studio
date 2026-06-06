import type { Context, Telegraf } from 'telegraf'

import { prisma } from '../../db/client.js'
import { sendUserTelegramMessage } from '../../lib/telegram.js'
import { coachOnly } from '../../middleware/coachOnly.middleware.js'
import {
  getCanonicalCoachMetrics,
  getFunnelStats,
  getLiveActivity,
  getOverviewStats,
  getRetentionStats,
} from '../../modules/analytics/service.js'
import {
  ingestCloudinaryZoomAudio,
  listCloudinaryZoomAudio,
} from '../../modules/zoom/cloudinary-audio-ingest.service.js'
import { formatZoomAudioSizeMB } from '../../modules/voice/voice.service.js'
import { coachBotContent } from '../content/coachBot.content.js'
import { coachContent } from '../content/coachContent.content.js'
import {
  handleCoachContentAction,
  handleCoachContentCommand,
  handleCoachContentNote,
  handleCoachContentText,
  handleCoachContentZooms,
} from '../flows/contentPlanner.flow.js'

type CoachAccess = {
  id: string
  role: 'EXPERT' | 'SUPERADMIN'
  expertId: string | null
}

const coachPanelContent = coachBotContent

const KYIV_TZ = 'Europe/Kyiv'
const COACH_RUNTIME_ERROR_MESSAGE = '❌ Сталася помилка. Спробуй ще раз.'
const REQUIRED_PANEL_SECTIONS = ['start', 'menu', 'schedule', 'nextWeek', 'analytics', 'stats', 'audio', 'users', 'notify', 'payments'] as const
const REQUIRED_PLANNER_SECTIONS = ['planner', 'buttons', 'note', 'mode', 'topics', 'prompts'] as const

let coachContentCatalogValidated = false

export function validateCoachContentCatalog(): void {
  if (coachContentCatalogValidated) return
  coachContentCatalogValidated = true

  const missingPanelSections = REQUIRED_PANEL_SECTIONS.filter((key) => !(key in coachBotContent))
  const missingPlannerSections = REQUIRED_PLANNER_SECTIONS.filter((key) => !(key in coachContent))

  if (missingPanelSections.length === 0 && missingPlannerSections.length === 0) return

  console.error('[coach-panel] startup validation failed', {
    missingPanelSections,
    missingPlannerSections,
  })
}

function getCommandPayload(ctx: Context): string {
  const match = Array.isArray((ctx as { match?: unknown[] }).match)
    ? (ctx as { match?: unknown[] }).match
    : null
  if (!match) return ''
  return typeof match[1] === 'string' ? match[1].trim() : ''
}

function formatKyivDateTime(value: Date | string): string {
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KYIV_TZ,
  })
}

function safeText(value: string | null | undefined, fallback = '—'): string {
  const text = String(value ?? '').trim()
  return text || fallback
}

function formatMoney(value: number): string {
  return `€${value.toFixed(2)}`
}

function startOfWeekMonday(now = new Date()): Date {
  const kyivNow = new Date(now.toLocaleString('en-US', { timeZone: KYIV_TZ }))
  const date = new Date(kyivNow)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfWeekSunday(weekStart: Date): Date {
  const date = new Date(weekStart)
  date.setDate(date.getDate() + 6)
  date.setHours(23, 59, 59, 999)
  return date
}

function splitPayload(payload: string): string[] {
  return payload.trim().split(/\s+/u).filter(Boolean)
}

async function replyOrEditPanelMessage(
  ctx: Context,
  text: string,
): Promise<void> {
  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text).catch(() => undefined)
      return
    } catch (error) {
      console.error('[coach-panel:edit-fallback] failed', error)
    }
  }

  await ctx.reply(text).catch(() => undefined)
}

async function reportCoachRuntimeError(ctx: Context, scope: string, error: unknown): Promise<void> {
  console.error(`[coach-panel:${scope}] failed`, error)

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery(COACH_RUNTIME_ERROR_MESSAGE).catch(() => undefined)
  }

  await ctx.reply(COACH_RUNTIME_ERROR_MESSAGE).catch(() => undefined)
}

function withCoachRuntimeProtection<T extends Context>(
  scope: string,
  handler: (ctx: T) => Promise<unknown>,
) {
  return async (ctx: T): Promise<void> => {
    try {
      await handler(ctx)
    } catch (error) {
      await reportCoachRuntimeError(ctx, scope, error)
    }
  }
}

function formatUserRow(user: {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  telegramUserId: string | null
  telegramChatId: string | null
  telegramUserName: string | null
  role: string
  focusPaid: boolean
  expertId: string | null
  createdAt: Date
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Без імені'
  const telegram = user.telegramUserId ?? user.telegramChatId ?? user.telegramUserName ?? '—'

  return [
    `• ${name}`,
    `  id: ${user.id}`,
    `  email: ${user.email}`,
    `  tg: ${telegram}`,
    `  role: ${user.role}`,
    `  expert: ${user.expertId ?? '—'}`,
    `  focus: ${user.focusPaid ? 'yes' : 'no'}`,
    `  created: ${formatKyivDateTime(user.createdAt)}`,
  ].join('\n')
}

function formatAudioRow(item: {
  folder: string
  fileName: string
  secureUrl: string
  createdAt: string | null
  bytes: number | null
  duration: number | null
}): string {
  const sizeMB = formatZoomAudioSizeMB(item.bytes)
  const createdAt = item.createdAt ? formatKyivDateTime(item.createdAt) : '—'
  return [
    `• ${item.fileName}`,
    `  folder: ${item.folder}`,
    `  created: ${createdAt}`,
    `  size: ${sizeMB ? `${sizeMB} MB` : '—'}`,
    `  duration: ${typeof item.duration === 'number' ? `${Math.round(item.duration)}s` : '—'}`,
    `  url: ${item.secureUrl}`,
  ].join('\n')
}

async function resolveCoachAccess(ctx: Context): Promise<CoachAccess | null> {
  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : ''
  if (!telegramUserId) return null

  const coach = await prisma.user.findFirst({
    where: {
      OR: [
        { telegramUserId },
        { telegramChatId: telegramUserId },
      ],
    },
    select: { id: true, role: true, expertId: true },
  })

  if (!coach) return null
  if (coach.role !== 'EXPERT' && coach.role !== 'SUPERADMIN') return null
  return {
    id: coach.id,
    role: coach.role,
    expertId: coach.expertId ?? null,
  }
}

async function resolveCoachUserId(ctx: Context): Promise<string | null> {
  return (await resolveCoachAccess(ctx))?.id ?? null
}

function buildExpertScopeWhere(coach: CoachAccess) {
  return coach.role === 'EXPERT'
    ? { expertId: coach.expertId ?? coach.id }
    : {}
}

export async function handleCoachAudioCommand(ctx: Context, payload = ''): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  if (!coach || !chatId) return false

  const [action] = splitPayload(payload.toLowerCase())

  if (action === 'run' || action === 'ingest' || action === 'sync') {
    await replyOrEditPanelMessage(ctx, coachPanelContent.audio.ingestStarted)
    const results = await ingestCloudinaryZoomAudio()
    const total = results.reduce((sum, item) => sum + item.returned, 0)
    const filtered = results.reduce((sum, item) => sum + item.filtered, 0)
    const accepted = results.reduce((sum, item) => sum + item.accepted, 0)
    const enqueued = results.reduce((sum, item) => sum + item.enqueued, 0)
    const duplicates = results.reduce((sum, item) => sum + item.duplicates, 0)

    await replyOrEditPanelMessage(ctx, [
      `🎧 ${coachPanelContent.audio.title}`,
      '',
      coachPanelContent.audio.ingestDone,
      `• folders: ${results.length}`,
      `• total: ${total}`,
      `• filtered: ${filtered}`,
      `• accepted: ${accepted}`,
      `• enqueued: ${enqueued}`,
      `• duplicates: ${duplicates}`,
    ].join('\n'))
    return true
  }

  const weekStart = startOfWeekMonday()
  const weekEnd = endOfWeekSunday(weekStart)
  const items = await listCloudinaryZoomAudio({
    limitPerFolder: 50,
    from: weekStart,
    to: weekEnd,
  })
  if (items.length === 0) {
    await replyOrEditPanelMessage(ctx, [
      `🎧 ${coachPanelContent.audio.title}`,
      '',
      'Поки що Cloudinary-аудіо за поточний тиждень не знайдено.',
      '',
      coachPanelContent.audio.usage,
    ].join('\n'))
    return true
  }

  await replyOrEditPanelMessage(ctx, [
    `🎧 ${coachPanelContent.audio.title}`,
    '',
    `Аудіо за поточний тиждень: ${weekStart.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', timeZone: KYIV_TZ })}–${weekEnd.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', timeZone: KYIV_TZ })}`,
    '',
    ...items.map((item) => formatAudioRow(item)),
  ].join('\n\n'))
  return true
}

export async function handleCoachUsersCommand(ctx: Context, payload = ''): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  if (!coach || !chatId) return false

  const normalized = payload.trim()
  const searchQuery = normalized.toLowerCase().startsWith('search ')
    ? normalized.slice(7).trim()
    : normalized

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...buildExpertScopeWhere(coach),
      ...(searchQuery
        ? {
            OR: [
              { id: searchQuery },
              { email: { contains: searchQuery, mode: 'insensitive' } },
              { telegramUserId: searchQuery },
              { telegramChatId: searchQuery },
              { telegramUserName: { contains: searchQuery.replace(/^@/, ''), mode: 'insensitive' } },
              { firstName: { contains: searchQuery, mode: 'insensitive' } },
              { lastName: { contains: searchQuery, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      telegramUserId: true,
      telegramChatId: true,
      telegramUserName: true,
      role: true,
      focusPaid: true,
      expertId: true,
      createdAt: true,
    },
  })

  const header = searchQuery
    ? `${coachPanelContent.users.searchHeader}: ${searchQuery}`
    : coachPanelContent.users.listHeader

  if (users.length === 0) {
    await replyOrEditPanelMessage(ctx, [
      `👥 ${coachPanelContent.users.title}`,
      '',
      header,
      '',
      coachPanelContent.users.empty,
      '',
      coachPanelContent.users.usage,
    ].join('\n'))
    return true
  }

  await replyOrEditPanelMessage(ctx, [
    `👥 ${coachPanelContent.users.title}`,
    '',
    header,
    '',
    ...users.map(user => formatUserRow(user)),
  ].join('\n\n'))
  return true
}

export async function handleCoachNotifyCommand(ctx: Context, payload = ''): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  if (!coach || !chatId) return false

  const [mode, ...rest] = splitPayload(payload)
  if (!mode) {
    await replyOrEditPanelMessage(ctx, [
      `🔔 ${coachPanelContent.notify.title}`,
      '',
      coachPanelContent.notify.usage,
    ].join('\n'))
    return true
  }
  const normalizedMode = mode.toLowerCase()
  const message = rest.join(' ').trim()

  if (!normalizedMode || (normalizedMode !== 'all' && normalizedMode !== 'user')) {
    await replyOrEditPanelMessage(ctx, [
      `🔔 ${coachPanelContent.notify.title}`,
      '',
      coachPanelContent.notify.usage,
    ].join('\n'))
    return true
  }

  if (!message) {
    await replyOrEditPanelMessage(ctx, coachPanelContent.notify.usage)
    return true
  }

  if (normalizedMode === 'all') {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        telegramEnabled: true,
        telegramChatId: { not: null },
        ...buildExpertScopeWhere(coach),
      },
      select: {
        id: true,
        telegramChatId: true,
      },
    })

    let delivered = 0
    let failed = 0

    for (const user of users) {
      if (!user.telegramChatId) {
        failed += 1
        continue
      }

      const sent = await sendUserTelegramMessage(user.telegramChatId, message).catch(() => false)
      if (sent) {
        delivered += 1
      } else {
        failed += 1
      }
    }

    await replyOrEditPanelMessage(ctx, [
      `🔔 ${coachPanelContent.notify.title}`,
      '',
      coachPanelContent.notify.done,
      `• delivered: ${delivered}`,
      `• failed: ${failed}`,
      `• scope: ${coach.role === 'SUPERADMIN' ? 'all users' : 'expert users'}`,
    ].join('\n'))
    return true
  }

  const [target, ...messageParts] = rest
  const targetMessage = messageParts.join(' ').trim()
  if (!target || !targetMessage) {
    await replyOrEditPanelMessage(ctx, coachPanelContent.notify.usage)
    return true
  }

  const recipient = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      ...buildExpertScopeWhere(coach),
      OR: [
        { id: target },
        { email: { equals: target, mode: 'insensitive' } },
        { telegramUserId: target },
        { telegramChatId: target },
        { telegramUserName: { equals: target.replace(/^@/, ''), mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      email: true,
      telegramChatId: true,
    },
  })

  if (!recipient?.telegramChatId) {
    await replyOrEditPanelMessage(ctx, 'Користувача не знайдено або в нього немає Telegram chatId.')
    return true
  }

  const sent = await sendUserTelegramMessage(recipient.telegramChatId, targetMessage).catch(() => false)
  await replyOrEditPanelMessage(ctx, [
    `🔔 ${coachPanelContent.notify.title}`,
    '',
    sent ? coachPanelContent.notify.done : '❌ Не вдалося надіслати повідомлення.',
    `• target: ${recipient.email}`,
    `• userId: ${recipient.id}`,
  ].join('\n'))
  return true
}

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
      `📊 ${coachPanelContent.analytics.title}`,
      '',
      `👥 ${coachPanelContent.analytics.total}: ${canonical.totalUsers}`,
      `🔬 ${coachPanelContent.analytics.inTest}: ${canonical.testInProgress}`,
      `✅ ${coachPanelContent.analytics.testDone}: ${canonical.testCompleted}`,
      `💳 ${coachPanelContent.analytics.focusPaid}: ${canonical.focusPaid}`,
      `🎥 ${coachPanelContent.analytics.zoomActive}: ${canonical.activeZoomUsers}`,
      `📈 ${coachPanelContent.analytics.conversion}: ${canonical.testToFocusConversion}%`,
      `🚀 ${coachPanelContent.analytics.abSystemUpgrades}: ${canonical.abSystemUpgrades}`,
      `💰 ${coachPanelContent.analytics.revenue}: ${formatMoney(canonical.revenueCents / 100)}`,
      `📆 ${coachPanelContent.analytics.mrr}: ${formatMoney(canonical.mrr)}`,
      '',
      `🆕 ${coachPanelContent.stats.newUsers}: ${overview.newUsers}`,
      `⏱️ ${coachPanelContent.stats.avgActions}: ${overview.avgActionsPerUser}`,
      `🔁 ${coachPanelContent.stats.streakUsers}: ${overview.streakUsers}`,
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

export async function handleCoachPaymentsCommand(ctx: Context): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  if (!coach || !chatId) return false

  const [active, trial, pastDue, canceled, expired, recentPurchases] = await Promise.all([
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({ where: { status: 'TRIAL' } }),
    prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
    prisma.subscription.count({ where: { status: 'CANCELED' } }),
    prisma.subscription.count({ where: { status: 'EXPIRED' } }),
    prisma.purchaseHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        userId: true,
        productId: true,
        amountCents: true,
        currency: true,
        createdAt: true,
      },
    }),
  ])

  const recentLines = recentPurchases.length > 0
    ? recentPurchases.map((purchase) => {
      const amount = Number.isFinite(Number(purchase.amountCents))
        ? (Number(purchase.amountCents) / 100).toFixed(0)
        : '0'
      return `• ${formatKyivDateTime(purchase.createdAt)} — ${purchase.productId ?? 'unknown'} — ${amount} ${purchase.currency} — ${purchase.userId}`
    }).join('\n')
    : coachPanelContent.payments.noData

  await replyOrEditPanelMessage(ctx, [
    `💳 ${coachPanelContent.payments.title}`,
    '',
    `ACTIVE: ${active}`,
    `TRIAL: ${trial}`,
    `PAST_DUE: ${pastDue}`,
    `CANCELED: ${canceled}`,
    `EXPIRED: ${expired}`,
    '',
    'Recent purchases:',
    recentLines,
  ].join('\n'))
  return true
}

async function handleCoachPanelAction(ctx: Context, action: string): Promise<boolean> {
  if (action === 'coach-content:users') {
    await ctx.answerCbQuery('Users').catch(() => undefined)
    return handleCoachUsersCommand(ctx, '')
  }

  if (action === 'coach-content:notify') {
    await ctx.answerCbQuery('Notify').catch(() => undefined)
    return handleCoachNotifyCommand(ctx, '')
  }

  if (action === 'coach-content:audio') {
    await ctx.answerCbQuery('Audio').catch(() => undefined)
    return handleCoachAudioCommand(ctx, 'list')
  }

  if (action === 'coach-content:planner') {
    await ctx.answerCbQuery('Planner').catch(() => undefined)
    return handleCoachContentCommand(ctx, 'WEEKLY_PLAN')
  }

  if (action === 'coach-content:monthly') {
    await ctx.answerCbQuery('Monthly plan').catch(() => undefined)
    return handleCoachContentCommand(ctx, 'MONTHLY_PLAN')
  }

  if (action === 'coach-content:payments') {
    await ctx.answerCbQuery('Payments').catch(() => undefined)
    return handleCoachPaymentsCommand(ctx)
  }

  return handleCoachContentAction(ctx, action)
}

export function registerCoachContentHandlers(telegramBot: Telegraf): void {
  validateCoachContentCatalog()

  telegramBot.hears(/^\/planner(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:planner', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'WEEKLY_PLAN', payload)
  }))

  telegramBot.hears(/^\/планер(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:планер', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'WEEKLY_PLAN', payload)
  }))

  telegramBot.hears(/^\/місяць(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:місяць', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'MONTHLY_PLAN', payload)
  }))

  telegramBot.hears(/^\/monthly(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:monthly', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'MONTHLY_PLAN', payload)
  }))

  telegramBot.hears(/^\/reels(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:reels', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'REELS_IDEAS', payload)
  }))

  telegramBot.hears(/^\/контент(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:контент', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'FULL_CONTENT', payload)
  }))

  telegramBot.hears(/^\/зуми(?:@\w+)?$/iu, coachOnly, withCoachRuntimeProtection('command:зуми', async (ctx) => {
    await handleCoachContentZooms(ctx)
  }))

  telegramBot.hears(/^\/audio(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:audio', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachAudioCommand(ctx, payload)
  }))

  telegramBot.hears(/^\/users(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:users', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachUsersCommand(ctx, payload)
  }))

  telegramBot.hears(/^\/notify(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:notify', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachNotifyCommand(ctx, payload)
  }))

  telegramBot.hears(/^\/stats(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:stats', async (ctx) => {
    await handleCoachStatsCommand(ctx)
  }))

  telegramBot.hears(/^\/payments(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:payments', async (ctx) => {
    await handleCoachPaymentsCommand(ctx)
  }))

  telegramBot.hears(/^\/нотатка(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:нотатка', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentNote(ctx, payload)
  }))

  telegramBot.action(/^coach-content:/, coachOnly, async (ctx) => {
    const raw = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
    try {
      const handled = await handleCoachPanelAction(ctx, raw)
      if (!handled) {
        await ctx.answerCbQuery().catch(() => undefined)
      }
    } catch (error) {
      await reportCoachRuntimeError(ctx, raw || 'coach-content:unknown', error)
    }
  })

  telegramBot.on('text', coachOnly, async (ctx, next) => {
    try {
      await handleCoachContentText(ctx, async () => { await next() })
    } catch (error) {
      await reportCoachRuntimeError(ctx, 'text', error)
    }
  })
}
