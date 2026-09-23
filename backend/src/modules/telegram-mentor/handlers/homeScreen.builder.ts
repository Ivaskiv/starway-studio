import { getIndividualSessionStatusLabel } from '../../zoom/domain/individual-session-lifecycle.js'
import type { StartContext } from './start.shared.js'
import { type StartUserSnapshot, getHoursSince } from './start.js'
import { loadAbTestProgress } from '@/products/ab-system/telegram/progress.js'
import {
  getAbTestResultDefinition,
  interpolateFirstName,
} from '@/products/ab-system/content/abTest.results.js'
import { getUserAccessState } from '../../subscriptions/payments/focus-access.js'
import {
  getCurrentWeekZoomOverview,
  getUpcomingZoomBookingView,
} from '../../zoom/service.js'
import {
  getCommerceCheckoutUrl,
  getUserCalendarRequestsForWindow,
} from '../../zoom/commerce/zoom.commerce-request.service.js'
import { buildZoomCalendarUrl } from '../../zoom/urls.js'
import {
  buildCanonicalResultKeyboard,
  resolveCanonicalResultActionPolicy,
} from '@/products/ab-system/telegram/keyboard-policy.js'
import { bold, escapeTelegramHtml, joinBlocks } from '../../../lib/telegram/messageFormatter.js'
import {
  type StartMessagePayload,
  expiredMessage,
  offerShownMessage,
  postZoom1Message,
  testDoneMessage,
  testInProgressMessage,
  upsellMessage,
  welcomeMessage,
  testNotStartedMessage,
  zoomSection,
  zoomMemberMessage,
} from './abTest.start.js'

const KYIV_TIMEZONE = 'Europe/Kyiv'
const DAY_MS = 24 * 60 * 60 * 1000

type HomeMessagePayload = StartMessagePayload & {
  digestText?: string
}

function getKyivDateKey(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: KYIV_TIMEZONE,
  }).format(value)
}

function formatWeekRange(from: Date, to: Date): string {
  const month = (value: Date) => new Intl.DateTimeFormat('uk-UA', {
    month: 'long',
    timeZone: KYIV_TIMEZONE,
  }).format(value).replace(/\.$/, '').toLocaleUpperCase('uk-UA')
  const day = (value: Date) => new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    timeZone: KYIV_TIMEZONE,
  }).format(value)

  return month(from) === month(to)
    ? `${day(from)}–${day(to)} ${month(to)}`
    : `${day(from)} ${month(from)} – ${day(to)} ${month(to)}`
}

function formatSessionTime(value: string): string {
  return new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: KYIV_TIMEZONE,
  }).format(new Date(value))
}

function formatCommercePaymentLabel(amount: unknown, currency: string): string {
  const value = Number(amount)
  const formattedAmount = new Intl.NumberFormat('uk-UA', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
  return `${formattedAmount} ${currency === 'UAH' ? 'ГРН' : currency}`
}

function formatAccessDate(value: Date | null): string | null {
  if (!value) return null

  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: KYIV_TIMEZONE,
  }).format(value).replace(/\.$/, '')
}

function formatZoomDateTime(value: Date): string {
  const dateLabel = new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    timeZone: KYIV_TIMEZONE,
  }).format(value)

  const timeLabel = new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: KYIV_TIMEZONE,
  }).format(value)

  return `${dateLabel} о ${timeLabel} за Києвом`
}

function resolveAccessStatusText(input: {
  state: Awaited<ReturnType<typeof getUserAccessState>> | null
}): string {
  const expiresAt = formatAccessDate(input.state?.expiresAt ?? null)

  switch (input.state?.state) {
    case 'PREMIUM':
      return expiresAt
        ? `Зараз у тебе активний пробний доступ до Zoom до ${expiresAt}.`
        : 'Зараз у тебе активний пробний доступ до Zoom.'

    case 'FOCUS_ACTIVE':
      return expiresAt
        ? `Зараз у тебе активна підписка ФОКУС до ${expiresAt}.`
        : 'Зараз у тебе активна підписка ФОКУС.'

    case 'FREE_WEEK1':
      return expiresAt
        ? `Зараз у тебе активний безкоштовний доступ до першого тижня ФОКУС до ${expiresAt}.`
        : 'Зараз у тебе активний безкоштовний доступ до першого тижня ФОКУС.'

    case 'NO_ACCESS':
    default:
      return expiresAt
        ? `Зараз активного доступу до Zoom-практик немає. Попередній доступ завершився ${expiresAt}.`
        : 'Зараз активного доступу до Zoom-практик немає.'
  }
}

