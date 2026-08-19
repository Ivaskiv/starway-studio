import { resolveModelStrategyTier } from '@starway/ai/providers/routing'
import type { Context } from 'telegraf'
import { Markup } from 'telegraf'

import { callProviderSafe } from '../../sales-assistant/sales-assistant.providers.js'

function buildNotebookSystemPrompt(): string {
 return [
 'Ти Claude Notebook Assistant для Telegram-каналу.',
 'Користувач пише короткі нотатки, ідеї, уточнення або запити.',
 'Відповідай українською, коротко, по суті, без зайвої теорії.',
 'Якщо це нотатка, коротко структуруй її у 2-4 булети: суть, сенс, наступний крок.',
 'Якщо це запит, дай практичну відповідь у 1-3 пунктах.',
 'Не вигадуй факти. Якщо бракує контексту, скажи про це прямо.',
 'Не перевищуй 1200 символів.',
 ].join(' ')
}

function isMissingAnthropicKey(): boolean {
 const apiKey = String(process.env.ANTHROPIC_API_KEY ?? '').trim()
 return !apiKey || apiKey === 'SET'
}

function isRetryableClaudeError(
 error?: { status?: number; code?: string } | null
): boolean {
 if (!error) return true
 return (
 error.status === 429 ||
 error.status === 500 ||
 error.status === 503 ||
 error.status === 529 ||
 error.code === 'RATE_LIMITED' ||
 error.code === 'PROVIDER_OVERLOADED' ||
 error.code === 'INTERNAL_ERROR'
 )
}

function sleep(ms: number): Promise<void> {
 return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function handleNotebookChannelPost(
 ctx: Context,
 post: {
 chat?: { id?: number | string }
 message_id?: number
 text?: string
 caption?: string | null
 }
): Promise<boolean> {
 const rawText = String(post.text ?? post.caption ?? '').trim()
 if (!rawText) return false

 const chatId = String(post.chat?.id ?? '').trim()
 if (!chatId) return false

 if (isMissingAnthropicKey()) {
 console.warn(
 '[NOTEBOOK] ANTHROPIC_API_KEY missing — skip Claude notebook call',
 {
 chatId,
 messageId: typeof post.message_id === 'number' ? post.message_id : null,
 }
 )
 return true
 }

 const strategyTier = resolveModelStrategyTier('raw_truth')

 await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
 let result = await callProviderSafe(
 'claude',
 buildNotebookSystemPrompt(),
 ['Нотатка з Telegram-каналу:', rawText].join('\n\n'),
 {
 contentType: 'CUSTOM',
 strategyTier,
 }
 )

 for (let attempt = 2; attempt <= 3 && !result.content?.trim(); attempt += 1) {
 if (!isRetryableClaudeError(result.error)) break
 console.warn('[NOTEBOOK] retrying Claude call', {
 chatId,
 messageId: typeof post.message_id === 'number' ? post.message_id : null,
 attempt,
 error: result.error ?? null,
 })
 await sleep((attempt - 1) * 2000)
 result = await callProviderSafe(
 'claude',
 buildNotebookSystemPrompt(),
 ['Нотатка з Telegram-каналу:', rawText].join('\n\n'),
 {
 contentType: 'CUSTOM',
 strategyTier,
 }
 )
 }

 if (!result.content?.trim()) {
 const err = result.error
 const isBalance =
 err?.status === 400 &&
 String(err?.message ?? '')
 .toLowerCase()
 .includes('баланс')
 const isBadRequest = err?.code === 'INVALID_PROVIDER_REQUEST'
 const reason =
 isBalance || isBadRequest
 ? ' Вичерпано баланс Anthropic API'
 : ' Claude API тимчасово недоступний'
 const buttons =
 isBalance || isBadRequest
 ? Markup.inlineKeyboard([
 [
 Markup.button.url(
 'Поповнити баланс',
 'https://console.anthropic.com/settings/billing'
 ),
 ],
 ])
 : Markup.inlineKeyboard([
 [
 Markup.button.callback(
 'Спробувати ще раз',
 'retry_last_action'
 ),
 ],
 ])

 console.warn('[NOTEBOOK] Claude returned empty response', {
 chatId,
 messageId: typeof post.message_id === 'number' ? post.message_id : null,
 hasError: Boolean(result.error),
 error: result.error ?? null,
 })
 await ctx.telegram
 .sendMessage(
 chatId,
 ` Не вдалося передати нотатку в Claude.\n\n${reason}`,
 buttons
 )
 .catch(() => undefined)
 return true
 }

 const replyText = result.content.trim().slice(0, 3900)
 console.info('[NOTEBOOK] channel post processed by Claude', {
 chatId,
 messageId: typeof post.message_id === 'number' ? post.message_id : null,
 responseLength: replyText.length,
 })

 await ctx.telegram.sendMessage(chatId, replyText).catch(() => undefined)
 return true
}
