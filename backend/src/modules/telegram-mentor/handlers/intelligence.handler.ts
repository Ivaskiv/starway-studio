import type { Context } from 'telegraf'

import { resolveLinkedUserIdFromContext } from '../core/state.service.js'
import { getTelegramAgentGateway, type IAgentGateway } from '../../ai/agentGateway.js'
import { logCanonicalAiRequest } from '../../assistant/service.js'
import { buildIntelligenceConversationResponse } from '../conversation/engine/intelligenceScenario.js'
import { TelegramConversationRenderer } from '../conversation/renderers/telegramConversationRenderer.js'
import { getTelegramAiRequestContext } from '../services/requestContext.service.js'
import {
  detectTelegramIntelligenceMessageType as detectTelegramIntelligenceMessageTypeBase,
  type TelegramIntelligenceMessageType,
} from '../services/intelligence.service.js'
export type { TelegramIntelligenceMessageType } from '../services/intelligence.service.js'

function extractMessageText(ctx: Context): string | null {
  const message = ctx.message
  if (!message || !('text' in message)) {
    return null
  }

  const text = typeof message.text === 'string' ? message.text.trim() : ''
  return text.length > 0 ? text : null
}

const renderer = new TelegramConversationRenderer()
export const detectTelegramIntelligenceMessageType = detectTelegramIntelligenceMessageTypeBase

function resolveRequestId(ctx: Context): string {
  const updateId = (ctx.update as { update_id?: number }).update_id
  if (typeof updateId === 'number' && Number.isFinite(updateId)) {
    return String(updateId)
  }

  const callbackId = ('callbackQuery' in ctx && ctx.callbackQuery && 'id' in ctx.callbackQuery)
    ? String(ctx.callbackQuery.id ?? '')
    : ''
  if (callbackId) {
    return callbackId
  }

  const messageId = ('message' in ctx && ctx.message && 'message_id' in ctx.message)
    ? String(ctx.message.message_id ?? '')
    : ''
  return messageId || `chat:${String(ctx.chat?.id ?? 'unknown')}`
}

export async function handleIntelligentMessage(
  ctx: Context,
  gateway: IAgentGateway = getTelegramAgentGateway(),
  resolvedMessageType?: TelegramIntelligenceMessageType,
): Promise<boolean> {
  const startedAt = Date.now()
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

  const messageType = resolvedMessageType ?? detectTelegramIntelligenceMessageType(text)
  const requestId = resolveRequestId(ctx)
  const requestContext = await getTelegramAiRequestContext(ctx).catch(() => null)
  const response = await buildIntelligenceConversationResponse({
    ctx,
    chatId: String(chatId),
    userId,
    message: text,
    messageType,
    gateway,
    requestId,
  })

  if (requestContext) {
    ;(ctx.state as { telegramAiRequestContext?: unknown }).telegramAiRequestContext = requestContext
  }
  logCanonicalAiRequest({
    decision: typeof response.telemetry.decision === 'string' ? response.telemetry.decision : null,
    confidence: typeof response.telemetry.confidence === 'number' ? response.telemetry.confidence : null,
    recommendedAction: typeof response.telemetry.recommendedAction === 'string'
      ? response.telemetry.recommendedAction
      : null,
    selectedAgent: typeof response.telemetry.selectedAgent === 'string'
      ? response.telemetry.selectedAgent
      : null,
    durationMs: Date.now() - startedAt,
  })

  return renderer.render(ctx, response)
}
