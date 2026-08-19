import { bot, coachBot } from '../../../lib/telegram.js'

export type CoachStatusMessageRef = {
  chatId: string
  messageId: number
}

export type CoachInlineKeyboardMarkup = {
  inline_keyboard: Array<Array<{
    text: string
    callback_data: string
  }>>
}

export function buildZoomCoachStatusText(lines: string[], fileName?: string | null, zoomType?: string | null): string {
  const body = lines.filter(Boolean).join('\n')
  const fileLine = fileName ? `\n\n📁 ${fileName}` : ''
  const zoomTypeLine = zoomType ? `\n🎯 Тип: ${zoomType}` : ''
  return `${body}${fileLine}${zoomTypeLine}`
}

export async function sendZoomCoachStatusMessage(chatId: string, text: string, runtime: 'bot' | 'coachBot' = 'bot') {
  const client = runtime === 'coachBot' ? coachBot : bot
  const message = await client.telegram.sendMessage(chatId, text)
  return { chatId, messageId: message.message_id }
}

export async function editZoomCoachStatusMessage(
  ref: CoachStatusMessageRef | null,
  text: string,
  runtime: 'bot' | 'coachBot' = 'bot',
  replyMarkup?: CoachInlineKeyboardMarkup,
) {
  if (!ref) return null
  const client = runtime === 'coachBot' ? coachBot : bot
  const options = replyMarkup
    ? ({ reply_markup: replyMarkup } as Parameters<typeof client.telegram.editMessageText>[4])
    : undefined
  await client.telegram.editMessageText(ref.chatId, ref.messageId, undefined, text, options)
  return ref
}
