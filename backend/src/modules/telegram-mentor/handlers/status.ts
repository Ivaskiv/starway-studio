import type { Context } from 'telegraf'

import { getGamificationSummary, getUserState } from '../api/client.js'
import { getAccessAwareAppReplyMarkupForContext } from './start.js'
import { renderDecisionUnlessAllowed } from '../services/decisionTransport.service.js'

export async function handleStatus(ctx: Context) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  try {
    if (await renderDecisionUnlessAllowed(ctx, 'status_requested', [
      'show_product',
      'resume_session',
      'show_offer',
      'show_trial_offer',
      'show_winback',
      'show_paywall',
      'show_funnel_step',
      'show_funnel',
    ])) {
      return
    }

    const [summaryResponse, stateResponse] = await Promise.all([
      getGamificationSummary(chatId),
      getUserState(chatId),
    ])

    const summary = summaryResponse.summary
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)

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
      replyMarkup ? { reply_markup: replyMarkup } : undefined,
    )
  } catch (error) {
    const text = error instanceof Error ? error.message : 'Не вдалося отримати статус.'
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    await ctx.reply(`Не вдалося отримати статус.\n${text}`, {
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    })
  }
}