function resolveZoomStatusText(input: {
  upcomingZoom: Awaited<ReturnType<typeof getUpcomingZoomBookingView>> | null
}): string[] {
  if (!input.upcomingZoom) {
    return ['Найближча групова Zoom-практика ще не запланована.']
  }

  return [
    `Найближча групова Zoom-практика — ${formatZoomDateTime(input.upcomingZoom.scheduledAt)}.`,
    input.upcomingZoom.isMyBooking
      ? 'Ти вже записана на неї.'
      : 'Ти ще не записувалась на неї.',
  ]
}

function formatSessionType(value: string): 'group' | 'individual' | 'battle' | 'intensive' | 'other' {
  switch (value.toLowerCase()) {
    case 'group':
    case 'group_practice':
      return 'group'
    case 'individual':
    case 'private':
      return 'individual'
    case 'battle_review':
      return 'battle'
    case 'intensive':
      return 'intensive'
    default:
      return 'other'
  }
}

function formatSessionStatus(
  value: string,
  commerceStatus?: string,
  isIndividual = false,
): string {
  if (isIndividual) {
    return getIndividualSessionStatusLabel({
      role: 'user',
      sessionStatus: value,
      commerceStatus: commerceStatus as
        | 'REQUESTED'
        | 'APPROVED_PENDING_PAYMENT'
        | 'PAID'
        | 'REJECTED'
        | 'EXPIRED'
        | 'CANCELLED'
        | undefined,
    })
  }

  switch (value.toUpperCase()) {
    case 'SCHEDULED':
      return 'Заплановано'
    case 'ACTIVE':
      return 'Активна'
    case 'COMPLETED':
      return 'Завершено'
    case 'CANCELLED':
      return 'Скасовано'
    default:
      return 'Статус недоступний'
  }
}

function formatWeeklySchedule(
  overview: Awaited<ReturnType<typeof getCurrentWeekZoomOverview>>,
  commerceBySessionId: ReadonlyMap<string, string>,
): { blocks: string[]; total: number } {
  const from = new Date(overview.week.from)
  const to = new Date(from.getTime() + 6 * DAY_MS)
  const sessionsByDay = new Map<string, typeof overview.sessions>()
  const todayKey = getKyivDateKey(new Date())

  for (const session of overview.sessions) {
    const key = getKyivDateKey(new Date(session.scheduledAt))
    sessionsByDay.set(key, [...(sessionsByDay.get(key) ?? []), session])
  }

  const blocks = [bold(formatWeekRange(from, to))]
  let total = 0

  for (let index = 0; index < 7; index += 1) {
    const day = new Date(from.getTime() + index * DAY_MS)
    const key = getKyivDateKey(day)
    const weekday = new Intl.DateTimeFormat('uk-UA', {
      weekday: 'short',
      timeZone: KYIV_TIMEZONE,
    }).format(day).replace(/\.$/, '')
    const [, month, date] = key.split('-')
    const dayLabel = `${weekday.toLocaleUpperCase('uk-UA')} · ${Number(date)}.${month}${key === todayKey ? ' · Сьогодні' : ''}`
    const daySessions = [...(sessionsByDay.get(key) ?? [])].sort(
      (left, right) =>
        new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
    )

    if (daySessions.length === 0) continue
    const sessionLines: string[] = []

    for (const session of daySessions) {
      const sessionType = formatSessionType(session.type)
      const time = formatSessionTime(session.scheduledAt)
      const topic = session.topic.trim()
      const status = formatSessionStatus(
        session.status,
        commerceBySessionId.get(session.id),
        sessionType === 'individual',
      )
      const escapedTime = escapeTelegramHtml(time)
      const escapedTopic = escapeTelegramHtml(topic)
      const escapedStatus = escapeTelegramHtml(status)

      if (sessionType === 'group') {
        const count = session.attendeesCount > 0 ? `${session.attendeesCount} учасників` : ''
        sessionLines.push([
          `🟢 ${escapedTime}`,
          `Групова практика${topic ? ` «${escapedTopic}»` : ''}`,
          count,
          escapedStatus,
        ].filter(Boolean).join(' · '))
      } else if (sessionType === 'individual') {
        sessionLines.push([
          `🔵 ${escapedTime}`,
          'Індивідуальна',
          escapedTopic,
          escapedStatus,
        ].filter(Boolean).join(' · '))
      } else if (sessionType === 'battle') {
        sessionLines.push([
          `🟣 ${escapedTime}`,
          'Zoom Battle',
          escapedTopic,
          escapedStatus,
        ].filter(Boolean).join(' · '))
      } else {
        sessionLines.push([
          escapedTime,
          sessionType === 'intensive' ? 'Інтенсив' : 'Zoom-сесія',
          escapedTopic,
          escapedStatus,
        ].filter(Boolean).join(' · '))
      }
    }
    total += daySessions.length
    blocks.push([bold(dayLabel), ...sessionLines].join('\n'))
  }

  return { blocks, total }
}

