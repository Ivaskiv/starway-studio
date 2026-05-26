// backend/src/modules/telegram-mentor/handlers/tasks.ts

import type { Context } from 'telegraf'
import { trackEvent } from '../../events/service.js'
import { completeMicroTask, listMicroTasksForUser } from '../../microTask/service.js'
import { getUserIdByChatId } from '../session.js'
import { taskDoneKeyboard } from '../keyboards.js'
import { sendEntryOffer, sendStateMenu } from './start.js'
import { renderDecisionUnlessAllowed } from '../services/decisionTransport.service.js'
import { isLmOnlyModeEnabled } from '../runtime.js'
import { buildRecoveryCopy, resolveConversationProfile } from '../../../core/state-machine/conversationPresentation.js'
import { resolveRelationshipMemory } from '../../../core/memory/relationshipMemory.js'
import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { planAck, planMessage } from '../conversation/delivery/planDelivery.js'

export async function handleTasks(ctx: Context) {
  if (isLmOnlyModeEnabled()) {
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
      const relationship = await resolveRelationshipMemory(userId, 'absystem').catch(() => null)
      const copy = buildRecoveryCopy('progress_stalled', resolveConversationProfile('absystem'), {
        relationship,
      })
      await planMessage(
        ctx,
        'ctx.reply',
        'tasks_empty',
        `${absystemContent.tasks.empty}\n${copy.body}`,
        {
          inline_keyboard: [
            [{ text: absystemContent.tasks.backToRhythm, callback_data: 'continue_ai_mentor' }],
            [{ text: absystemContent.tasks.rhythmCheck, callback_data: 'start_trial' }],
          ],
        },
      )
      return
    }

    const completedCount = allTasks.filter(task => task.status === 'COMPLETED').length
    const missedCount = allTasks.filter(task => task.status === 'skipped' || task.status === 'expired').length

    await planMessage(ctx, 'ctx.reply', 'tasks_summary',
      [
      absystemContent.tasks.title,
      absystemContent.tasks.summary(activeTasks.length, completedCount, missedCount),
    ].join('\n'),
      {
        inline_keyboard: [[{ text: absystemContent.tasks.myStatus, callback_data: 'open_status' }]],
      })

    for (const task of activeTasks) {
      const due = task.dueAt
        ? `\n⏰ До: ${new Date(task.dueAt).toLocaleDateString('uk-UA')}`
        : ''
      const schedule = task.schedule?.isMultiDay && task.schedule.label
        ? `\n🗓 ${task.schedule.label}`
        : ''
      await planMessage(
        ctx,
        'ctx.reply',
        'tasks_item',
        `▸ ${task.title}${schedule}${due}`,
        taskDoneKeyboard(task.id).reply_markup,
      )
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
  if (isLmOnlyModeEnabled()) {
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
    await planAck(ctx, 'ctx.answerCbQuery', 'task_done_completed', absystemContent.tasks.completed)
    await planMessage(ctx, 'ctx.editMessageText', 'task_done_edit_completed', absystemContent.tasks.completed)
    await sendStateMenu(ctx, userId)
  } catch {
    await planAck(ctx, 'ctx.answerCbQuery', 'task_done_retry', absystemContent.tasks.retry)
  }
}
