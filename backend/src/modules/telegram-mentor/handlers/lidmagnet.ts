import type { Context } from 'telegraf'
import { triggerLeadMagnet } from '../../integrations/sendpulse/sendpulse.service.js'
import { sendEntryOffer, sendStateMenu, resolveLinkedUserIdFromContext } from './start.js'

export async function handleLidmagnet(ctx: Context) {
  const telegramId = String(ctx.from?.id ?? '')
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : null

  if (!telegramId) {
    await sendEntryOffer(ctx)
    return
  }

  try {
    await triggerLeadMagnet(chatId ?? telegramId)
    await ctx.reply('🎁 Запит прийнято. Якщо SendPulse налаштований правильно, гайд прийде наступним повідомленням.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔑 Почати безкоштовно', callback_data: 'start_trial' }],
          [{ text: '🤖 AI Ментор', callback_data: 'continue_ai_mentor' }],
        ],
      },
    })
    return
  } catch (error) {
    console.error('[TelegramMentor] lidmagnet error:', error)
    const userId = await resolveLinkedUserIdFromContext(ctx)
    if (userId) {
      await sendStateMenu(ctx, userId)
      return
    }

    await sendEntryOffer(ctx)
    return
  }
}
