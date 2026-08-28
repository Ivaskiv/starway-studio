import { absystemContent } from '@/products/absystem/config/content.js'
import {
  AB_TEST_CONTINUE_BUTTON_TEXT,
  AB_TEST_FOCUS_CTA_TEXT,
  AB_TEST_MY_RESULT_BUTTON_TEXT,
  AB_TEST_OPEN_PLATFORM_BUTTON_TEXT,
  AB_TEST_RETAKE_BUTTON_TEXT,
  AB_TEST_TRIAL_ZOOM_SUCCESS_CTA_TEXT,
} from '@/products/ab-system/content/abTest.shared.js'
import { AB_TEST_ACTIONS } from '@/packages/abTestActions.js'
import { buildAbsystemAiUpgradeCheckoutUrl, buildEcosystemPaymentCheckoutSession } from '@/modules/subscriptions/payments/business/checkout.js'
import { prisma } from '@/db/client.js'
import { getUserAccessState } from '@/modules/subscriptions/payments/focus-access.js'
import { getUpcomingZoomBookingView } from '@/modules/zoom/service.js'
import { buildZoomCalendarUrl } from '@/modules/zoom/urls.js'
import { getOrCreateFocusInviteLink } from '@/products/focus/payments/inviteLink.js'
import { withDevTestPaymentButton } from '../keyboards.js'
import {
  bold,
  joinBlocks,
} from '../../../lib/telegram/messageFormatter.js'

const MINI_APP_ENTRY_INTENT = {
  BOOKING: 'booking',
} as const
const JOIN_WINDOW_BEFORE_START_MS = 5 * 60 * 1000
const JOIN_WINDOW_AFTER_START_MS = 2 * 60 * 60 * 1000

export type StartMessagePayload = {
  text: string
  buttons: Array<Array<
    | { text: string; callback_data: string }
    | { text: string; url: string }
    | { text: string; web_app: { url: string } }
  >>
}

type FocusHomeState =
  | 'NOT_BOOKED'
  | 'BOOKED'
  | 'JOIN_WINDOW'
  | 'NO_SESSION'

type TrialZoomHomeState =
  | 'NOT_BOOKED'
  | 'BOOKED'
  | 'JOIN_WINDOW'
  | 'NO_SESSION'

type FocusHomeContext = {
  accessState: Awaited<ReturnType<typeof getUserAccessState>>
  upcomingZoom: Awaited<ReturnType<typeof getUpcomingZoomBookingView>>
  state: FocusHomeState
}

function withKeyboard(payload: StartMessagePayload) {
  return {
    text: payload.text,
    parseMode: 'HTML' as const,
    reply_markup: {
      inline_keyboard: withDevTestPaymentButton(payload.buttons),
    },
  }
}

function buildTrialZoomActionButtons(state: TrialZoomHomeState): StartMessagePayload['buttons'] {
  if (state === 'JOIN_WINDOW') {
    return [[{ text: 'ПРИЄДНАТИСЯ', web_app: { url: resolveZoomCalendarWebAppUrl() } }]]
  }

  if (state === 'BOOKED') {
    return [[{ text: 'ПЕРЕГЛЯНУТИ ЗАПИС', web_app: { url: resolveZoomCalendarWebAppUrl() } }]]
  }

  return [[{ text: AB_TEST_TRIAL_ZOOM_SUCCESS_CTA_TEXT, web_app: { url: resolveZoomBookingWebAppUrl() } }]]
}

function resolveZoomBookingWebAppUrl() {
  return buildZoomCalendarUrl({
    intent: 'booking',
    cacheBust: Date.now(),
  })
}

function resolveZoomCalendarWebAppUrl(): string {
  return buildZoomCalendarUrl()
}

function extractZoomLink(requests: unknown): string | null {
  if (!requests || Array.isArray(requests) || typeof requests !== 'object') {
    return null
  }

  const zoomLink = (requests as Record<string, unknown>).zoomLink
  return typeof zoomLink === 'string' && zoomLink.trim() ? zoomLink.trim() : null
}

function isJoinWindow(scheduledAt: Date, now = new Date()): boolean {
  const diffMs = scheduledAt.getTime() - now.getTime()
  return diffMs <= JOIN_WINDOW_BEFORE_START_MS && diffMs >= -JOIN_WINDOW_AFTER_START_MS
}

function formatFocusExpiry(expiresAt: Date | null): string {
  if (!expiresAt) {
    return 'без кінцевої дати'
  }

  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Kyiv',
  }).format(expiresAt).replace(/\.$/, '')
}

