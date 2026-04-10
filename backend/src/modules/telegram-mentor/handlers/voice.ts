import type { Context } from 'telegraf'
import { getAccessAwareAppReplyMarkupForContext } from './start.js'
import { processVoiceInput } from '../../voice/voice.service.js'

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
    await ctx.reply(
      `STATE: Недоступно (0/10)\n\nINTERPRETATION:\nНе вдалося обробити голосове повідомлення.\n\nACTION:\n1. Спробуй ще раз через коротке голосове до 1 хвилини.\n2. Якщо повториться — відкрий Mini App.`,
      {
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      },
    )
  }
}
