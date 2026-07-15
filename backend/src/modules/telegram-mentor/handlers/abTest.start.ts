import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import {
  AB_TEST_CONTINUE_BUTTON_TEXT,
  AB_TEST_FOCUS_CTA_TEXT,
  AB_TEST_OPEN_PLATFORM_BUTTON_TEXT,
} from '@/products/ab-system/content/abTest.shared.js'
import { AB_TEST_ACTIONS } from '@/packages/abTestActions.js'
import { buildAbsystemAiUpgradeCheckoutUrl } from '@/modules/subscriptions/payments/business.checkout.js'
import { prisma } from '@/db/client.js'
import { getPaymentUrl } from '@/lib/payments/registry.js'
import { getUpcomingZoom } from '@/modules/zoom/service.js'
import { getAbTestResultDefinition, type AbTestResultKey } from '@/products/ab-system/content/abTest.results.js'
import { withDevTestPaymentButton } from '../keyboards.js'
import { resolveTelegramWebappBaseUrl } from '../../../config/webapp.js'

const MINI_APP_ENTRY_INTENT = {
  BOOKING: 'booking',
} as const

export type StartMessagePayload = {
  text: string
  buttons: Array<Array<
    | { text: string; callback_data: string }
    | { text: string; url: string }
    | { text: string; web_app: { url: string } }
  >>
}

function withKeyboard(payload: StartMessagePayload) {
  return {
    text: payload.text,
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
    baseButtons.push([{ text: 'Мій попередній результат', callback_data: 'ab_test:show_result' }])
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
      [{ text: 'Показати результат', callback_data: AB_TEST_ACTIONS.SHOW_RESULT }],
      [{ text: 'Почати тест заново', callback_data: AB_TEST_ACTIONS.RESTART }],
      [{ text: AB_TEST_FOCUS_CTA_TEXT, callback_data: 'open_focus_payment' }],
    ],
  })
}

export function testDoneWithResultMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'Ти вже пройшла тест.\n\nПодивитись результат або пройти заново?',
    buttons: [
      [{ text: 'Мій результат', callback_data: AB_TEST_ACTIONS.SHOW_RESULT }],
      [{ text: absystemContent.RESUME_FLOW.CTA_RESTART, callback_data: AB_TEST_ACTIONS.RESTART }],
    ],
  })
}

export function offerShownMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'У тебе вже є <b>результат</b> тесту.\n\nХочеш відкрити його ще раз або пройти тест заново?',
    buttons: [
      [{ text: AB_TEST_FOCUS_CTA_TEXT, callback_data: 'open_focus_payment' }],
      [{ text: 'Пройти тест заново', callback_data: AB_TEST_ACTIONS.RESTART }],
      [{ text: 'Мій результат', callback_data: AB_TEST_ACTIONS.SHOW_RESULT }],
    ],
  })
}