function formatZoomDateTime(scheduledAt: Date): string {
  const dateFormatter = new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Kyiv',
  })
  const timeFormatter = new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Kyiv',
  })
  const calendarKeyFormatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Kyiv',
  })

  const scheduledDayKey = calendarKeyFormatter.format(scheduledAt)
  const now = new Date()
  const todayKey = calendarKeyFormatter.format(now)
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const tomorrowKey = calendarKeyFormatter.format(tomorrow)

  const datePart =
    scheduledDayKey === todayKey
      ? 'сьогодні'
      : scheduledDayKey === tomorrowKey
        ? 'завтра'
        : dateFormatter.format(scheduledAt)
  const timePart = timeFormatter.format(scheduledAt)

  return `${datePart} о ${timePart}`
}

export function welcomeMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: absystemContent.START_BLOCK1.MSG1,
    buttons: [[{ text: absystemContent.START_BLOCK1.CTA1, callback_data: AB_TEST_ACTIONS.START }]],
  })
}

export function testNotStartedMessage(input: { escalated: boolean }): ReturnType<typeof withKeyboard> {
  void input
  return withKeyboard({
    text: absystemContent.START_BLOCK1.MSG3,
    buttons: [[{ text: absystemContent.START_BLOCK1.CTA1, callback_data: AB_TEST_ACTIONS.START }]],
  })
}

export function testInProgressMessage(input: { r3: boolean; hasExistingResult?: boolean }): ReturnType<typeof withKeyboard> {
  const baseButtons: Array<Array<{ text: string; callback_data: string }>> = [
    [{ text: AB_TEST_CONTINUE_BUTTON_TEXT, callback_data: 'ab_test:resume' }],
    [{ text: absystemContent.RESUME_FLOW.CTA_RESTART, callback_data: AB_TEST_ACTIONS.RESTART }],
  ]

  if (input.hasExistingResult) {
    baseButtons.push([{ text: 'МІЙ ПОПЕРЕДНІЙ РЕЗУЛЬТАТ', callback_data: 'ab_test:show_result' }])
  }

  return withKeyboard({
    text: input.r3
      ? absystemContent.TELEGRAM_COPY.TEST_IN_PROGRESS_RECENT
      : 'Ти вже почала тест. Продовжимо з того місця, де зупинилась?',
    buttons: baseButtons,
  })
}

export function testDoneMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: `Твій ${bold('результат')} готовий. Подивись висновок і переходь до наступного кроку у ФОКУС.`,
    buttons: [
      [{ text: AB_TEST_MY_RESULT_BUTTON_TEXT, callback_data: AB_TEST_ACTIONS.SHOW_RESULT }],
      [{ text: AB_TEST_RETAKE_BUTTON_TEXT, callback_data: AB_TEST_ACTIONS.RESTART }],
      [{ text: AB_TEST_FOCUS_CTA_TEXT, callback_data: 'open_focus_payment' }],
    ],
  })
}

export function offerShownMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: joinBlocks([
      `У тебе вже є ${bold('результат')} тесту.`,
      'Хочеш відкрити його ще раз або пройти тест заново?',
    ]),
    buttons: [
      [{ text: AB_TEST_FOCUS_CTA_TEXT, callback_data: 'open_focus_payment' }],
      [{ text: AB_TEST_RETAKE_BUTTON_TEXT, callback_data: AB_TEST_ACTIONS.RESTART }],
      [{ text: AB_TEST_MY_RESULT_BUTTON_TEXT, callback_data: AB_TEST_ACTIONS.SHOW_RESULT }],
    ],
  })
}

export function focusPaidMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'Доступ до ФОКУС активний. Обери наступну дію в меню.',
 buttons: [
 [{ text: 'КАЛЕНДАР ZOOM-ПРАКТИК', callback_data: 'focus:next_zoom' }],
      [{ text: AB_TEST_MY_RESULT_BUTTON_TEXT, callback_data: AB_TEST_ACTIONS.SHOW_RESULT }],
      [{ text: AB_TEST_RETAKE_BUTTON_TEXT, callback_data: AB_TEST_ACTIONS.RESTART }],
    ],
  })
}

export function magicLinkReadyMessage(link: string): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: [
      'Ось твоє магічне посилання для входу без пароля.',
      'Відкрий його на цьому або іншому пристрої — воно діє 15 хвилин.',
    ].join('\n\n'),
    buttons: [[{ text: AB_TEST_OPEN_PLATFORM_BUTTON_TEXT, url: link }]],
  })
}

