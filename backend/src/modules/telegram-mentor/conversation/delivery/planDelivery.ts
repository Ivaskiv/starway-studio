import type { Context } from 'telegraf'

import { conversationOrchestrator } from '../orchestrator/ConversationOrchestrator.js'
import type { ConversationRenderSource, OrchestratedContext } from '../types.js'

export async function planMessage(
  ctx: Context,
  source: ConversationRenderSource,
  transition: string,
  text: string,
  keyboard?: unknown,
  parseMode?: 'Markdown' | 'HTML',
  options?: { deliveryKind?: 'default' | 'ab_test_email_gate' },
): Promise<void> {
  await conversationOrchestrator.deliverPlan(
    ctx as OrchestratedContext,
    source,
    transition,
    [{
      type: 'message',
      text,
      keyboard,
      ...(parseMode ? { parseMode } : {}),
      ...(options?.deliveryKind ? { deliveryKind: options.deliveryKind } : {}),
      priority: 0,
      delayMs: 0,
    }],
  )
}

export async function planAck(
  ctx: Context,
  source: ConversationRenderSource,
  transition: string,
  text?: string,
): Promise<void> {
  await conversationOrchestrator.deliverPlan(
    ctx as OrchestratedContext,
    source,
    transition,
    [{
      type: 'callback_ack',
      text,
      priority: 0,
      delayMs: 0,
    }],
  )
}
