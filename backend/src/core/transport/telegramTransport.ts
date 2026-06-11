import type { Context } from 'telegraf'
import type { OrchestratedContext } from '../../modules/telegram-mentor/conversation/types.js'
import type { TelegramFlow } from '../flow-builder/flowTemplates.js'
import { composeTelegramUx } from '../rendering/uxComposition.js'
import { conversationOrchestrator } from '../../modules/telegram-mentor/conversation/delivery/planDelivery.js'

export async function deliverTelegramFlow(
  ctx: Context,
  flow: TelegramFlow,
  mode: 'reply' | 'edit' = 'reply'
) {
  const payload = composeTelegramUx(flow)
  if (!payload.text.trim()) return
  const orchestrated = ctx as OrchestratedContext
  await conversationOrchestrator.deliverPlan(
    orchestrated,
    'telegram_flow',
    mode === 'edit' ? 'flow_edit' : 'flow_message',
    [
      {
        type: mode === 'edit' ? 'edit' : 'message',
        text: payload.text,
        keyboard: payload.reply_markup,
        parseMode: 'Markdown',
        priority: 0,
        delayMs: 0,
      },
    ]
  )
}
