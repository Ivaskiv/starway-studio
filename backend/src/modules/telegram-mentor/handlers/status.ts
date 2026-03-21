// backend/src/modules/telegram-mentor/handlers/status.ts

import type { Context } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { getUserIdByChatId } from '../session.js'
import {
  subscribedKeyboard,
  trialActiveKeyboard,
  trialExpiredKeyboard,
} from '../keyboards.js'
import { sendEntryOffer, sendStateMenu } from './start.js'

export async function handleStatus(ctx: Context) {
  try {
    const chatId = String(ctx.chat?.id)
    const userId = await getUserIdByChatId(chatId)
    if (!userId) {
      await sendEntryOffer(ctx)
      return
    }

    const [streak, wheel, goal, tasks, subscription] = await Promise.all([
      prisma.streak.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } }).catch(() => null),
      prisma.wheelAssessment.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }).catch(() => null),
      prisma.goalsSet.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }).catch(() => null),
      prisma.microTask.count({ where: { userId, isCompleted: false } }).catch(() => 0),
      prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { status: true, trialEndsAt: true },
      }).catch(() => null),
    ])

    const scores  = wheel?.scores as Record<string, number> | undefined
    const avg     = scores
      ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length)
      : null
    const weakSph = scores
      ? Object.entries(scores).sort(([, a], [, b]) => a - b)[0]?.[0]
      : null

    const streakEmoji = (streak?.current ?? 0) >= 7 ? '🔥' : (streak?.current ?? 0) >= 3 ? '⚡' : '💧'
    const goalText = goal ? JSON.stringify(goal.goals) : null

    const now = Date.now()
    const replyMarkup =
      subscription?.status === 'ACTIVE'
        ? subscribedKeyboard().reply_markup
        : subscription?.status === 'TRIAL' && (!subscription.trialEndsAt || subscription.trialEndsAt.getTime() > now)
          ? trialActiveKeyboard().reply_markup
          : trialExpiredKeyboard().reply_markup

    await ctx.reply(
      [
        `📊 *Твій стан:*`,
        ``,
        `${streakEmoji} Streak: *${streak?.current ?? 0} днів*`,
        avg !== null
          ? `🎯 Колесо: *${avg}/10* (слабка: ${weakSph ?? '—'})`
          : `🎯 Колесо: *не заповнено*`,
        `✅ Завдань активних: *${tasks ?? 0}*`,
        goalText
          ? `🏆 Ціль: _${String(goalText).slice(0, 80)}_`
          : `🏆 Ціль: *не задана*`,
      ].join('\n'),
      { parse_mode: 'Markdown', reply_markup: replyMarkup },
    )
  } catch (error) {
    console.error('[TelegramMentor] status error:', error)
    const chatId = String(ctx.chat?.id)
    const userId = await getUserIdByChatId(chatId)
    if (userId) {
      await sendStateMenu(ctx, userId)
      return
    }

    await sendEntryOffer(ctx)
  }
}
