import type { Context } from 'telegraf'
import { getSession } from '../session.js'
import { sendEntryOffer, sendStateMenu } from './start.js'

export async function handleAIMentor(ctx: Context) {
  if (process.env.APP_MODE === 'LM_ONLY') {
    return
  }

  const chatId = ctx.chat?.id ? String(ctx.chat.id) : null
  if (!chatId) return

  const session = await getSession(chatId)
  if (!session) {
    await sendEntryOffer(ctx)
    return
  }

  await ctx.reply(
    '🤖 AI-ментор активний.\nНапиши повідомлення або обери наступний крок.',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '▶️ Продовжити', callback_data: 'continue_ai_mentor' }],
          [{ text: '✨ Спробувати 7 днів', callback_data: 'start_trial' }],
        ],
      },
    },
  )
}
