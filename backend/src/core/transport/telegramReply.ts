import type { Context } from 'telegraf'
import { replyWithTelegramMessage } from '@/lib/telegram/messageFormatter.js'
import type { TelegramFlow } from '../flow-builder/flowTemplates.js'
import { renderTelegramText } from '../rendering/textRenderer.js'
import { renderInlineKeyboard } from '../rendering/buttonRenderer.js'

export async function replyTelegramFlow(ctx: Context, flow: TelegramFlow) {
  await replyWithTelegramMessage(ctx, renderTelegramText(flow), {
    reply_markup: renderInlineKeyboard(flow.buttons as any) as any,
  })
}