async function loadUserHomeSchedule(userId: string) {
  const overview = await getCurrentWeekZoomOverview({
    userId,
    role: 'user',
  })

  const commerceRequests = await getUserCalendarRequestsForWindow({
    requesterUserId: userId,
    from: new Date(overview.week.from),
    to: new Date(overview.week.to),
    includeInactive: true,
  })

  // Requests are returned newest first. One session gets exactly one
  // effective commerce state in the USER presentation.
  const commerceBySessionId = new Map<string, string>()
  for (const request of commerceRequests) {
    if (request.zoomSessionId && !commerceBySessionId.has(request.zoomSessionId)) {
      commerceBySessionId.set(request.zoomSessionId, request.status)
    }
  }

  // Calendar overview does not necessarily contain REQUESTED/PENDING
  // Individual/Battle sessions because the requester is not an attendee
  // until payment. Merge those USER-owned commerce sessions here.
  const mergedSessions = new Map(
    overview.sessions.map(session => [session.id, session] as const),
  )

  for (const request of commerceRequests) {
    const session = request.zoomSession
    if (!session || mergedSessions.has(session.id)) continue


    mergedSessions.set(session.id, {
      id: session.id,
      scheduledAt: session.scheduledAt.toISOString(),
      topic: session.topic,
      status: session.status,
      type: session.type,
      zoomLink: '',
      attendeesCount: 0,
      questionPreviews: [],
      questionsCount: 0,
      remainingQuestionsCount: 0,
      isMyBooking: request.status === 'PAID',
      audioFileId: null,
      hasAudio: false,
    })
  }

  const mergedOverview = {
    ...overview,
    sessions: [...mergedSessions.values()].sort(
      (left, right) =>
        new Date(left.scheduledAt).getTime()
        - new Date(right.scheduledAt).getTime(),
    ),
  }

  const paymentButtons: StartMessagePayload['buttons'] = []

  for (const request of commerceRequests) {
    if (
      request.status !== 'APPROVED_PENDING_PAYMENT'
      || !request.zoomSessionId
      || commerceBySessionId.get(request.zoomSessionId) !== request.status
    ) {
      continue
    }

    const url = await getCommerceCheckoutUrl(request.id, userId)

    if (url) {
      paymentButtons.push([{
        text: `ОПЛАТИТИ СЕСІЮ — ${formatCommercePaymentLabel(request.amount, request.currency)}`,
        url,
      }])
    }
  }

  const zoomCalendarUrl = buildZoomCalendarUrl()
  const userZoomCalendarUrl =
    `${zoomCalendarUrl}${zoomCalendarUrl.includes('?') ? '&' : '?'}zoomRole=user`

  return {
    schedule: formatWeeklySchedule(mergedOverview, commerceBySessionId),
    userZoomCalendarUrl,
    paymentButtons,
  }
}

