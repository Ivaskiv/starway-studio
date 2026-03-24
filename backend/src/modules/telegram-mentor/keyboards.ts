// backend/src/modules/telegram-mentor/keyboards.ts
import { Markup } from 'telegraf'
import type { ReplyKeyboardMarkup } from '@telegraf/types'

type InlineKeyboard = ReturnType<typeof Markup.inlineKeyboard>

const appBaseUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
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

const persistentKeyboard: ReplyKeyboardMarkup = {
  keyboard: [
    ['🤖 AI Ментор', '📊 Мій стан'],
    ['🎯 Моя ціль', '💬 Підтримка'],
  ],
  resize_keyboard: true,
  is_persistent: true,
}

export const mainMenuKeyboard = {
  reply_markup: persistentKeyboard,
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
      appUrl
        ? Markup.button.url('🔄 Почати заново', appUrl)
        : Markup.button.callback('🔄 Почати заново', 'restart_flow'),
    ],
  ])
}

export function openAppKeyboard(): InlineKeyboard {
  const appUrl = getTelegramAppUrl()
  return openUrlKeyboard(appUrl, '🌐 Відкрити додаток')
}

export function openUrlKeyboard(url: string | null, label = '🌐 Відкрити додаток'): InlineKeyboard {
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
      appUrl
        ? Markup.button.url('🚀 Отримати доступ', appUrl)
        : Markup.button.callback('🚀 Отримати доступ', 'return_main_menu'),
      Markup.button.callback('🧭 Знайти точки опори', 'open_lidmagnet'),
    ],
  ])
}

export function subscribedKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🤖 AI Ментор', 'continue_ai_mentor'),
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
