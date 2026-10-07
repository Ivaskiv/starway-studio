import { resolveIndividualSessionState } from '../../../modules/zoom/domain/individual-session-lifecycle.js'
import type { Context } from 'telegraf'
import { Markup } from 'telegraf'

import { prisma } from '../../../db/client.js'
import {
  bold,
  escapeTelegramHtml,
  joinBlocks,
  replyWithTelegramMessage,
} from '../../../lib/telegram/messageFormatter.js'
import {
  COACH_AGENTS_RETURN_TARGET,
  generateCoachAgentsWebDeepLink,
  generateCoachZoomWebDeepLink,
} from '../../../modules/deeplinks/service.js'
import {
  getCoachWeeklyDiary,
  type CoachWeeklyDiary,
  type CoachWeeklyDiarySession,
} from '../../../modules/zoom/calendar/zoom.calendar.service.js'
import { getCalendarRequests } from '../../../modules/zoom/commerce/zoom.commerce-request.service.js'
import { startOfKyivWeek } from '../../../modules/zoom/shared/zoom.time.utils.js'
import { coachBotContent } from '../../content/coachBot.content.js'
import { resolveCoachUserId } from './access.js'
import { resolveCoachWebAppBaseUrl } from '../../../config/webapp.js'
import {
  buildExpertScopeWhere,
  replyOrEditPanelMessage,
  resolveCoachAccess,
} from '../coach-content/shared.js'

const lastCoachAgentsMessageByChat = new Map<string, number>()
const coachWeeklyDigestSentAt = new Map<string, number>()
const COACH_WEEKLY_DIGEST_TTL_MS = 10 * 60 * 1000

export function resetCoachWeeklyDigestDedupeForTests(): void {
  coachWeeklyDigestSentAt.clear()
}

export const MENU_CONDUCT_PATTERN =
  /^(?:🎙️?\s*)?(?:Новий\s+Zoom|Провести)$/iu

export const MENU_LIBRARY_PATTERN =
  /^(?:📚\s*)?(?:Бібліотека(?:\s+Zoom)?)$/iu

export const MENU_ANALYTICS_PATTERN =
  /^(?:📊\s*)?Аналітика$/iu

export const MENU_AGENTS_PATTERN =
  /^(?:🤖\s*)?(?:AI-)?Агенти$/iu

export const MENU_SETTINGS_PATTERN =
  /^(?:⚙️\s*)?(?:Система|Налаштування|Ще)$/iu
const COACH_SETTINGS_BACK_ACTION = 'coach:settings:back'

export const MENU_NOTIFICATIONS_PATTERN =
  /^(?:🔔\s*)?Нагадування$/iu

export const MENU_PAYMENTS_PATTERN =
  /^(?:💳\s*)?Оплати$/iu

/*
 * COACH NAVIGATION CONTRACT — FROZEN
 * Do not change labels/actions/routes without explicit product approval.
 * Calendar is the persistent Telegram menu button; section links are inline
 * WebApp buttons and retain the same canonical Mini App route.
 */
export const COACH_NAVIGATION_CONTRACT = {
  calendar: {
    label: 'ZOOM КАЛЕНДАР',
    route: '/miniapp/zoom-calendar',
    zoomRole: 'coach',
  },
  sections: [
    { label: 'УЧАСНИКИ', panel: 'participants' },
    { label: 'BATTLE', panel: 'battle' },
    { label: 'АНАЛІТИКА', panel: 'analytics' },
    { label: 'ЩЕ', panel: 'more' },
  ],
} as const

async function resolveCoachAgentsUrl(ctx: Context): Promise<string> {
  const coachUserId = await resolveCoachUserId(ctx)
  if (!coachUserId) {
    throw new Error('COACH_USER_NOT_RESOLVED_FOR_AGENTS_LINK')
  }

  return generateCoachAgentsWebDeepLink(coachUserId)
}

export async function resolveCoachCalendarUrlForUser(coachUserId: string): Promise<string> {
  const url = new URL(await generateCoachZoomWebDeepLink(coachUserId))
  url.searchParams.set('zoomRole', 'coach')
  return url.toString()
}

