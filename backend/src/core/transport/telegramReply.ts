import type { Context } from 'telegraf'
import type { TelegramFlow } from '../flow-builder/flowTemplates.js'
import { renderTelegramText } from '../rendering/textRenderer.js'
import { renderInlineKeyboard } from '../rendering/buttonRenderer.js'

export async function replyTelegramFlow(ctx: Context, flow: TelegramFlow) {
  await ctx.reply(renderTelegramText(flow), { reply_markup: renderInlineKeyboard(flow.buttons as any) as any })
}
