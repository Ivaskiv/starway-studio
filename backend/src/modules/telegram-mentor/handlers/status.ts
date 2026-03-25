import type { Context } from 'telegraf'

import { getGamificationSummary, getUserState } from '../api/client.js'
import { openAppKeyboard } from '../keyboards.js'

export async function handleStatus(ctx: Context) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  try {
    const [summaryResponse, stateResponse] = await Promise.all([
      getGamificationSummary(chatId),
      getUserState(chatId),
    ])

    const summary = summaryResponse.summary

    await ctx.reply(
      [
        '📊 Твій стан',
        '',
        `🔥 Streak: ${summary.streak.current} днів`,
        `⭐ Рівень: ${summary.xp.level}`,
        `🧠 XP: ${summary.xp.total} · до наступного: ${Math.max(summary.xp.nextLevelXp - summary.xp.currentLevelXp, 0)}`,
        `💠 BITMIND: ${summary.rewards.bitMind} · NeuroGems: ${summary.rewards.neuroGems}`,
        `🧭 Flow: ${String(stateResponse.accessControl?.currentFlow ?? 'unknown')}`,
        `📍 Step: ${stateResponse.step}`,
      ].join('\n'),
      { reply_markup: openAppKeyboard().reply_markup },
    )
  } catch (error) {
    const text = error instanceof Error ? error.message : 'Не вдалося отримати статус.'
    await ctx.reply(`Не вдалося отримати статус.\n${text}`, {
      reply_markup: openAppKeyboard().reply_markup,
    })
  }
}
