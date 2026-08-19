import type { Context } from 'telegraf'

import { postAIChat } from '../api/client.js'
import { getAccessAwareAppReplyMarkupForContext } from './start.js'
import { buildRecoveryCopy, resolveConversationProfile } from '../../../core/state-machine/conversationPresentation.js'
import { resolveRelationshipMemory } from '../../../core/memory/relationshipMemory.js'
import { absystemContent } from '@/products/absystem/config/content.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'

export async function handleChat(ctx: Context, message: string) {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return

  try {
    await ctx.sendChatAction('typing')
    const result = await postAIChat(chatId, message)
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    await planMessage(ctx, 'ctx.reply', 'chat_ai_message', result.mentorMessage.content, replyMarkup)
  } catch (error) {
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    const userId = (ctx.state as { userId?: string | null }).userId ?? null
    const relationship = userId ? await resolveRelationshipMemory(userId, 'absystem').catch(() => null) : null
    const copy = buildRecoveryCopy('ai_unavailable', resolveConversationProfile('absystem'), {
      relationship,
    })
    await planMessage(ctx, 'ctx.reply', 'chat_ai_unavailable', `${absystemContent.errors.aiUnavailable.title}\n${copy.body}`, replyMarkup)
  }
}
