import type { Context } from 'telegraf'
import { stankeyContent } from '@/products/stankey/config/stankey.content.js'
import { startLeadMagnet } from '../flows/leadMagnet.flow.js'
import { sendEntryOffer, sendStateMenu, resolveLinkedUserIdFromContext } from './start.js'
import { buildRecoveryCopy, resolveConversationProfile } from '../../../core/state-machine/conversationPresentation.js'
import { resolveRelationshipMemory } from '../../../core/memory/relationshipMemory.js'

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
    const relationship = await resolveRelationshipMemory(userId, 'stankey').catch(() => null)
    const copy = buildRecoveryCopy('question_missing', resolveConversationProfile('stankey'), {
      relationship,
    })
    await ctx.reply(`${copy.title}\n${copy.body}\n\n${stankeyContent.telegram.product.lidmagnetAccepted}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: stankeyContent.telegram.buttons.continueMaterial, callback_data: 'lm_continue_material' }],
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