export async function buildUserSessionsMessage(userId: string): Promise<StartMessagePayload> {
  const { schedule, userZoomCalendarUrl, paymentButtons } = await loadUserHomeSchedule(userId)
  return {
    text: joinBlocks([
      bold('Мої сесії'),
      ...(schedule.total ? schedule.blocks : ['Запланованих сесій поки немає']),
    ]),
    buttons: [...paymentButtons, [{ text: '📅 ВІДКРИТИ МІЙ КАЛЕНДАР ZOOM', web_app: { url: userZoomCalendarUrl } }]],
  }
}

function headerSection(user: StartUserSnapshot): string | null {
  const name = (user.firstName ?? '').trim()
  if (!name) return null
  return name
}

async function resolveCompletedUserHome(
  user: StartUserSnapshot,
  input?: {
    accessState?: Awaited<ReturnType<typeof getUserAccessState>> | null
  },
): Promise<HomeMessagePayload | null> {
  const progress = await loadAbTestProgress(user.id).catch(() => null)

  if (progress?.status !== 'completed' || !progress.result_key) {
    return null
  }

  const result = getAbTestResultDefinition(progress.result_key)
  const diagnosticText = interpolateFirstName(result.msg1, user.firstName)

  const [resolvedAccessState, upcomingZoom] = await Promise.all([
    input && 'accessState' in input
      ? Promise.resolve(input.accessState ?? null)
      : getUserAccessState(user.id).catch(() => null),
    getUpcomingZoomBookingView(user.id).catch(() => null),
  ])

  const greeting = user.firstName?.trim()
    ? `${escapeTelegramHtml(user.firstName.trim())}, рада бачити тебе знову.`
    : 'Рада бачити тебе знову.'

  const hasZoomAccess =
    resolvedAccessState?.state === 'PREMIUM'
    || resolvedAccessState?.state === 'FOCUS_ACTIVE'
    || resolvedAccessState?.state === 'FREE_WEEK1'

  const bookedUpcoming = upcomingZoom?.isMyBooking === true

  const currentStateText = hasZoomAccess
    ? bookedUpcoming
      ? 'Ти вже перейшла від результату до Zoom-практики і записалась на найближчу зустріч.'
      : 'Ти вже перейшла від результату до Zoom-практики і зараз можеш обрати найближчу зустріч.'
    : 'Ти вже побачила свій результат, але до Zoom-практики ще не переходила.'

  const zoomStatusLines = resolveZoomStatusText({ upcomingZoom })

  if (hasZoomAccess) {
    const nextStepText = bookedUpcoming
      ? '<b>Наступний крок:</b> відкрий деталі найближчої Zoom-практики і продовжуй з тієї точки, де зупинилась.'
      : '<b>Наступний крок:</b> обери найближчу Zoom-практику і запишись.'

    const programKeyboard = buildCanonicalResultKeyboard({
      resultKey: progress.result_key,
      hasFocus: false,
      isMyBooking: bookedUpcoming,
      zoomCalendarUrl: buildZoomCalendarUrl({ intent: 'booking' }),
    })

    const secondaryRows =
      programKeyboard.inline_keyboard.slice(1) as unknown as StartMessagePayload['buttons']

    return {
      text: [
        greeting,
        '',
        `Минулого разу твій тест показав <b>${result.title}</b>:`,
        '',
        diagnosticText,
        '',
        currentStateText,
        '',
        resolveAccessStatusText({ state: resolvedAccessState }),
        '',
        ...zoomStatusLines,
        '',
        nextStepText,
      ].join('\n'),
      buttons: [
        [{
          text: bookedUpcoming ? 'ПЕРЕГЛЯНУТИ ЗАПИС' : 'ОБРАТИ ZOOM-ПРАКТИКУ',
          web_app: {
            url: buildZoomCalendarUrl({
              intent: bookedUpcoming ? undefined : 'booking',
            }),
          },
        }],
        ...secondaryRows,
      ],
    }
  }

  const keyboardState = {
    resultKey: progress.result_key,
    hasFocus: resolvedAccessState?.hasFocus === true,
    isMyBooking: upcomingZoom?.isMyBooking === true,
    zoomCalendarUrl: buildZoomCalendarUrl({ intent: 'booking' }),
  } as const

  const replyMarkup = buildCanonicalResultKeyboard(keyboardState)
  const resultSummary = diagnosticText
    .replace(/^[^\n]*,\s*ось твій результат\.\s*\n?/i, '')
    .trim()
  const zoomSection = upcomingZoom
    ? [
        formatZoomDateTime(upcomingZoom.scheduledAt),
        bookedUpcoming ? 'Ти вже записана на неї.' : 'Ти ще не записувалась на неї.',
      ].join('\n')
    : zoomStatusLines.join('\n')

  return {
    text: joinBlocks([
      greeting,
      `✨ ${bold(`Твій результат — ${result.title}`)}`,
      resultSummary ? escapeTelegramHtml(resultSummary) : null,
      'Ти вже побачила свій результат. Зараз важливо перейти до наступного кроку.',
      `📅 ${bold('НАЙБЛИЖЧА ZOOM-ПРАКТИКА')}`,
      zoomSection,
      `🔒 ${bold('ФОКУС')}`,
      resolveAccessStatusText({ state: resolvedAccessState }),
      'Обери формат участі, щоб продовжити роботу зі своєю ситуацією.',
    ]),
    buttons: replyMarkup.inline_keyboard as StartMessagePayload['buttons'],
  }
}

