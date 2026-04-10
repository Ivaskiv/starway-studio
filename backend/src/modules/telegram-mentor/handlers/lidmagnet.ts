import type { Context } from 'telegraf'
import { startLeadMagnet } from '../flows/leadMagnet.flow.js'
import { sendEntryOffer, sendStateMenu, resolveLinkedUserIdFromContext } from './start.js'

export async function handleLidmagnet(ctx: Context) {
  const telegramId = String(ctx.from?.id ?? '')
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : null

  if (!telegramId) {
    await sendEntryOffer(ctx)
    return
  }

  try {
    const userId = await resolveLinkedUserIdFromContext(ctx)
    if (!userId || !(await startLeadMagnet(userId, chatId ?? telegramId, 'telegram_lidmagnet'))) {
      if (userId) {
        await sendStateMenu(ctx, userId)
        return
      }
      await sendEntryOffer(ctx)
      return
    }
    await ctx.reply('🎁 Запит прийнято. Якщо SendPulse налаштований правильно, гайд прийде наступним повідомленням.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎁 Продовжити практикум', callback_data: 'lm_continue_material' }],
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
