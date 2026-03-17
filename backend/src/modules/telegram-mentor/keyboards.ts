// backend/src/modules/telegram-mentor/keyboards.ts

type ReplyKeyboard = {
  keyboard: readonly (readonly string[])[]
  resize_keyboard: true
}

type InlineKeyboard = {
  inline_keyboard: readonly (readonly { text: string; callback_data: string })[]
}

export const mainMenuKeyboard: ReplyKeyboard = {
  keyboard: [
    ['🌅 Ранок', '🌙 Вечір'],
    ['✅ Завдання', '📊 Стан'],
    ['🎯 Колесо', '💬 Ментор'],
  ],
  resize_keyboard: true,
} as const

export const cancelKeyboard: ReplyKeyboard = {
  keyboard: [['❌ Скасувати']],
  resize_keyboard: true,
} as const

export const yesNoKeyboard: InlineKeyboard = {
  inline_keyboard: [
    [
      { text: '✅ Виконано', callback_data: 'task_done' },
      { text: '⏭ Пропустити', callback_data: 'task_skip' },
    ],
  ],
} as const

export function taskDoneKeyboard(taskId: string): InlineKeyboard {
  return {
    inline_keyboard: [[{ text: '✅ Зроблено', callback_data: `done_${taskId}` }]],
  } as const
}

const row = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, idx) => {
    const value = start + idx
    return { text: `${value}`, callback_data: `wheel_score_${value}` }
  })

export const wheelScoreKeyboard: InlineKeyboard = {
  inline_keyboard: [row(1, 5), row(6, 10)],
} as const