export async function resolveCoachCalendarUrl(ctx: Context): Promise<string> {
  const coachUserId = await resolveCoachUserId(ctx)
  if (!coachUserId) {
    throw new Error('COACH_USER_NOT_RESOLVED_FOR_ZOOM_LINK')
  }

  return resolveCoachCalendarUrlForUser(coachUserId)
}

type CoachCommercePresentation = {
  status: 'REQUESTED' | 'APPROVED_PENDING_PAYMENT' | 'PAID' | 'REJECTED' | 'EXPIRED'
  participantName: string | null
}

function formatKyivDayKey(value: Date): string {
  return value.toLocaleDateString('en-CA', { timeZone: 'Europe/Kyiv' })
}

function formatKyivTime(value: string): string {
  return new Date(value).toLocaleTimeString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatWeekRange(week: CoachWeeklyDiary['week']): string {
  const from = new Date(week.from)
  const to = new Date(from.getTime() + 6 * 24 * 60 * 60 * 1000)
  const date = (value: Date) => value.toLocaleDateString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit',
    month: '2-digit',
  })

  return `${date(from)}–${date(to)}`
}

function pluralizeSessionCount(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'сесія'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'сесії'
  return 'сесій'
}

function getSessionTypeLabel(session: CoachWeeklyDiarySession): string {
  if (session.type === 'individual' || session.type === 'PRIVATE') return 'Індивідуальна сесія'
  if (session.type === 'battle_review') return 'Zoom Battle'
  if (session.type === 'intensive') return 'Zoom-інтенсив'
  return 'Групова практика'
}

type CoachScheduleStatus =
  | 'scheduled'
  | 'awaiting_payment'
  | 'pending_confirmation'
  | 'payment_attention'
  | 'unconfirmed'

function getScheduleStatus(
  session: CoachWeeklyDiarySession,
  commerce?: CoachCommercePresentation,
): CoachScheduleStatus {
  if (session.type === 'individual' || session.type === 'PRIVATE') {
    const state = resolveIndividualSessionState({
      sessionStatus: session.status,
      commerceStatus: commerce?.status,
    })
    if (state === 'SCHEDULED') return 'scheduled'
    if (state === 'PENDING_PAYMENT') return 'awaiting_payment'
    if (state === 'PENDING_CONFIRMATION') return 'pending_confirmation'
    if (state === 'REJECTED' || state === 'EXPIRED') return 'payment_attention'
    return 'unconfirmed'
  }

  return ['SCHEDULED', 'ACTIVE', 'COMPLETED'].includes(session.status)
    ? 'scheduled'
    : 'unconfirmed'
}

const COACH_SCHEDULE_STATUS_LABELS: Record<CoachScheduleStatus, string> = {
  scheduled: 'Заплановано',
  awaiting_payment: 'Очікує оплати',
  pending_confirmation: 'Очікує підтвердження',
  payment_attention: 'Потребує дії',
  unconfirmed: 'Потребує дії',
}

function getSessionTitle(session: CoachWeeklyDiarySession): string {
  const fallback = getSessionTypeLabel(session)
  const topic = session.topic.trim()
  if (!topic || topic.localeCompare(fallback, 'uk-UA', { sensitivity: 'accent' }) === 0) {
    return fallback
  }
  if (session.type === 'individual' || session.type === 'PRIVATE') return topic
  if (session.type === 'group_practice') return `${fallback} «${topic}»`
  return fallback
}

function getSessionClientName(
  session: CoachWeeklyDiarySession,
  commerce?: CoachCommercePresentation,
): string {
  if (session.type === 'individual' || session.type === 'PRIVATE') {
    return session.participantNames[0] ?? commerce?.participantName ?? 'Ім\'я не вказано'
  }

  if (session.type === 'battle_review') {
    if (session.challengerName && session.opponentName) {
      return `${session.challengerName} vs ${session.opponentName}`
    }
    if (session.participantNames.length >= 2) {
      return `${session.participantNames[0]} vs ${session.participantNames[1]}`
    }
  }

  return '—'
}

