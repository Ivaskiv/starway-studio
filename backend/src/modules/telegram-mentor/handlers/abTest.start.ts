import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import {
  AB_TEST_CONTINUE_BUTTON_TEXT,
  AB_TEST_FOCUS_CTA_TEXT,
  AB_TEST_OPEN_PLATFORM_BUTTON_TEXT,
} from '@/products/ab-system/content/abTest.shared.js'
import { AB_TEST_ACTIONS } from '@/packages/abTestActions.js'
import { buildAbsystemAiUpgradeCheckoutUrl, buildEcosystemPaymentCheckoutSession } from '@/modules/subscriptions/payments/business.checkout.js'
import { prisma } from '@/db/client.js'
import { getUserAccessState } from '@/modules/subscriptions/payments/focus.access.js'
import { getUpcomingZoom } from '@/modules/zoom/service.js'
import { getOrCreateFocusInviteLink } from '@/products/focus/payments/inviteLink.js'
import { withDevTestPaymentButton } from '../keyboards.js'
import { resolveTelegramWebappBaseUrl } from '../../../config/webapp.js'

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

function withKeyboard(payload: StartMessagePayload) {
  return {
    text: payload.text,
    parseMode: 'HTML' as const,
    reply_markup: {
      inline_keyboard: withDevTestPaymentButton(payload.buttons),
    },
  }
}

function resolveZoomBookingWebAppUrl(): string {
  const configured = String(process.env.WEBAPP_URL ?? '').trim()
  const base = configured || resolveTelegramWebappBaseUrl()
  return `${base.replace(/\/$/, '')}/miniapp/zoom-calendar?intent=${MINI_APP_ENTRY_INTENT.BOOKING}`
}

function resolveZoomCalendarWebAppUrl(): string {
  const configured = String(process.env.WEBAPP_URL ?? '').trim()
  const base = configured || resolveTelegramWebappBaseUrl()
  return `${base.replace(/\/$/, '')}/miniapp/zoom-calendar`
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
  const datePart = new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Kyiv',
  }).format(scheduledAt)
  const timePart = new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Kyiv',
  }).format(scheduledAt)

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
      ? 'Ти зупинилась посеред тесту. Повернемось і закінчимо зараз, щоб не втрачати фокус.'
      : 'Ти вже почала тест. Продовжимо з того місця, де зупинилась?',
    buttons: baseButtons,
  })
}

export function testDoneMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'Твій <b>результат</b> готовий. Подивись висновок і переходь до наступного кроку у ФОКУС.',
    buttons: [
      [{ text: 'ПОКАЗАТИ РЕЗУЛЬТАТ', callback_data: AB_TEST_ACTIONS.SHOW_RESULT }],
      [{ text: 'ПОЧАТИ ТЕСТ ЗАНОВО', callback_data: AB_TEST_ACTIONS.RESTART }],
      [{ text: AB_TEST_FOCUS_CTA_TEXT, callback_data: 'open_focus_payment' }],
    ],
  })
}

export function resultReadyMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'Твій <b>результат</b> уже готовий.\n\nМожеш переглянути його ще раз або пройти тест заново.',
    buttons: [
      [{ text: 'МІЙ РЕЗУЛЬТАТ', callback_data: AB_TEST_ACTIONS.SHOW_RESULT }],
      [{ text: absystemContent.RESUME_FLOW.CTA_RESTART, callback_data: AB_TEST_ACTIONS.RESTART }],
    ],
  })
}

export function offerShownMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'У тебе вже є <b>результат</b> тесту.\n\nХочеш відкрити його ще раз або пройти тест заново?',
    buttons: [
      [{ text: AB_TEST_FOCUS_CTA_TEXT, callback_data: 'open_focus_payment' }],
      [{ text: 'ПРОЙТИ ТЕСТ ЗАНОВО', callback_data: AB_TEST_ACTIONS.RESTART }],
      [{ text: 'МІЙ РЕЗУЛЬТАТ', callback_data: AB_TEST_ACTIONS.SHOW_RESULT }],
    ],
  })
}

