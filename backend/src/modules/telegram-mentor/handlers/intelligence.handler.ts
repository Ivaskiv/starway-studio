import type { Context } from 'telegraf'

import { planMessage } from '../conversation/delivery/planDelivery.js'
import { resolveLinkedUserIdFromContext } from '../core/state.service.js'
import { claudeIntelligenceService } from '../../../services/claude-intelligence.service.js'
import {
  quickDetectIntent,
  resolveTelegramIntelligence,
} from '../services/intelligence.service.js'

type MessageType =
  | 'MEMORY_REQUEST'
  | 'QUESTION'
  | 'FOLLOWUP'
  | 'PERSONAL_SITUATION'
  | 'FOCUS_RELATED'
  | 'SMALL_TALK'
  | 'UNKNOWN'

function extractMessageText(ctx: Context): string | null {
  const message = ctx.message
  if (!message || !('text' in message)) {
    return null
  }

  const text = typeof message.text === 'string' ? message.text.trim() : ''
  return text.length > 0 ? text : null
}

function detectMessageType(text: string): MessageType {
  const lower = text.toLowerCase().trim()

  if (['повтори', 'нагадай', 'покажи ще раз', 'що ти щойно', 'попередню відповідь'].some((key) => lower.includes(key))) {
    return 'MEMORY_REQUEST'
  }

  if (['чому', 'поясни', 'розкажи', 'розкажи більше', 'як так'].some((key) => lower.startsWith(key))) {
    return 'FOLLOWUP'
  }

  if (['не можу', 'боюсь', 'відкладаю', 'невизначеність', 'знаю але не', 'не знаю як почати'].some((key) => lower.includes(key))) {
    return 'PERSONAL_SITUATION'
  }

  if (['фокус', 'абсистем', 'absystem', 'стан', 'ціль', 'вибір', 'рішення', 'дія', 'ціна', 'коштує', 'скільки'].some((key) => lower.includes(key))) {
    return 'FOCUS_RELATED'
  }

  if (['як', 'де', 'що', 'коли'].some((key) => lower.startsWith(`${key} `) || lower === key)) {
    return 'QUESTION'
  }

  if (['привіт', 'дякую', 'спасибо', 'як дела', 'ок', 'окей'].some((key) => lower.includes(key))) {
    return 'SMALL_TALK'
  }

  return 'UNKNOWN'
}

function buildSoftBridgeReply(): string {
  return [
    'Я не даю порад поза темами STARWAY, ФОКУС і ABSystem.',
    '',
    'Але часто справа не тільки в інформації, а в тому, що саме тримає тебе зараз:',
    '- невизначеність, з чого почати;',
    '- страх перед змінами;',
    '- відкладання рішення.',
    '',
    'Що саме з цього відгукується тобі зараз?',
  ].join('\n')
}

function buildPersonalSituationReply(): string {
  return [
    'Це саме те, з чим допомагає ФОКУС.',
    'За 4 практики на тиждень ти розбираєш свою ситуацію через СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ.',
    '',
    'Перші зміни видно вже за місяць.',
    'Хочеш записатися на безплатну демо-сесію?',
  ].join('\n')
}

function buildSmallTalkReply(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('привіт')) return 'Привіт! Як можу допомогти?'
  if (lower.includes('дякую') || lower.includes('спасибо')) return 'Будь ласка.'
  if (lower.includes('як дела')) return 'Добре. Чим допомогти?'
  return 'Привіт!'
}

export async function handleIntelligentMessage(ctx: Context): Promise<boolean> {
  const text = extractMessageText(ctx)
  if (!text) {
    return false
  }

  const chatId = ctx.chat?.id
  if (chatId === undefined || chatId === null) {
    return false
  }

  await ctx.sendChatAction('typing').catch(() => undefined)

  const userId =
    ((ctx.state as { userId?: string | null }).userId ?? null)
    || await resolveLinkedUserIdFromContext(ctx)

  const messageType = detectMessageType(text)

  if (messageType === 'MEMORY_REQUEST') {
    const history = userId
      ? await claudeIntelligenceService.getConversationHistory(userId, 6)
      : []
    const lastAssistantMessage = [...history]
      .reverse()
      .find((message) => message.role === 'assistant')

    await planMessage(
      ctx,
      'ctx.reply',
      'telegram_intelligence_memory_request',
      lastAssistantMessage?.content ?? 'На жаль, не бачу попередньої відповіді. Сформулюй питання ще раз.',
    )
    return true
  }

  if (messageType === 'SMALL_TALK') {
    await planMessage(
      ctx,
      'ctx.reply',
      'telegram_intelligence_small_talk',
      buildSmallTalkReply(text),
    )
    return true
  }

  if (messageType === 'PERSONAL_SITUATION') {
    await planMessage(
      ctx,
      'ctx.reply',
      'telegram_intelligence_personal_situation',
      buildPersonalSituationReply(),
      {
        inline_keyboard: [[
          { text: 'Записатися на демо', url: 'https://t.me/nadya_couch' },
        ]],
      },
    )
    return true
  }

  if (messageType === 'QUESTION' || messageType === 'FOLLOWUP') {
    await planMessage(
      ctx,
      'ctx.reply',
      'telegram_intelligence_soft_bridge',
      buildSoftBridgeReply(),
    )
    return true
  }

  if (messageType === 'UNKNOWN') {
    await planMessage(
      ctx,
      'ctx.reply',
      'telegram_intelligence_unknown',
      'Здається, я не до кінця зрозумів. Можеш переформулювати?',
    )
    return true
  }

  const quickIntent = quickDetectIntent(text)
  if (!quickIntent) {
    return false
  }

  const result = await resolveTelegramIntelligence({
    chatId: String(chatId),
    userId,
    message: text,
  })

  await planMessage(
    ctx,
    'ctx.reply',
    'telegram_intelligence_reply',
    result.message,
    result.replyMarkup,
  )

  return true
}
