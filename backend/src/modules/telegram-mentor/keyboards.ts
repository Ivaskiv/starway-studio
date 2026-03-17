// backend/src/modules/telegram-mentor/keyboards.ts
import type { InlineKeyboardMarkup, ReplyKeyboardMarkup } from '@telegraf/types'

export const mainMenuKeyboard: ReplyKeyboardMarkup = {
  keyboard: [
    ['🌅 Ранок', '🌙 Вечір'],
    ['✅ Завдання', '📊 Стан'],
    ['🎯 Колесо', '💬 Ментор'],
  ],
  resize_keyboard: true,
} as const

export const cancelKeyboard: ReplyKeyboardMarkup = {
  keyboard: [['❌ Скасувати']],
  resize_keyboard: true,
} as const

export const yesNoKeyboard: InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      { text: '✅ Виконано', callback_data: 'task_done' },
      { text: '⏭ Пропустити', callback_data: 'task_skip' },
    ],
  ],
} as const

export function taskDoneKeyboard(taskId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [[{ text: '✅ Зроблено', callback_data: `done_${taskId}` }]],
  } as const
}

const row = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, idx) => {
    const value = start + idx
    return { text: `${value}`, callback_data: `wheel_score_${value}` }
  })

export const wheelScoreKeyboard: InlineKeyboardMarkup = {
  inline_keyboard: [row(1, 5), row(6, 10)],
} as const