export function focusPaidMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'Доступ до ФОКУС активний. Обери наступну дію в меню.',
    buttons: [
      [{ text: 'ABSYSTEM AI', callback_data: 'focus:ai' }],
      [{ text: 'ПЕРЕГЛЯНУТИ РЕЗУЛЬТАТ', callback_data: 'ab_test:show_result' }],
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

  const upcomingZoom = await getUpcomingZoom()
  if (!upcomingZoom) {
    return []
  }

  const attendee = await prisma.zoomSessionAttendee.findUnique({
    where: {
      sessionId_userId: {
        sessionId: upcomingZoom.id,
        userId,
      },
    },
    select: {
      id: true,
    },
  })

  const booked = Boolean(attendee)
  const joinable = booked && isJoinWindow(upcomingZoom.scheduledAt)
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

async function resolveFocusHomeState(userId: string): Promise<FocusHomeState> {
  const accessState = await getUserAccessState(userId)
  if (!accessState.isActive) {
    return 'NO_SESSION'
  }

  const upcomingZoom = await getUpcomingZoom()
  if (!upcomingZoom) {
    return 'NO_SESSION'
  }

  const attendee = await prisma.zoomSessionAttendee.findUnique({
    where: {
      sessionId_userId: {
        sessionId: upcomingZoom.id,
        userId,
      },
    },
    select: {
      id: true,
    },
  })

  if (!attendee) {
    return 'NOT_BOOKED'
  }

  return isJoinWindow(upcomingZoom.scheduledAt) ? 'JOIN_WINDOW' : 'BOOKED'
}

async function buildFocusHomeMessage(userId: string): Promise<StartMessagePayload> {
  const [accessState, state, upcomingZoom, channelUrl] = await Promise.all([
    getUserAccessState(userId),
    resolveFocusHomeState(userId),
    getUpcomingZoom(),
    getOrCreateFocusInviteLink(userId),
  ])

  const zoomLine = upcomingZoom
    ? `Найближча Zoom-практика — ${formatZoomDateTime(upcomingZoom.scheduledAt)}.`
    : 'Найближчу Zoom-практику ще не додано.'

  const bookingStatus = state === 'BOOKED' || state === 'JOIN_WINDOW'
    ? 'Ти вже записана.'
    : 'Ти ще не записана.'

  return {
    text: [
      `Твій доступ до ФОКУСУ активний до ${formatFocusExpiry(accessState.expiresAt)}.`,
      '',
      zoomLine,
      '',
      bookingStatus,
    ].join('\n'),
    buttons: [
      [{ text: 'ЗАПИСАТИСЯ', web_app: { url: resolveZoomBookingWebAppUrl() } }],
      [{ text: 'ПЕРЕГЛЯНУТИ РЕЗУЛЬТАТ', callback_data: AB_TEST_ACTIONS.SHOW_RESULT }],
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
  return withKeyboard({
    text: [
      `${absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_SOFT_TITLE}`,
      
      absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_SOFT,
      
      '────────────────────────────────',
      
      '🌿 <b>Практика завершилась.</b>',
      
      'Щоб цей крок не загубився,',
      'зафіксуй для себе лише дві речі.',
      
      '<b>1. Який інсайт був найціннішим?</b>',
      
      '<b>2. Який один крок зробиш до наступної практики?</b>',
    ].join('\n'),
    buttons: [
      [{ text: 'ЗАЛИШИТИ ІНСАЙТ', callback_data: 'post_zoom:leave_insight' }],
      [{ text: 'ПРОДОВЖИТИ З ABSYSTEM', callback_data: 'post_zoom:absystem_cta' }],
      [{ text: 'КАЛЕНДАР', callback_data: 'focus:next_zoom' }],
    ],
  })
}

export function postZoomAbsystemCtaMessage(userId: string): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: [
      '🚀 <b>Найважче — не зробити один крок.</b>',
      
      'Найважче —',
      'перетворити його',
      'на власну систему.',
      
      'Саме для цього існує ABSystem.',
      
      'Він допомагає між Zoom-практиками:',
      
      '• тримати фокус;',
      '• фіксувати рішення;',
      '• бачити прогрес;',
      '• працювати регулярно.',
      
      '<b>Мета —',
      'досягати бажаних результатів',
      'завдяки системності,',
      'власному фокусу,',
      'своїм сильним сторонам',
      'і маленьким щоденним діям.</b>',
    ].join('\n'),
    buttons: [
      [{ text: 'АКТИВУВАТИ ABSYSTEM', url: buildAbsystemAiUpgradeCheckoutUrl(userId) }],
      [{ text: 'ДІЗНАТИСЯ БІЛЬШЕ', callback_data: 'focus:ai' }],
    ],
  })
}

export function upsellMessage(userId: string): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: `${absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_HARD_TITLE}\n\n${absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_HARD}`,
    buttons: [
      [{ text: absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_HARD_CTA, url: buildAbsystemAiUpgradeCheckoutUrl(userId) }],
      [{ text: 'КАЛЕНДАР', callback_data: 'focus:next_zoom' }],
    ],
  })
}

export function expiredMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: absystemContent.BILLING.SUB_EXPIRED.text,
    buttons: [
      [{ text: absystemContent.BILLING.SUB_EXPIRED.cta, callback_data: 'open_focus_payment' }],
    ],
  })
}