export async function buildFocusActionButtons(
  userId: string,
  options?: { hasResult?: boolean },
): Promise<StartMessagePayload['buttons']> {
  void options
  const accessState = await getUserAccessState(userId)
  const hasActiveSubscription = accessState.isActive
  if (!hasActiveSubscription) {
    const [monthlyCheckout, quarterlyCheckout] = await Promise.all([
      buildEcosystemPaymentCheckoutSession('focus', '1month', userId, 'telegram'),
      buildEcosystemPaymentCheckoutSession('focus', '3month', userId, 'telegram'),
    ])

    return [
      [{ text: 'ПРОДОВЖИТИ ПІДПИСКУ НА 1 МІСЯЦЬ', url: monthlyCheckout.checkoutUrl }],
      [{ text: 'ПРОДОВЖИТИ ПІДПИСКУ НА 3 МІСЯЦІ', url: quarterlyCheckout.checkoutUrl }],
    ]
  }

  const upcomingZoom = await getUpcomingZoomBookingView(userId)
  if (!upcomingZoom) {
    return []
  }

  const booked = upcomingZoom.isMyBooking === true
  const scheduledAt = new Date(upcomingZoom.scheduledAt)
  const joinable = booked && isJoinWindow(scheduledAt)
  const zoomLink = extractZoomLink(upcomingZoom.requests)

  if (joinable) {
    return [
      [zoomLink
        ? { text: 'ПРИЄДНАТИСЯ', url: zoomLink }
        : { text: 'ПРИЄДНАТИСЯ', web_app: { url: resolveZoomCalendarWebAppUrl() } }],
    ]
  }

  if (booked) {
    return [
      [{ text: 'ПЕРЕГЛЯНУТИ ЗАПИС', web_app: { url: resolveZoomCalendarWebAppUrl() } }],
    ]
  }

  return [
    [{ text: 'ЗАПИСАТИСЯ', web_app: { url: resolveZoomBookingWebAppUrl() } }],
  ]
}

async function resolveFocusHomeState(
  context: FocusHomeContext,
): Promise<FocusHomeState> {
  const { accessState, upcomingZoom } = context
  if (!accessState.isActive) {
    return 'NO_SESSION'
  }

  if (!upcomingZoom) {
    return 'NO_SESSION'
  }

  if (!upcomingZoom.isMyBooking) {
    return 'NOT_BOOKED'
  }

  return isJoinWindow(new Date(upcomingZoom.scheduledAt)) ? 'JOIN_WINDOW' : 'BOOKED'
}

async function resolveFocusHomeContext(userId: string): Promise<FocusHomeContext> {
  const [accessState, upcomingZoom] = await Promise.all([
    getUserAccessState(userId),
    getUpcomingZoomBookingView(userId),
  ])

  const context: FocusHomeContext = {
    accessState,
    upcomingZoom,
    state: 'NO_SESSION',
  }

  context.state = await resolveFocusHomeState(context)
  return context
}

