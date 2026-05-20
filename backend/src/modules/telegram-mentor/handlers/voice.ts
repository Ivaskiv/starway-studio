import type { Context } from 'telegraf'
import { getAccessAwareAppReplyMarkupForContext } from './start.js'
import { processVoiceInput } from '../../voice/voice.service.js'
import { buildRecoveryCopy, resolveConversationProfile } from '../../../core/state-machine/conversationPresentation.js'
import { resolveRelationshipMemory } from '../../../core/memory/relationshipMemory.js'
import { absystemContent } from '@/products/absystem/config/absystem.content.js'

function extractVoicePayload(ctx: Context) {
  if (!('message' in ctx) || !ctx.message) return null
  if ('voice' in ctx.message && ctx.message.voice) {
    return {
      fileId: ctx.message.voice.file_id,
      type: 'TELEGRAM_VOICE' as const,
      mimeType: ctx.message.voice.mime_type ?? 'audio/ogg',
    }
  }

  if ('audio' in ctx.message && ctx.message.audio) {
    return {
      fileId: ctx.message.audio.file_id,
      type: 'TELEGRAM_AUDIO' as const,
      mimeType: ctx.message.audio.mime_type ?? 'audio/mpeg',
    }
  }

  return null
}

export async function handleVoice(ctx: Context) {
  const userId = (ctx.state as { userId?: string | null }).userId ?? null
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  const payload = extractVoicePayload(ctx)
  if (!userId || !chatId || !payload) return

  try {
    await ctx.sendChatAction('typing')
    const result = await processVoiceInput({
      userId,
      chatId,
      fileId: payload.fileId,
      type: payload.type,
      mimeType: payload.mimeType,
    })
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    await ctx.reply(result.text, {
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    })
  } catch (error) {
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    const relationship = await resolveRelationshipMemory(userId, 'absystem').catch(() => null)
    const copy = buildRecoveryCopy('voice_failure', resolveConversationProfile('absystem'), {
      relationship,
    })
    await ctx.reply(`${absystemContent.errors.voiceFailure.title}\n${copy.body}`, {
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    })
  }
}
