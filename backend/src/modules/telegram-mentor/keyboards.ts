// backend/src/modules/telegram-mentor/keyboards.ts
import { Markup } from 'telegraf'

type InlineKeyboard = ReturnType<typeof Markup.inlineKeyboard>
type InlineKeyboardButton =
  | { text: string; callback_data: string }
  | { text: string; url: string }
  | { text: string; web_app: { url: string } }

const appBaseUrl = (
  process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim()
  || process.env.PUBLIC_FRONTEND_URL?.trim()
  || process.env.MINIAPP_URL?.trim()
  || process.env.FRONTEND_URL?.trim()
  || 'https://starway-frontend.vercel.app/miniapp'
).replace(/\/$/, '')
const miniAppVersion = process.env.MINIAPP_VERSION?.trim() || 'dev'

function isTelegramSafeUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false
    }

    return !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)
  } catch {
    return false
  }
}

export function getTelegramAppUrl(path = '/miniapp'): string | null {
  if (!isTelegramSafeUrl(appBaseUrl)) {
    return null
  }

  const url = new URL(path, appBaseUrl)
  if (path.startsWith('/miniapp')) {
    url.searchParams.set('v', miniAppVersion)
  }
  return url.toString()
}

function appButton(
  label: string,
  url: string | null,
  fallbackCallbackData = 'return_main_menu',
): InlineKeyboardButton {
  if (url) {
    return {
      text: label,
      web_app: { url },
    }
  }

  return {
    text: '← Повернутись',
    callback_data: fallbackCallbackData,
  }
}

export const supportMenuKeyboard: InlineKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🔒 Політика', 'open_privacy')],
  [Markup.button.callback('← Повернутись', 'return_main_menu')],
])

export const cancelKeyboard: InlineKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('← Повернутись', 'return_main_menu')],
])

export const yesNoKeyboard: InlineKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('✅ Виконано', 'task_done'),
    Markup.button.callback('⏭ Пропустити', 'task_skip'),
  ],
])

export function taskDoneKeyboard(taskId: string): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Зроблено', `done_${taskId}`)],
  ])
}

export function continueToMentorKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback('💬 Продовжити в Ментор', 'continue_ai_mentor')],
  ])
}

export function continueOrRestartKeyboard(): InlineKeyboard {
  const appUrl = getTelegramAppUrl()
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('▶️ Продовжити', 'continue_ai_mentor'),
      appButton('🔄 Почати заново', appUrl, 'restart_flow'),
    ],
  ])
}

export function openAppKeyboard(path = '/miniapp', label = '🌐 Відкрити додаток'): InlineKeyboard {
  const appUrl = getTelegramAppUrl(path)
  return Markup.inlineKeyboard([
    [appButton(label, appUrl)],
  ])
}

export function openUrlKeyboard(url: string | null, label = '🌐 Відкрити додаток'): InlineKeyboard {
  if (url && isTelegramSafeUrl(url)) {
    return Markup.inlineKeyboard([
      [{ text: label, web_app: { url } }],
    ])
  }

  return Markup.inlineKeyboard([
    [
      url
        ? Markup.button.url(label, url)
        : Markup.button.callback('← Повернутись', 'return_main_menu'),
    ],
  ])
}

export function aiMentorStartKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✨ Розпочати', 'start_trial')],
  ])
}

export function leadMagnetChoiceKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🎯 Дізнатись свій стан', 'start_wheel')],
    [Markup.button.callback('✨ Спробувати 7 днів', 'start_trial')],
  ])
}

export function trialActiveKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📋 Моє завдання', 'open_tasks'),
      Markup.button.callback('📊 Мій стан', 'open_status'),
    ],
  ])
}

export function trialExpiredKeyboard(): InlineKeyboard {
  const appUrl = getTelegramAppUrl()
  return Markup.inlineKeyboard([
    [
      appButton('🚀 Отримати доступ', appUrl),
      Markup.button.callback('🧭 Знайти точки опори', 'open_lidmagnet'),
    ],
  ])
}

export function subscribedKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🤖 ABsystem', 'continue_ai_mentor'),
      Markup.button.callback('📊 Мій стан', 'open_status'),
    ],
  ])
}

const row = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, idx) => {
    const value = start + idx
    return Markup.button.callback(`${value}`, `wheel_score_${value}`)
  })

export const wheelScoreKeyboard: InlineKeyboard = Markup.inlineKeyboard([row(1, 5), row(6, 10)])