type CoachSchedulePresentation =
  | { kind: 'free' }
  | { kind: 'confirmed' }
  | { kind: 'awaiting_payment'; label: string }
  | { kind: 'attention'; label: string }

function getCoachSchedulePresentation(
  session: CoachWeeklyDiarySession,
  commerce?: CoachCommercePresentation,
): CoachSchedulePresentation {
  const status = getScheduleStatus(session, commerce)
  const hasIndividualParticipant = Boolean(
    session.participantNames[0] || commerce?.participantName,
  )

  if ((session.type === 'individual' || session.type === 'PRIVATE') && status === 'unconfirmed' && !hasIndividualParticipant) {
    return { kind: 'free' }
  }
  if (status === 'scheduled') return { kind: 'confirmed' }
  if (status === 'awaiting_payment') {
    return { kind: 'awaiting_payment', label: COACH_SCHEDULE_STATUS_LABELS[status] }
  }
  return { kind: 'attention', label: COACH_SCHEDULE_STATUS_LABELS[status] }
}

function formatAttentionDate(value: string): string {
  const [, month, day] = formatKyivDayKey(new Date(value)).split('-')
  return `${day}.${month}`
}

export function formatCoachWeeklyDiaryMessage(
  diary: CoachWeeklyDiary,
  coachName: string,
  now = new Date(),
  commerceBySessionId: ReadonlyMap<string, CoachCommercePresentation> = new Map(),
): string {
  const from = new Date(diary.week.from)
  const visibleDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(from)
    date.setDate(from.getDate() + index)
    return date
  })
  const visibleDayKeys = new Set(visibleDates.map(formatKyivDayKey))
  const visibleSessions = diary.sessions.filter((session) =>
    visibleDayKeys.has(formatKyivDayKey(new Date(session.scheduledAt))),
  )
  const sessions = visibleSessions
    .map((session) => ({
      session,
      presentation: getCoachSchedulePresentation(session, commerceBySessionId.get(session.id)),
    }))
    .sort((left, right) => new Date(left.session.scheduledAt).getTime() - new Date(right.session.scheduledAt).getTime())
  const summary = sessions.reduce(
    (counts, { presentation }) => {
      if (presentation.kind === 'confirmed') counts.confirmed += 1
      if (presentation.kind === 'awaiting_payment') counts.awaitingPayment += 1
      if (presentation.kind === 'free') counts.free += 1
      return counts
    },
    { confirmed: 0, awaitingPayment: 0, free: 0 },
  )
  const todaySessions = sessions
    .filter(({ session }) => formatKyivDayKey(new Date(session.scheduledAt)) === formatKyivDayKey(now))
    .filter(({ session }) => new Date(session.scheduledAt).getTime() >= now.getTime())
    .slice(0, 2)
  const todayBlock = todaySessions.length === 0
    ? 'Сьогодні сесій немає.'
    : todaySessions.map(({ session, presentation }) => {
      const time = escapeTelegramHtml(formatKyivTime(session.scheduledAt))
      if (presentation.kind === 'free') return `${time} · Вільний слот`
      const client = getSessionClientName(session, commerceBySessionId.get(session.id))
      const label = presentation.kind === 'confirmed' ? 'Підтверджена' : presentation.label
      return client === '—'
        ? `${time} · ${escapeTelegramHtml(label)}`
        : `${time} · ${escapeTelegramHtml(client)} · ${escapeTelegramHtml(label)}`
    }).join('\n')
  const attentionSessions = sessions
    .filter(({ presentation }) => presentation.kind === 'awaiting_payment' || presentation.kind === 'attention')
    .slice(0, 2)
  const attentionBlock = attentionSessions.length === 0
    ? null
    : [
      bold('ПОТРЕБУЄ УВАГИ'),
      attentionSessions.map(({ session, presentation }) => {
        const client = getSessionClientName(session, commerceBySessionId.get(session.id))
        const label = presentation.kind === 'awaiting_payment' || presentation.kind === 'attention'
          ? presentation.label
          : ''
        return [
          formatAttentionDate(session.scheduledAt),
          formatKyivTime(session.scheduledAt),
          client === '—' ? getSessionTitle(session) : client,
          label,
        ].map(escapeTelegramHtml).join(' · ')
      }).join('\n'),
    ].join('\n')
  return joinBlocks([
    [
      `Вітаю, ${escapeTelegramHtml(coachName)}! 👋`,
      bold('ТВІЙ РОЗКЛАД НА ЦЕЙ ТИЖДЕНЬ'),
    ].join('\n'),
    formatWeekRange(diary.week),
    `${visibleSessions.length} ${pluralizeSessionCount(visibleSessions.length)} · ${summary.confirmed} оплачені · ${summary.awaitingPayment} очікують оплати · ${summary.free} вільні`,
    [bold('СЬОГОДНІ'), todayBlock].join('\n'),
    attentionBlock,
  ])
}

