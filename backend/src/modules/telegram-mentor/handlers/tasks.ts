// backend/src/modules/telegram-mentor/handlers/tasks.ts

import type { Context } from 'telegraf'
import { trackEvent } from '../../events/service.js'
import { completeMicroTask, listMicroTasksForUser } from '../../microTask/service.js'
import { getUserIdByChatId } from '../session.js'
import { taskDoneKeyboard } from '../keyboards.js'
import { sendEntryOffer, sendStateMenu } from './start.js'
import { renderDecisionUnlessAllowed } from '../services/decisionTransport.service.js'

export async function handleTasks(ctx: Context) {
  if (process.env.APP_MODE === 'LM_ONLY') {
    // [LM_ONLY_MODE DISABLED]
    // Original task flow remains below for normal mode.
    return
  }

  try {
    if (await renderDecisionUnlessAllowed(ctx, 'tasks_requested', ['show_product', 'resume_session'])) {
      return
    }

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

    const [activeTasks, allTasks] = await Promise.all([
      listMicroTasksForUser(userId, 'active').then(rows => rows.slice(0, 5)),
      listMicroTasksForUser(userId, 'all'),
    ]).catch((error) => {
      console.error('[TelegramMentor] tasks query failed', error)
      return [[], []] as const
    })

    if (!activeTasks.length) {
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

    const completedCount = allTasks.filter(task => task.status === 'COMPLETED').length
    const missedCount = allTasks.filter(task => task.status === 'skipped' || task.status === 'expired').length

    await ctx.reply(`📋 *Активні завдання (${activeTasks.length})*\nВиконано: ${completedCount} · Пропущено: ${missedCount}`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '📊 Мій стан', callback_data: 'open_status' }]],
      },
    })

    for (const task of activeTasks) {
      const due = task.dueAt
        ? `\n⏰ До: ${new Date(task.dueAt).toLocaleDateString('uk-UA')}`
        : ''
      const schedule = task.schedule?.isMultiDay && task.schedule.label
        ? `\n🗓 ${task.schedule.label}`
        : ''
      await ctx.reply(`▸ ${task.title}${schedule}${due}`, { reply_markup: taskDoneKeyboard(task.id).reply_markup })
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
    await completeMicroTask(taskId, userId)
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
