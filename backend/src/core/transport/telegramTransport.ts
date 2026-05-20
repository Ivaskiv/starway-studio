import type { Context } from 'telegraf'
import type { TelegramFlow } from '../flow-builder/flowTemplates.js'
import { renderTelegramFlow } from '../rendering/telegramRenderer.js'

export async function deliverTelegramFlow(ctx: Context, flow: TelegramFlow, mode: 'reply' | 'edit' = 'reply') {
  await renderTelegramFlow(ctx, flow, mode)
}
