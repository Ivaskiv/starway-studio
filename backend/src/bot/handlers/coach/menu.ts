import { getIndividualSessionStatusLabel } from '../../../modules/zoom/domain/individual-session-lifecycle.js'
import type { Context } from 'telegraf'
import { Markup } from 'telegraf'
import type { KeyboardButton } from '@telegraf/types'

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
import { toMutableReplyKeyboard } from '../../../utils/keyboard.js'
import { coachBotContent } from '../../content/coachBot.content.js'
import { resolveCoachUserId } from './access.js'
import { resolveCoachWebAppBaseUrl } from '../../../config/webapp.js'
import {
  buildExpertScopeWhere,
  replyOrEditPanelMessage,
  resolveCoachAccess,
} from '../coach-content/shared.js'

const lastCoachAgentsMessageByChat = new Map<string, number>()

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

const BATTLE_STATUS_LABELS: Record<string, string> = {
  pending: 'Очікує підтвердження',
  active: 'Активний',
  completed: 'Завершено',
  cancelled: 'Скасовано',
}

type CoachCommercePresentation = {
  status: 'REQUESTED' | 'APPROVED_PENDING_PAYMENT' | 'PAID'
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

function formatWeekDayHeader(date: Date, now: Date): string {
  const label = new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'Europe/Kyiv',
    weekday: 'short',
  }).format(date).replace(/\.$/, '')
  const [, month, day] = formatKyivDayKey(date).split('-')
  const isToday = formatKyivDayKey(date) === formatKyivDayKey(now)
  return `${label.toLocaleUpperCase('uk-UA')} · ${Number(day)}.${month}${isToday ? ' · Сьогодні' : ''}`
}

function formatWeekRange(week: CoachWeeklyDiary['week']): string {
  const from = new Date(week.from)
  const to = new Date(from.getTime() + 6 * 24 * 60 * 60 * 1000)
  const month = (value: Date) => value.toLocaleDateString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    month: 'long',
  }).replace(/\.$/, '').toLocaleUpperCase('uk-UA')
  const day = (value: Date) => value.toLocaleDateString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: 'numeric',
  })

  return month(from) === month(to)
    ? `${day(from)}–${day(to)} ${month(to)}`
    : `${day(from)} ${month(from)} – ${day(to)} ${month(to)}`
}

function pluralizeSessionCount(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'сесія'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'сесії'
  return 'сесій'
}

function pluralizeBattleCount(count: number): string {
  return count === 1 ? 'активний battle' : 'активних battle'
}

function getSessionTypeLabel(session: CoachWeeklyDiarySession): string {
  if (session.type === 'individual' || session.type === 'PRIVATE') return 'Індивідуальна сесія'
  if (session.type === 'battle_review') return 'Zoom Battle'
  if (session.type === 'intensive') return 'Zoom-інтенсив'
  return 'Групова практика'
}

function getStatusLabel(
  session: CoachWeeklyDiarySession,
  commerce?: CoachCommercePresentation,
): string {
  if (session.type === 'individual' || session.type === 'PRIVATE') {
    return getIndividualSessionStatusLabel({
      role: 'coach',
      sessionStatus: session.status,
      commerceStatus: commerce?.status,
    })
  }

  if (session.battleStatus && BATTLE_STATUS_LABELS[session.battleStatus]) {
    return BATTLE_STATUS_LABELS[session.battleStatus]
  }
  if (session.status === 'SCHEDULED') return 'Заплановано'
  if (session.status === 'COMPLETED') return 'Завершено'
  if (session.status === 'CANCELLED') return 'Скасовано'
  if (session.status === 'ACTIVE') return 'Активна'
  return 'Статус недоступний'
}

function getBattleParticipantLine(session: CoachWeeklyDiarySession): string | null {
  if (session.challengerName && session.opponentName) {
    return `${session.challengerName} vs ${session.opponentName}`
  }
  if (session.participantNames.length >= 2) {
    return `${session.participantNames[0]} vs ${session.participantNames[1]}`
  }
  return null
}

