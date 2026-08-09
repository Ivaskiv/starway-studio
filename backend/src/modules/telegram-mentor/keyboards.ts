// backend/src/modules/telegram-mentor/keyboards.ts
import { Markup } from 'telegraf'
import { resolveTelegramWebappBaseUrl } from '../../config/webapp.js'
import { stankeyContent } from '@/products/stankey/config/stankey.content.js'

type InlineKeyboard = ReturnType<typeof Markup.inlineKeyboard>
type InlineKeyboardButton =
  | { text: string; callback_data: string }
  | { text: string; url: string }
  | { text: string; web_app: { url: string } }

const miniAppVersion = process.env.MINIAPP_VERSION?.trim() || 'dev'
const isDevRuntime = process.env.NODE_ENV !== 'production'
const isTestPaymentEnabled = isDevRuntime && process.env.TEST_PAYMENT_ENABLED?.trim() === 'true'
const DEV_TEST_PAYMENT_URL = 'https://secure.wayforpay.com/button/bcd1a02457187'
const DEV_TEST_PAYMENT_BUTTON = {
  text: 'ТЕСТ 1 ГРН',
  url: DEV_TEST_PAYMENT_URL,
} as const
const LEGACY_TELEGRAM_MINIAPP_PATH = '/miniapp'
const CANONICAL_TELEGRAM_MINIAPP_PATH = '/miniapp/zoom-calendar'

function getAppBaseUrl(): string {
  return resolveTelegramWebappBaseUrl()
}

function isLocalhostHost(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname)
}

function isTelegramSafeUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false
    }

    return !isLocalhostHost(url.hostname)
  } catch {
    return false
  }
}

function isDevLocalUrl(value: string): boolean {
  if (!isDevRuntime) {
    return false
  }

  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && isLocalhostHost(url.hostname)
  } catch {
    return false
  }
}

export function getTelegramAppUrl(path = '/miniapp'): string | null {
  const appBaseUrl = getAppBaseUrl()
  if (!isTelegramSafeUrl(appBaseUrl) && !isDevLocalUrl(appBaseUrl)) {
    return null
  }

  const url = new URL(path, appBaseUrl)
  if (
    url.pathname === LEGACY_TELEGRAM_MINIAPP_PATH
    && (!url.search || url.searchParams.get('startapp') === 'ai')
  ) {
    url.pathname = CANONICAL_TELEGRAM_MINIAPP_PATH
    if (url.searchParams.get('startapp') === 'ai') {
      url.searchParams.delete('startapp')
    }
  }
  if (url.pathname.startsWith('/miniapp')) {
    url.searchParams.set('v', miniAppVersion)
  }
  return url.toString()
}

const telegramCopy = stankeyContent.telegram

function appButton(
  label: string,
  url: string | null,
  fallbackCallbackData = 'return_main_menu',
): InlineKeyboardButton {
  if (url) {
    if (isDevLocalUrl(url)) {
      return {
        text: label,
        url,
      }
    }

    return {
      text: label,
      web_app: { url },
    }
  }

  return {
    text: telegramCopy.buttons.back,
    callback_data: fallbackCallbackData,
  }
}

function isPaymentButton(button: InlineKeyboardButton): boolean {
  if ('callback_data' in button) {
    return button.callback_data === 'open_paid_checkout'
      || button.callback_data.startsWith('pay_stankey_')
      || button.callback_data.startsWith('open_focus_payment')
  }

  if ('url' in button) {
    return button.url.includes('wayforpay.com')
      || button.url.includes('/payments/wayforpay/checkout/')
  }

  return false
}

// TEMP DEV(18.05.2026): test payment button — Codex
export function withDevTestPaymentButton<T extends InlineKeyboardButton>(
  rows: T[][],
): Array<Array<T | typeof DEV_TEST_PAYMENT_BUTTON>> {
  if (!isTestPaymentEnabled || !rows.some((row) => row.some(isPaymentButton))) {
    return rows
  }

  return [
    ...rows,
    [DEV_TEST_PAYMENT_BUTTON],
  ]
}

export function getDevTestPaymentButton(): typeof DEV_TEST_PAYMENT_BUTTON | null {
  return isTestPaymentEnabled ? DEV_TEST_PAYMENT_BUTTON : null
}

export const supportMenuKeyboard: InlineKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback(telegramCopy.buttons.privacy, 'open_privacy')],
  [Markup.button.callback(telegramCopy.buttons.back, 'return_main_menu')],
])

export const cancelKeyboard: InlineKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback(telegramCopy.buttons.back, 'return_main_menu')],
])

export const yesNoKeyboard: InlineKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback(telegramCopy.buttons.taskCompleted, 'task_done'),
    Markup.button.callback(telegramCopy.buttons.taskSkip, 'task_skip'),
  ],
])

export function taskDoneKeyboard(taskId: string): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback(telegramCopy.buttons.taskDone, `done_${taskId}`)],
  ])
}

export function continueToMentorKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback(telegramCopy.buttons.continueInMentor, 'continue_ai_mentor')],
  ])
}

export function continueOrRestartKeyboard(): InlineKeyboard {
  const appUrl = getTelegramAppUrl()
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(telegramCopy.buttons.continue, 'continue_ai_mentor'),
      appButton(telegramCopy.buttons.restart, appUrl, 'restart_flow'),
    ],
  ])
}

export function openAppKeyboard(path = '/miniapp', label: string = telegramCopy.buttons.openApp): InlineKeyboard {
  const appUrl = getTelegramAppUrl(path)
  return Markup.inlineKeyboard([
    [appButton(label, appUrl)],
  ])
}

export function openUrlKeyboard(url: string | null, label: string = telegramCopy.buttons.openApp): InlineKeyboard {
  if (url && isTelegramSafeUrl(url)) {
    return Markup.inlineKeyboard([
      [{ text: label, web_app: { url } }],
    ])
  }

  return Markup.inlineKeyboard([
    [
      url && (isDevLocalUrl(url) || isTelegramSafeUrl(url))
        ? Markup.button.url(label, url)
        : Markup.button.callback(telegramCopy.buttons.back, 'return_main_menu'),
    ],
  ])
}

export function aiMentorStartKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback(telegramCopy.buttons.start, 'start_trial')],
  ])
}

export function leadMagnetChoiceKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback(telegramCopy.buttons.discoverState, 'start_wheel')],
    [Markup.button.callback(telegramCopy.buttons.trySevenDays, 'start_trial')],
  ])
}

export function trialActiveKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(telegramCopy.buttons.myTask, 'open_tasks'),
      Markup.button.callback(telegramCopy.buttons.myState, 'open_status'),
    ],
  ])
}

export function trialExpiredKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard(withDevTestPaymentButton([
    [
      Markup.button.callback(telegramCopy.buttons.pay, 'open_paid_checkout'),
      Markup.button.callback(telegramCopy.buttons.getAccess, 'open_paid_checkout'),
    ],
    [
      Markup.button.callback(telegramCopy.buttons.openLidmagnet, 'open_lidmagnet'),
    ],
  ]))
}

export function subscribedKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(telegramCopy.buttons.mentor, 'continue_ai_mentor'),
      Markup.button.callback(telegramCopy.buttons.myState, 'open_status'),
    ],
  ])
}

const row = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, idx) => {
    const value = start + idx
    return Markup.button.callback(`${value}`, `wheel_score_${value}`)
  })

export const wheelScoreKeyboard: InlineKeyboard = Markup.inlineKeyboard([row(1, 5), row(6, 10)])
