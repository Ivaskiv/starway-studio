// backend/src/modules/telegram-mentor/keyboards.ts
import { Markup } from 'telegraf'

export const mainMenuKeyboard: ReturnType<typeof Markup.keyboard> = Markup.keyboard([
  ['🌅 Ранок', '🌙 Вечір'],
  ['✅ Завдання', '📊 Стан'],
  ['🎯 Колесо', '💬 Ментор'],
]).resize()

export const cancelKeyboard: ReturnType<typeof Markup.keyboard> = Markup.keyboard([
  ['❌ Скасувати'],
]).resize()

export const yesNoKeyboard: ReturnType<typeof Markup.inlineKeyboard> = Markup.inlineKeyboard([
  [
    Markup.button.callback('✅ Виконано', 'task_done'),
    Markup.button.callback('⏭ Пропустити', 'task_skip'),
  ],
])

export function taskDoneKeyboard(taskId: string): ReturnType<typeof Markup.inlineKeyboard> {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Зроблено', `done_${taskId}`)],
  ])
}

export const wheelScoreKeyboard: ReturnType<typeof Markup.inlineKeyboard> = Markup.inlineKeyboard([
  [1, 2, 3, 4, 5].map(n => Markup.button.callback(`${n}`, `wheel_score_${n}`)),
  [6, 7, 8, 9, 10].map(n => Markup.button.callback(`${n}`, `wheel_score_${n}`)),
])