function formatCoachDiarySession(
  session: CoachWeeklyDiarySession,
  commerce?: CoachCommercePresentation,
): string {
  const isIndividual = session.type === 'individual' || session.type === 'PRIVATE'
  const icon = session.type === 'battle_review' ? '🟣' : isIndividual ? '🔵' : '🟢'
  const segments = [
    `${icon} ${escapeTelegramHtml(formatKyivTime(session.scheduledAt))}`,
    getSessionTypeLabel(session),
  ]

  if (session.type === 'battle_review') {
    const participantLine = getBattleParticipantLine(session)
    if (participantLine) segments.push(escapeTelegramHtml(participantLine))
    if (session.topic.trim()) segments.push(escapeTelegramHtml(session.topic.trim()))
    segments.push(getStatusLabel(session, commerce))
    return segments.join(' · ')
  }

  if (isIndividual) {
    const participant = session.participantNames[0] ?? commerce?.participantName
    if (participant) segments.push(escapeTelegramHtml(participant))
    if (session.topic.trim()) segments.push(escapeTelegramHtml(session.topic.trim()))
    segments.push(getStatusLabel(session, commerce))
    return segments.join(' · ')
  }

  if (session.topic.trim()) segments[1] += ` «${escapeTelegramHtml(session.topic.trim())}»`
  const capacity = session.attendeesCount + session.remainingSlots
  segments.push(`${session.attendeesCount}/${capacity}`)
  segments.push(getStatusLabel(session, commerce))
  return segments.join(' · ')
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
  const sessionsByDay = new Map<string, CoachWeeklyDiarySession[]>()
  for (const session of visibleSessions) {
    const key = formatKyivDayKey(new Date(session.scheduledAt))
    sessionsByDay.set(key, [...(sessionsByDay.get(key) ?? []), session])
  }

  const dayBlocks = visibleDates.flatMap((date) => {
    const sessions = sessionsByDay.get(formatKyivDayKey(date)) ?? []
    if (sessions.length === 0) return []
    const body = sessions
      .map((session) => formatCoachDiarySession(session, commerceBySessionId.get(session.id)))
      .join('\n')
    return [[bold(formatWeekDayHeader(date, now)), body].join('\n')]
  })
  const activeBattles = visibleSessions.filter(
    (session) => session.type === 'battle_review' && session.battleStatus === 'active'
  ).length

  const battleSummary = activeBattles > 0
    ? ` · ${activeBattles} ${pluralizeBattleCount(activeBattles)}`
    : ''
  return joinBlocks([
    [
      `Вітаю, ${escapeTelegramHtml(coachName)}! 👋`,
      'Твій розклад на цей тиждень',
    ].join('\n'),
    bold(formatWeekRange(diary.week)),
    ...dayBlocks,
    bold(`Разом: ${visibleSessions.length} ${pluralizeSessionCount(visibleSessions.length)}${battleSummary}`),
  ])
}

export async function showCoachMenu(ctx: Context): Promise<void> {
  const coach = await resolveCoachAccess(ctx)
  if (!coach) {
    await replyWithTelegramMessage(ctx, coachBotContent.access.denied)
    return
  }

  const coachScope = buildExpertScopeWhere(coach)
  const diary = await getCoachWeeklyDiary({
    userId: coach.id,
    expertId: 'expertId' in coachScope ? coachScope.expertId : undefined,
  })
  const commerceRequests = await getCalendarRequests({
    zoomSessionIds: diary.sessions.map((session) => session.id),
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
  const commercePriority = { REQUESTED: 1, APPROVED_PENDING_PAYMENT: 2, PAID: 3 } as const
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
  const calendarUrl = await resolveCoachCalendarUrl(ctx)

  const text = formatCoachWeeklyDiaryMessage(diary, firstName, new Date(), commerceBySessionId)

  await replyWithTelegramMessage(ctx, text, buildCoachMainMenuReplyMarkup(coach.role, calendarUrl))
}

export function buildCoachMainMenuReplyMarkup(
  role: 'ADMIN' | 'EXPERT' | 'SUPERADMIN' = 'EXPERT',
  calendarUrl?: string
) {
  const coachPanelUrl = (panel: 'participants' | 'battle' | 'analytics' | 'more') =>
    calendarUrl ? `${calendarUrl.split('#')[0]}#${panel}` : null
  const participantsUrl = coachPanelUrl('participants')
  const battleUrl = coachPanelUrl('battle')
  const analyticsUrl = coachPanelUrl('analytics')
  const moreUrl = coachPanelUrl('more')
  const keyboard: KeyboardButton[][] = [
    [participantsUrl
      ? Markup.button.webApp(coachBotContent.menu.members, participantsUrl)
      : coachBotContent.menu.members,
    battleUrl
      ? Markup.button.webApp(coachBotContent.menu.battle, battleUrl)
      : coachBotContent.menu.battle],
    [analyticsUrl
      ? Markup.button.webApp(coachBotContent.menu.analytics, analyticsUrl)
      : coachBotContent.menu.analytics,
    moreUrl
      ? Markup.button.webApp(coachBotContent.menu.more, moreUrl)
      : coachBotContent.menu.more],
  ]
  void role

  return {
    reply_markup: toMutableReplyKeyboard({
      keyboard,
      resize_keyboard: true,
      is_persistent: true,
    }),
  }
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