async function resolveBodySection(
  user: StartUserSnapshot,
  ctx: StartContext,
  input?: {
    accessState?: Awaited<ReturnType<typeof getUserAccessState>> | null
  },
): Promise<HomeMessagePayload> {
  void ctx

  const completedUserHome = await resolveCompletedUserHome(user, input)
  if (completedUserHome) {
    return completedUserHome
  }

  switch (user.lifecycleState) {
    case 'NEW_USER': {
      const payload = welcomeMessage()
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'TEST_NOT_STARTED': {
      const payload = testNotStartedMessage({ escalated: false })
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'TEST_IN_PROGRESS': {
      const hoursSince = getHoursSince(user.updatedAt)
      const hasExistingResult = Boolean(user.testResultType)
      if (hoursSince > 168) {
        const staleButtons: Array<Array<{ text: string; callback_data: string }>> = [
          [
            { text: 'ПРОДОВЖИТИ', callback_data: 'ab_test:resume' },
            { text: 'ПОЧАТИ ЗАНОВО', callback_data: 'ab_test:restart' },
          ],
        ]
        if (hasExistingResult) {
          staleButtons.push([{ text: 'МІЙ ПОПЕРЕДНІЙ РЕЗУЛЬТАТ', callback_data: 'ab_test:show_result' }])
        }
        return {
          text: 'Ти вже починала тест, але пройшло більше тижня.\n\nВідповіді можуть бути неактуальні.',
          buttons: staleButtons,
        }
      }
      const payload = testInProgressMessage({ r3: hoursSince > 4, hasExistingResult })
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'TEST_DONE': {
      const payload = testDoneMessage()
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'OFFER_SHOWN': {
      const payload = offerShownMessage()
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'FOCUS_PAID': {
      return zoomSection(user.id)
    }
    case 'ZOOM_MEMBER': {
      const payload = await zoomMemberMessage(user.id)
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'POST_ZOOM_1': {
      const payload = postZoom1Message(user.id)
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'UPSELL': {
      const payload = upsellMessage(user.id)
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    case 'EXPIRED': {
      const payload = expiredMessage()
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
    default: {
      const payload = welcomeMessage()
      return { text: payload.text, buttons: payload.reply_markup.inline_keyboard }
    }
  }
}

export async function buildHomeScreen(
  user: StartUserSnapshot,
  ctx: StartContext,
  input?: {
    accessState?: Awaited<ReturnType<typeof getUserAccessState>> | null
  },
): Promise<{
  text: string
  reply_markup: { inline_keyboard: StartMessagePayload['buttons'] }
  parseMode?: 'HTML'
  digestText?: string
}> {
  const header = headerSection(user)
  const body = await resolveBodySection(user, ctx, input)
  const hasPersonalGreeting =
    body.text.startsWith('Вітаю') ||
    body.text.includes('рада бачити тебе знову.') ||
    body.digestText?.startsWith('Вітаю')
  return {
    text: header && !hasPersonalGreeting ? `${header}\n\n${body.text}` : body.text,
    reply_markup: { inline_keyboard: body.buttons },
    digestText: body.digestText,
    parseMode: 'HTML',
  }
}
