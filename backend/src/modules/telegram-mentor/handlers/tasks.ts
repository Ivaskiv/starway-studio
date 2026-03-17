// backend/src/modules/telegram-mentor/handlers/tasks.ts

import type { Context } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { getUserIdByChatId } from '../session.js'
import { taskDoneKeyboard, mainMenuKeyboard } from '../keyboards.js'

export async function handleTasks(ctx: Context) {
  const chatId = String(ctx.chat?.id)
  const userId = await getUserIdByChatId(chatId)
  if (!userId) {
    await ctx.reply('❌ Спочатку прив\'яжи акаунт. /start')
    return
  }

  // ПЕРЕВІР назву моделі: grep -n "model Micro" backend/prisma/schema.prisma
  const tasks = await (prisma as any).microTask?.findMany({
    where:   { userId, isCompleted: false },
    orderBy: { dueDate: 'asc' },
    take:    5,
  }) ?? []

  if (!tasks.length) {
    await ctx.reply(
      '✅ Активних завдань немає.\n\nПройди ранковий чекін /morning — отримаєш нові.',
      { reply_markup: mainMenuKeyboard },
    )
    return
  }

  await ctx.reply(`📋 *Твої завдання (${tasks.length}):*`, { parse_mode: 'Markdown' })

  for (const task of tasks) {
    const due = task.dueDate
      ? `\n⏰ До: ${new Date(task.dueDate).toLocaleDateString('uk-UA')}`
      : ''
    await ctx.reply(`▸ ${task.title}${due}`, { reply_markup: taskDoneKeyboard(task.id) })
  }
}

export async function handleTaskDone(ctx: Context, taskId: string) {
  const chatId = String(ctx.callbackQuery?.message?.chat?.id ?? ctx.chat?.id)
  const userId = await getUserIdByChatId(chatId)
  if (!userId) return

  try {
    await (prisma as any).microTask?.update({
      where: { id: taskId },
      data:  { isCompleted: true, completedAt: new Date() },
    })
    await ctx.answerCbQuery('✅ Завдання виконано!')
    await ctx.editMessageText('✅ Завдання виконано!')
  } catch {
    await ctx.answerCbQuery('⚠️ Помилка. Спробуй пізніше.')
  }
}
