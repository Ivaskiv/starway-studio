import type { StartContext } from './start.shared.js'
import { type StartUserSnapshot, getHoursSince } from './start.js'
import { loadAbTestProgress } from '@/products/ab-system/telegram/progress.js'
import {
  getAbTestResultDefinition,
  interpolateFirstName,
} from '@/products/ab-system/content/abTest.results.js'
import { getUserAccessState } from '../../subscriptions/payments/focus-access.js'
import { getUpcomingZoomBookingView } from '../../zoom/service.js'
import { buildZoomCalendarUrl } from '../../zoom/urls.js'
import {
  buildCanonicalResultKeyboard,
  resolveCanonicalResultActionPolicy,
} from '@/products/ab-system/telegram/keyboard-policy.js'
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

function headerSection(user: StartUserSnapshot): string | null {
  const name = (user.firstName ?? '').trim()
  if (!name) return null
  return name
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

async function resolveCompletedUserHome(
  user: StartUserSnapshot,
): Promise<StartMessagePayload | null> {
  const progress = await loadAbTestProgress(user.id).catch(() => null)
  if (progress?.status !== 'completed' || !progress.result_key) {
    return null
  }

  const result = getAbTestResultDefinition(progress.result_key)
  const diagnosticText = interpolateFirstName(result.msg1, user.firstName)
  const [accessState, upcomingZoom] = await Promise.all([
    getUserAccessState(user.id).catch(() => null),
    getUpcomingZoomBookingView(user.id).catch(() => null),
  ])

  const greeting = user.firstName?.trim()
    ? `${user.firstName.trim()}, рада бачити тебе знову.`
    : 'Рада бачити тебе знову.'

  const hasZoomAccess =
    accessState?.state === 'PREMIUM' ||
    accessState?.state === 'FOCUS_ACTIVE' ||
    accessState?.state === 'FREE_WEEK1'
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
        resolveAccessStatusText({ state: accessState }),
        '',
        ...zoomStatusLines,
        '',
        nextStepText,
      ].join('\n'),
      buttons: [
        [{
          text: bookedUpcoming ? 'ПЕРЕГЛЯНУТИ ЗАПИС' : 'ОБРАТИ ZOOM-ПРАКТИКУ',
          web_app: {
            url: buildZoomCalendarUrl({ intent: bookedUpcoming ? undefined : 'booking' }),
          },
        }],
        ...secondaryRows,
      ],
    }
  }

  const keyboardState = {
    resultKey: progress.result_key,
    hasFocus: accessState?.hasFocus === true,
    isMyBooking: upcomingZoom?.isMyBooking === true,
    zoomCalendarUrl: buildZoomCalendarUrl({ intent: 'booking' }),
  } as const
  const replyMarkup = buildCanonicalResultKeyboard(keyboardState)
  const actionPolicy = resolveCanonicalResultActionPolicy(keyboardState)

  const currentStateLines = [
    currentStateText,
    resolveAccessStatusText({ state: accessState }),
    ...zoomStatusLines,
  ]

  const nextStepLine =
    accessState?.hasFocus === true
      ? bookedUpcoming
        ? actionPolicy?.nextStepText
          ? `<b>Наступний крок:</b> ${actionPolicy.nextStepText}`
          : '<b>Наступний крок:</b> відкрий деталі Zoom-практики і продовжуй роботу зі своєю ситуацією.'
        : '<b>Наступний крок:</b> обери найближчу Zoom-практику і запишись.'
      : 'Якщо хочеш продовжити роботу зі своєю ситуацією, наступний крок — обрати формат участі у ФОКУСІ.'

  return {
    text: [
      greeting,
      '',
      `Минулого разу твій тест показав <b>${result.title}</b>:`,
      '',
      diagnosticText,
      '',
      ...currentStateLines,
      '',
      nextStepLine,
    ].join('\n'),
    buttons: replyMarkup.inline_keyboard as StartMessagePayload['buttons'],
  }
}

async function resolveBodySection(
  user: StartUserSnapshot,
  ctx: StartContext,
): Promise<StartMessagePayload> {
  void ctx

  const completedUserHome = await resolveCompletedUserHome(user)
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
): Promise<{
  text: string
  reply_markup: { inline_keyboard: StartMessagePayload['buttons'] }
  parseMode?: 'HTML'
}> {
  const header = headerSection(user)
  const body = await resolveBodySection(user, ctx)
  const isReturningHome = body.text.includes('рада бачити тебе знову.')
  return {
    text: header && !isReturningHome ? `${header}\n\n${body.text}` : body.text,
    reply_markup: { inline_keyboard: body.buttons },
    parseMode: 'HTML',
  }
}
