// backend/src/modules/telegram-mentor/handlers/status.ts

import type { Context } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { getUserIdByChatId } from '../session.js'
import { mainMenuKeyboard } from '../keyboards.js'

export async function handleStatus(ctx: Context) {
  const chatId = String(ctx.chat?.id)
  const userId = await getUserIdByChatId(chatId)
  if (!userId) {
    await ctx.reply('❌ Спочатку прив\'яжи акаунт. /start')
    return
  }

  // ПЕРЕВІР назви моделей: grep -n "^model" backend/prisma/schema.prisma
  const [streak, wheel, goal, tasks] = await Promise.all([
    (prisma as any).streak?.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } }).catch(() => null),
    (prisma as any).wheelAssessment?.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }).catch(() => null),
    (prisma as any).goalsSet?.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }).catch(() => null),
    (prisma as any).microTask?.count({ where: { userId, status: 'ACTIVE' } }).catch(() => 0),
  ])

  const scores  = wheel?.scores as Record<string, number> | undefined
  const avg     = scores
    ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length)
    : null
  const weakSph = scores
    ? Object.entries(scores).sort(([, a], [, b]) => a - b)[0]?.[0]
    : null

  const streakEmoji = (streak?.current ?? 0) >= 7 ? '🔥' : (streak?.current ?? 0) >= 3 ? '⚡' : '💧'

  // ПЕРЕВІР поле goal — може бути goal?.text або goal?.mainGoal або інше
  // grep -n "mainGoal\|goalText\|text\|String" backend/prisma/schema.prisma | grep -i goal | head -5
  const goalText = goal?.text ?? goal?.mainGoal ?? null

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
    { parse_mode: 'Markdown', ...mainMenuKeyboard },
  )
}