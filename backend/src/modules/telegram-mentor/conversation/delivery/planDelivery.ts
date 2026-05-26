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