export async function showCoachMenu(
  ctx: Context,
  options: { suppressRepeatedWeeklyDigest?: boolean } = {},
): Promise<void> {
  const coach = await resolveCoachAccess(ctx)
  if (!coach) {
    await replyWithTelegramMessage(ctx, coachBotContent.access.denied)
    return
  }

  const now = new Date()
  const weekStartDate = formatKyivDayKey(startOfKyivWeek(now))
  const digestKey = `coach_start_weekly_digest:${coach.id}:${weekStartDate}`
  const lastSentAt = coachWeeklyDigestSentAt.get(digestKey)
  const calendarUrl = await resolveCoachCalendarUrl(ctx)

  if (
    options.suppressRepeatedWeeklyDigest &&
    lastSentAt &&
    now.getTime() - lastSentAt < COACH_WEEKLY_DIGEST_TTL_MS
  ) {
    await replyWithTelegramMessage(
      ctx,
      'Розклад уже оновлено. Відкрий Zoom календар нижче.',
      buildCoachMainMenuInlineMarkup(calendarUrl),
    )
    return
  }

  const coachScope = buildExpertScopeWhere(coach)
  const diary = await getCoachWeeklyDiary({
    userId: coach.id,
    expertId: 'expertId' in coachScope ? coachScope.expertId : undefined,
  })
  const commerceRequests = await getCalendarRequests({
    zoomSessionIds: diary.sessions.map((session) => session.id),
    includeInactive: true,
  })
  const requesterIds = [...new Set(commerceRequests.map((request) => request.requesterUserId))]
  const requesters = requesterIds.length
    ? await prisma.user.findMany({
        where: { id: { in: requesterIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : []
  const requesterNames = new Map(requesters.map((requester) => [
    requester.id,
    [requester.firstName, requester.lastName].filter(Boolean).join(' ').trim()
      || requester.email
      || null,
  ]))
  const commercePriority = {
    REQUESTED: 1,
    APPROVED_PENDING_PAYMENT: 2,
    PAID: 3,
    REJECTED: 4,
    EXPIRED: 4,
  } as const
  const commerceBySessionId = new Map<string, CoachCommercePresentation>()
  for (const request of commerceRequests) {
    if (!request.zoomSessionId || !(request.status in commercePriority)) continue
    const status = request.status as CoachCommercePresentation['status']
    const current = commerceBySessionId.get(request.zoomSessionId)
    if (!current || commercePriority[status] > commercePriority[current.status]) {
      commerceBySessionId.set(request.zoomSessionId, {
        status,
        participantName: requesterNames.get(request.requesterUserId) ?? null,
      })
    }
  }
  const firstName = String(ctx.from?.first_name ?? '').trim() || 'коуч'

  const text = formatCoachWeeklyDiaryMessage(diary, firstName, new Date(), commerceBySessionId)

  await replyWithTelegramMessage(ctx, text, buildCoachMainMenuInlineMarkup(calendarUrl))
  if (options.suppressRepeatedWeeklyDigest) {
    coachWeeklyDigestSentAt.set(digestKey, now.getTime())
  }
}

export function buildCoachMainMenuInlineMarkup(calendarUrl: string) {
  const coachPanelUrl = (panel: (typeof COACH_NAVIGATION_CONTRACT.sections)[number]['panel']) =>
    `${calendarUrl.split('#')[0]}#${panel}`
  const [participants, battle, analytics, more] = COACH_NAVIGATION_CONTRACT.sections

  return {
    reply_markup: {
      inline_keyboard: [
        [
          Markup.button.webApp(
            COACH_NAVIGATION_CONTRACT.calendar.label,
            calendarUrl.split('#')[0],
          ),
        ],
        [
          Markup.button.webApp(participants.label, coachPanelUrl(participants.panel)),
          Markup.button.webApp(battle.label, coachPanelUrl(battle.panel)),
        ],
        [
          Markup.button.webApp(analytics.label, coachPanelUrl(analytics.panel)),
          Markup.button.webApp(more.label, coachPanelUrl(more.panel)),
        ],
      ],
    },
  }
}

export function buildCoachMainMenuReplyMarkup(
  role: 'ADMIN' | 'EXPERT' | 'SUPERADMIN' = 'EXPERT',
  calendarUrl?: string
) {
  /*
   * A ReplyKeyboardMarkup hides Telegram's persistent blue Menu Button.
   * The canonical Coach calendar is the bot-level WebApp menu; secondary
   * navigation stays inline on the message.
   */
  void role

  return calendarUrl
    ? buildCoachMainMenuInlineMarkup(calendarUrl)
    : { reply_markup: { inline_keyboard: [] } }
}

export async function showCoachSystemMenu(ctx: Context): Promise<void> {
  const coach = await resolveCoachAccess(ctx)
  if (coach?.role !== 'SUPERADMIN') {
    await replyWithTelegramMessage(ctx, 'Налаштування доступні лише SUPERADMIN.')
    return
  }
  const calendarUrl = await resolveCoachCalendarUrl(ctx)

  await replyOrEditPanelMessage(
    ctx,
    `${coachBotContent.system.title}\n\n${coachBotContent.system.subtitle}`,
    {
      ...buildCoachMainMenuReplyMarkup(coach.role, calendarUrl),
      ...Markup.inlineKeyboard([
        [Markup.button.callback(coachBotContent.system.actions.back, COACH_SETTINGS_BACK_ACTION)],
      ]),
    }
  )
}

export async function showCoachSettingsBack(ctx: Context): Promise<void> {
  await ctx.answerCbQuery().catch(() => undefined)
  await showCoachMenu(ctx)
}

export async function showCoachAgentsMenu(ctx: Context): Promise<void> {
  const agentsUrl = await resolveCoachAgentsUrl(ctx)
  const calendarUrl = await resolveCoachCalendarUrl(ctx)
  const webappBase = resolveCoachWebAppBaseUrl()
  const coach = await resolveCoachAccess(ctx)
  const chatId = String(ctx.chat?.id ?? ctx.from?.id ?? '').trim()
  const previousMessageId = chatId ? lastCoachAgentsMessageByChat.get(chatId) ?? null : null

  if (chatId && previousMessageId) {
    await ctx.telegram.deleteMessage(chatId, previousMessageId).catch(() => undefined)
  }

  const replyMessage = await replyWithTelegramMessage(ctx,
    `${coachBotContent.system.agentsTitle}\n\n${coachBotContent.system.agentsSubtitle}`,
    {
      ...buildCoachMainMenuReplyMarkup(coach?.role ?? 'EXPERT', calendarUrl),
      ...Markup.inlineKeyboard([
        [Markup.button.webApp(coachBotContent.system.agentsCta, agentsUrl)],
      ]),
    }
  )

  if (chatId && typeof replyMessage?.message_id === 'number') {
    lastCoachAgentsMessageByChat.set(chatId, replyMessage.message_id)
  }

  console.info('[COACH_AGENTS_BUTTON_DEBUG]', {
    source: 'coachStart.showCoachAgentsMenu',
    chatId,
    finalUrl: agentsUrl,
    mode: 'web_app',
    webappBase,
    route: COACH_AGENTS_RETURN_TARGET,
  })
}