export function focusPaidMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'Доступ до ФОКУС активний. Обери наступну дію в меню.',
    buttons: [
      [{ text: 'ABSystem AI', callback_data: 'focus:ai' }],
      [{ text: '🎯 Мій результат', callback_data: 'ab_test:show_result' }],
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

function formatDate(value: Date): string {
  return value.toLocaleDateString('uk-UA')
}

function formatZoomDate(value: Date): string {
  return value.toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function resolveDaysUntilExpiry(currentPeriodEnd: Date | null): number | null {
  if (!currentPeriodEnd) return null
  return Math.max(0, Math.ceil((currentPeriodEnd.getTime() - Date.now()) / 86400000))
}

export async function zoomSection(userId: string): Promise<StartMessagePayload> {
  const [upcomingZoom, attendedPracticesCount, bookedPracticesCount, activeSubscription, user] = await Promise.all([
    getUpcomingZoom(),
    prisma.zoomSessionAttendee.count({
      where: { userId, attended: true },
    }),
    prisma.zoomSessionAttendee.count({
      where: { userId },
    }),
    prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { currentPeriodEnd: 'desc' },
      select: { currentPeriodEnd: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { testResultType: true },
    }),
  ])

  const resultTitle = user?.testResultType
    ? getAbTestResultDefinition(user.testResultType as AbTestResultKey).title
    : 'Результат ще не визначено'
  const nextZoomLine = upcomingZoom?.scheduledAt
    ? `📅 Наступний Zoom: ${formatZoomDate(upcomingZoom.scheduledAt)}`
    : '📅 Наступний Zoom: дату оголосимо скоро'
  const practiceLine = bookedPracticesCount > 0
    ? `🙌 Zoom-практики: ${attendedPracticesCount} з ${bookedPracticesCount}`
    : '🙌 Zoom-практики: ще не записувалась'
  const daysUntilExpiry = resolveDaysUntilExpiry(activeSubscription?.currentPeriodEnd ?? null)
  const hasActiveSubscription = Boolean(activeSubscription)
  const shouldShowRenewalButtons = !hasActiveSubscription || (daysUntilExpiry !== null && daysUntilExpiry <= 7)

  const lines = [
    'Твій Zoom-кабінет',
    '',
    `🎯 Результат: ${resultTitle}`,
    nextZoomLine,
    practiceLine,
  ]

  if (!hasActiveSubscription) {
    lines.push('💳 Підписка неактивна')
  } else if (activeSubscription?.currentPeriodEnd) {
    lines.push(`💳 Підписка активна до ${formatDate(activeSubscription.currentPeriodEnd)}`)
    if (daysUntilExpiry !== null && daysUntilExpiry <= 7) {
      lines.push(`Підписка закінчується через ${daysUntilExpiry} днів`)
    }
  } else {
    lines.push('💳 Підписка активна')
  }

  const buttons: StartMessagePayload['buttons'] = [
    [{ text: '📅 Записатись на Zoom', web_app: { url: resolveZoomBookingWebAppUrl() } }],
    [{ text: '🎯 Переглянути результат', callback_data: 'ab_test:show_result' }],
    [{ text: '📚 Меню ФОКУС', callback_data: 'focus:menu' }],
  ]

  if (shouldShowRenewalButtons) {
    const monthlyLabel = hasActiveSubscription
      ? '🔄 Продовжити 1 місяць — 780 грн'
      : '💳 Активувати 1 місяць — 780 грн'
    const quarterlyLabel = hasActiveSubscription
      ? '🔄 Продовжити 3 місяці — 1990 грн'
      : '💳 Активувати 3 місяці — 1990 грн'

    buttons.push([{ text: monthlyLabel, url: getPaymentUrl('focus_monthly') }])
    buttons.push([{ text: quarterlyLabel, url: getPaymentUrl('focus_quarterly') }])
  }

  return {
    text: lines.join('\n'),
    buttons,
  }
}

export async function zoomMemberMessage(userId: string): Promise<ReturnType<typeof withKeyboard>> {
  return withKeyboard(await zoomSection(userId))
}

export function aiMentorMenuMessage(): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: 'Переходимо в AI Mentor режим. Обери, з чого почнемо.',
    buttons: [
      [{ text: 'AI Mentor меню', callback_data: 'ai_mentor:menu' }],
      [{ text: 'Мій план дій', callback_data: 'ai_mentor:plan' }],
    ],
  })
}

export function postZoom1Message(userId: string): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: `${absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_SOFT_TITLE}\n\n${absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_SOFT}`,
    buttons: [
      [{ text: absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_SOFT_CTA, url: buildAbsystemAiUpgradeCheckoutUrl(userId) }],
      [{ text: 'Наступний Zoom', callback_data: 'focus:next_zoom' }],
    ],
  })
}

export function upsellMessage(userId: string): ReturnType<typeof withKeyboard> {
  return withKeyboard({
    text: `${absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_HARD_TITLE}\n\n${absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_HARD}`,
    buttons: [
      [{ text: absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_HARD_CTA, url: buildAbsystemAiUpgradeCheckoutUrl(userId) }],
      [{ text: 'Наступний Zoom', callback_data: 'focus:next_zoom' }],
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