async function buildFocusHomeMessage(userId: string): Promise<StartMessagePayload> {
  const [{ accessState, upcomingZoom, state }, channelUrl] = await Promise.all([
    resolveFocusHomeContext(userId),
    getOrCreateFocusInviteLink(userId),
  ])

  if (accessState.state === 'PREMIUM') {
    const trialState: TrialZoomHomeState =
      !upcomingZoom
        ? 'NO_SESSION'
        : upcomingZoom.isMyBooking
          ? isJoinWindow(new Date(upcomingZoom.scheduledAt))
            ? 'JOIN_WINDOW'
            : 'BOOKED'
          : 'NOT_BOOKED'

    const trialText =
      trialState === 'JOIN_WINDOW'
        ? [
            'Тобі доступний один пробний Zoom за 1 грн.',
            '',
            'Ти вже записана на найближчу Zoom-практику.',
            '',
            '<b>Наступний крок:</b> приєднайся до Zoom у вікно початку практики.',
          ].join('\n')
        : trialState === 'BOOKED'
          ? [
              'Тобі доступний один пробний Zoom за 1 грн.',
              '',
              'Ти вже записана на найближчу Zoom-практику.',
              '',
              '<b>Наступний крок:</b> відкрий запис і підготуй одну тему для розбору.',
            ].join('\n')
          : trialState === 'NOT_BOOKED'
            ? [
                'Тобі доступний один пробний Zoom за 1 грн.',
                '',
                'Обери найближчу Zoom-практику та запишись.',
              ].join('\n')
            : [
                'Тобі доступний один пробний Zoom за 1 грн.',
                '',
                'Найближчу Zoom-практику ще не додано.',
                '',
                '<b>Наступний крок:</b> відкрий календар і перевір найближчі слоти.',
              ].join('\n')

    return {
      text: trialText,
      buttons: buildTrialZoomActionButtons(trialState),
    }
  }

  const expiryLabel = formatFocusExpiry(accessState.expiresAt)
  const nextZoomLabel = upcomingZoom
    ? formatZoomDateTime(upcomingZoom.scheduledAt)
    : null

  const text =
    state === 'JOIN_WINDOW' && nextZoomLabel
      ? absystemContent.TELEGRAM_COPY.FOCUS_HOME.JOIN_WINDOW(expiryLabel, nextZoomLabel)
      : state === 'BOOKED' && nextZoomLabel
        ? absystemContent.TELEGRAM_COPY.FOCUS_HOME.BOOKED(expiryLabel, nextZoomLabel)
        : state === 'NOT_BOOKED' && nextZoomLabel
          ? absystemContent.TELEGRAM_COPY.FOCUS_HOME.NOT_BOOKED(expiryLabel, nextZoomLabel)
          : absystemContent.TELEGRAM_COPY.FOCUS_HOME.NO_SESSION(expiryLabel)

  const liveQuestionBlock =
    upcomingZoom?.isMyBooking && upcomingZoom.myQuestion
      ? [
          '',
          '<b>Твоя точка фокусу:</b>',
          `«${upcomingZoom.myQuestion.text}»`,
          `Питання №${upcomingZoom.myQuestion.position} у черзі`,
          `Учасників: ${upcomingZoom.attendeesCount}`,
        ].join('\n')
      : ''

  return {
    text: `${text}${liveQuestionBlock}`,
    buttons: [
      ...(await buildFocusActionButtons(userId)),
      [{ text: AB_TEST_MY_RESULT_BUTTON_TEXT, callback_data: AB_TEST_ACTIONS.SHOW_RESULT }],
      [{ text: AB_TEST_RETAKE_BUTTON_TEXT, callback_data: AB_TEST_ACTIONS.RESTART }],
      [{ text: 'КАНАЛ ФОКУСУ', url: channelUrl }],
    ],
  }
}

export async function zoomSection(userId: string): Promise<StartMessagePayload> {
  return buildFocusHomeMessage(userId)
}

export async function zoomMemberMessage(userId: string): Promise<ReturnType<typeof withKeyboard>> {
  return withKeyboard(await buildFocusHomeMessage(userId))
}

export function aiMentorMenuMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'Переходимо в AI Mentor режим. Обери, з чого почнемо.',
 buttons: [
 [{ text: 'AI MENTOR МЕНЮ', callback_data: 'ai_mentor:menu' }],
      [{ text: 'МІЙ ПЛАН ДІЙ', callback_data: 'ai_mentor:plan' }],
    ],
  })
}

export function postZoom1Message(userId: string): ReturnType<typeof withKeyboard> {
  void userId
  return withKeyboard({
    text: absystemContent.TELEGRAM_COPY.POST_ZOOM_1,
    buttons: [
      [{ text: 'ЗАЛИШИТИ ІНСАЙТ', callback_data: 'post_zoom:leave_insight' }],
      [{ text: 'КАЛЕНДАР', callback_data: 'focus:next_zoom' }],
    ],
  })
}

export function postZoomAbsystemCtaMessage(userId: string): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: joinBlocks([
      bold('🚀 Найважче — не зробити один крок.'),
      'Найважче —',
      'перетворити його',
      'на власну систему.',
      'Саме для цього існує ABSystem.',
      'Він допомагає між Zoom-практиками:',
      '• тримати фокус;',
      '• фіксувати рішення;',
      '• бачити прогрес;',
      '• працювати регулярно.',
      bold([
        'Мета —',
        'досягати бажаних результатів',
        'завдяки системності,',
        'власному фокусу,',
        'своїм сильним сторонам',
        'і маленьким щоденним діям.',
      ].join('\n')),
    ]),
    buttons: [
      [{ text: 'АКТИВУВАТИ ABSYSTEM', url: buildAbsystemAiUpgradeCheckoutUrl(userId) }],
      [{ text: 'ДІЗНАТИСЯ БІЛЬШЕ', callback_data: 'focus:ai' }],
    ],
  })
}

export function upsellMessage(userId: string): ReturnType<typeof withKeyboard> {
  void userId
  return withKeyboard({
    text: absystemContent.TELEGRAM_COPY.UPSELL,
    buttons: [
      [{ text: 'КАЛЕНДАР', callback_data: 'focus:next_zoom' }],
    ],
  })
}

export function expiredMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: absystemContent.TELEGRAM_COPY.EXPIRED,
    buttons: [
      [{ text: 'ПРОДОВЖИТИ ПІДПИСКУ', callback_data: 'open_focus_payment' }],
    ],
  })
}
