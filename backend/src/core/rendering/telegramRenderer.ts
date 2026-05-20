import type { Context } from 'telegraf'
import type { TelegramFlow } from '../flow-builder/flowTemplates.js'
import { composeTelegramUx } from './uxComposition.js'

export async function renderTelegramFlow(ctx: Context, flow: TelegramFlow, mode: 'reply' | 'edit' = 'reply') {
  void mode
  const payload = composeTelegramUx(flow)
  if (!payload.text.trim()) return
  const markup = { reply_markup: payload.reply_markup as any }

  await ctx.reply(payload.text, { parse_mode: 'Markdown', ...markup })
}
