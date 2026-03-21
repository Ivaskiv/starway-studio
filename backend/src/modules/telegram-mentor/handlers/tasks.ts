// backend/src/modules/telegram-mentor/handlers/tasks.ts

import type { Context } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { trackEvent } from '../../events/service.js'
import { getUserIdByChatId } from '../session.js'
import { taskDoneKeyboard } from '../keyboards.js'
import { sendEntryOffer, sendStateMenu } from './start.js'

export async function handleTasks(ctx: Context) {
  if (process.env.APP_MODE === 'LM_ONLY') {
    // [LM_ONLY_MODE DISABLED]
    // Original task flow remains below for normal mode.
    return
  }

  try {
    const chatId = String(ctx.chat?.id)
    const userId = await getUserIdByChatId(chatId)
    if (!userId) {
      await sendEntryOffer(ctx)
      return
    }

    await trackEvent({
      userId,
      type: 'telegram_tasks_opened',
      source: 'telegram',
      state: 'day',
    })

    const tasks = await prisma.microTask.findMany({
      where:   { userId, isCompleted: false },
      orderBy: { dueAt: 'asc' },
      take:    5,
    }).catch((error) => {
      console.error('[TelegramMentor] tasks query failed', error)
      return []
    })

    if (!tasks.length) {
      await ctx.reply(
        '✅ Активних завдань немає.\n\nПройди ранковий чекін /morning — отримаєш нові.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🌅 Ранковий ритуал', callback_data: 'continue_ai_mentor' }],
              [{ text: '✨ Спробувати 7 днів', callback_data: 'start_trial' }],
            ],
          },
        },
      )
      return
    }

    await ctx.reply(`📋 *Твої завдання (${tasks.length}):*`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '📊 Мій стан', callback_data: 'open_status' }]],
      },
    })

    for (const task of tasks) {
      const due = task.dueAt
        ? `\n⏰ До: ${new Date(task.dueAt).toLocaleDateString('uk-UA')}`
        : ''
      await ctx.reply(`▸ ${task.title}${due}`, { reply_markup: taskDoneKeyboard(task.id).reply_markup })
    }
  } catch (error) {
    console.error('[TelegramMentor] tasks error:', error)
    const chatId = String(ctx.chat?.id)
    const userId = await getUserIdByChatId(chatId)
    if (userId) {
      await sendStateMenu(ctx, userId)
      return
    }

    await sendEntryOffer(ctx)
  }
}

export async function handleTaskDone(ctx: Context, taskId: string) {
  if (process.env.APP_MODE === 'LM_ONLY') {
    // [LM_ONLY_MODE DISABLED]
    // Original task completion remains below for normal mode.
    return
  }

  const chatId = String(ctx.callbackQuery?.message?.chat?.id ?? ctx.chat?.id)
  const userId = await getUserIdByChatId(chatId)
  if (!userId) return

  try {
    await prisma.microTask.update({
      where: { id: taskId },
      data:  { isCompleted: true, completedAt: new Date() },
    })
    await trackEvent({
      userId,
      type: 'telegram_task_completed',
      source: 'telegram',
      state: 'day',
      payload: {
        taskId,
      },
    })
    await ctx.answerCbQuery('✅ Завдання виконано!')
    await ctx.editMessageText('✅ Завдання виконано!')
    await sendStateMenu(ctx, userId)
  } catch {
    await ctx.answerCbQuery('⚠️ Помилка. Спробуй пізніше.')
  }
}
