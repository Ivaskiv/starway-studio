//backend/src/modules/telegram-mentor/conversation/delivery/planDelivery.ts
import crypto from 'node:crypto'
import type { Context } from 'telegraf'

import {
  cleanupDuplicateUpdates,
  isDuplicateUpdate,
} from '../dedupe/updateDedupe.js'
import { getQueueDepth, runInPerChatQueue } from '../queue/perChatQueue.js'
import type {
  ConversationMessagePlanItem,
  ConversationRenderSource,
  ConversationTraceRecord,
  OrchestratedContext,
} from '../types.js'

type DeliveryOperation = {
  source: ConversationRenderSource
  transition: string
  flowState: string | null
  key: string
  execute: () => Promise<unknown>
}

const DELIVERY_DEDUPE_TTL_MS = 10_000

const sendOrderByChat = new Map<string, number>()
const activeOperationByChat = new Set<string>()
const deliveredKeys = new Map<string, number>()

function trace(record: ConversationTraceRecord): void {
  console.info('[CONVERSATION_TRACE]', record)
}

function resolveChatId(ctx: Context): string {
  const chatId = ctx.chat?.id

  return typeof chatId === 'number' || typeof chatId === 'string'
    ? String(chatId)
    : `unknown:${ctx.from?.id ?? 'n/a'}`
}

function resolveUpdateId(ctx: Context): number | null {
  const updateId = (ctx.update as { update_id?: unknown }).update_id

  return typeof updateId === 'number' && Number.isFinite(updateId)
    ? updateId
    : null
}

function resolveFlowState(ctx: Context): string | null {
  const state = (ctx.state as Record<string, unknown> | undefined) ?? {}
  const value = state.userState

  return typeof value === 'string' ? value : null
}

function nextSendOrder(chatId: string): number {
  const current = sendOrderByChat.get(chatId) ?? 0
  const next = current + 1

  sendOrderByChat.set(chatId, next)

  return next
}

function buildDeliveryKey(ctx: Context, kind: string, text: string): string {
  const updateId = resolveUpdateId(ctx) ?? 0
  const chatId = resolveChatId(ctx)

  if (kind === 'ab_test_email_gate') {
    return `${chatId}:${updateId}:${kind}:${text}`
  }

  return `${chatId}:${updateId}:${kind}:${crypto
    .createHash('sha1')
    .update(text.slice(0, 256))
    .digest('hex')}`
}

function isDuplicateDelivery(key: string): boolean {
  const now = Date.now()

  for (const [existingKey, ts] of deliveredKeys.entries()) {
    if (now - ts > DELIVERY_DEDUPE_TTL_MS) {
      deliveredKeys.delete(existingKey)
    }
  }

  return deliveredKeys.has(key)
}

function canReuseCallbackUpdate(transition: string): boolean {
  return (
    transition.startsWith('ab_test_result_') ||
    transition === 'ab_test_send_action_reply' ||
    transition === 'ab_test_send_action_edit'
  )
}

async function enqueue(
  ctx: OrchestratedContext,
  op: DeliveryOperation,
): Promise<unknown> {
  cleanupDuplicateUpdates()

  const chatId = resolveChatId(ctx)
  const updateId = resolveUpdateId(ctx)
  const queuePosition = getQueueDepth(chatId)
  const duplicateUpdate = isDuplicateUpdate(updateId)

  return runInPerChatQueue(chatId, async () => {
    if (
      duplicateUpdate &&
      op.transition !== 'callback_ack' &&
      !canReuseCallbackUpdate(op.transition)
    ) {
      trace({
        update_id: updateId,
        chat_id: chatId,
        flow_state: op.flowState,
        transition: op.transition,
        render_source: op.source,
        queue_position: queuePosition,
        send_order: nextSendOrder(chatId),
        delivery_result: 'deduped',
      })

      return null
    }

    if (isDuplicateDelivery(op.key)) {
      trace({
        update_id: updateId,
        chat_id: chatId,
        flow_state: op.flowState,
        transition: op.transition,
        render_source: op.source,
        queue_position: queuePosition,
        send_order: nextSendOrder(chatId),
        delivery_result: 'deduped',
      })

      return null
    }

    const lockKey = `${chatId}:${op.transition}`

    if (activeOperationByChat.has(lockKey)) {
      trace({
        update_id: updateId,
        chat_id: chatId,
        flow_state: op.flowState,
        transition: op.transition,
        render_source: op.source,
        queue_position: queuePosition,
        send_order: nextSendOrder(chatId),
        delivery_result: 'deduped',
      })

      return null
    }

    activeOperationByChat.add(lockKey)
    const sendOrder = nextSendOrder(chatId)

    try {
      const result = await op.execute()

      deliveredKeys.set(op.key, Date.now())

      trace({
        update_id: updateId,
        chat_id: chatId,
        flow_state: op.flowState,
        transition: op.transition,
        render_source: op.source,
        queue_position: queuePosition,
        send_order: sendOrder,
        delivery_result: 'ok',
      })

      return result
    } catch (error) {
      trace({
        update_id: updateId,
        chat_id: chatId,
        flow_state: op.flowState,
        transition: op.transition,
        render_source: op.source,
        queue_position: queuePosition,
        send_order: sendOrder,
        delivery_result: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })

      throw error
    } finally {
      activeOperationByChat.delete(lockKey)
    }
  })
}

function patchContext(ctx: OrchestratedContext): void {
  if (ctx.state.__conversation_patched__) {
    return
  }

  ctx.state.__conversation_patched__ = true
  ctx.state.__orchestration_pass_id__ = crypto.randomUUID()

  const originalReply = ctx.reply.bind(ctx)
  const originalEdit = ctx.editMessageText?.bind(ctx)
  const originalAnswer = ctx.answerCbQuery?.bind(ctx)

  ctx.reply = (async (...args: Parameters<Context['reply']>) => {
    const text = typeof args[0] === 'string' ? args[0] : ''

    return enqueue(ctx, {
      source: 'ctx.reply',
      transition: 'message',
      flowState: resolveFlowState(ctx),
      key: buildDeliveryKey(ctx, 'reply', text),
      execute: () => originalReply(...args),
    })
  }) as Context['reply']

  if (originalEdit) {
    ctx.editMessageText = (async (
      ...args: Parameters<NonNullable<Context['editMessageText']>>
    ) => {
      const text = typeof args[0] === 'string' ? args[0] : ''

      return enqueue(ctx, {
        source: 'ctx.editMessageText',
        transition: 'edit',
        flowState: resolveFlowState(ctx),
        key: buildDeliveryKey(ctx, 'edit', text),
        execute: () => originalEdit(...args),
      })
    }) as Context['editMessageText']
  }

  if (originalAnswer) {
    ctx.answerCbQuery = (async (
      ...args: Parameters<NonNullable<Context['answerCbQuery']>>
    ) => {
      const text = typeof args[0] === 'string' ? args[0] : ''

      return enqueue(ctx, {
        source: 'ctx.answerCbQuery',
        transition: 'callback_ack',
        flowState: resolveFlowState(ctx),
        key: buildDeliveryKey(ctx, 'ack', text),
        execute: () => originalAnswer(...args),
      })
    }) as Context['answerCbQuery']
  }
}

async function deliverPlan(
  ctx: OrchestratedContext,
  source: ConversationRenderSource,
  transition: string,
  items: ConversationMessagePlanItem[],
): Promise<void> {
  const sorted = [...items].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))

  for (const item of sorted) {
    const delayMs = item.delayMs ?? 0

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    if (item.type === 'message') {
      await enqueue(ctx, {
        source,
        transition,
        flowState: resolveFlowState(ctx),
        key: buildDeliveryKey(
          ctx,
          item.deliveryKind === 'ab_test_email_gate'
            ? 'ab_test_email_gate'
            : 'plan_message',
          item.deliveryKind === 'ab_test_email_gate' ? transition : item.text,
        ),
        execute: () =>
          ctx.reply(item.text, {
            ...(item.parseMode ? { parse_mode: item.parseMode } : {}),
            ...(item.keyboard ? { reply_markup: item.keyboard as never } : {}),
          }),
      })
      continue
    }

    if (item.type === 'edit' && ctx.editMessageText) {
      await enqueue(ctx, {
        source,
        transition,
        flowState: resolveFlowState(ctx),
        key: buildDeliveryKey(
          ctx,
          item.deliveryKind === 'ab_test_email_gate'
            ? 'ab_test_email_gate'
            : 'plan_edit',
          item.deliveryKind === 'ab_test_email_gate' ? transition : item.text,
        ),
        execute: () =>
          ctx.editMessageText?.(item.text, {
            ...(item.parseMode ? { parse_mode: item.parseMode } : {}),
            ...(item.keyboard ? { reply_markup: item.keyboard as never } : {}),
          }),
      })
      continue
    }

    if (item.type === 'callback_ack' && ctx.answerCbQuery) {
      await enqueue(ctx, {
        source,
        transition,
        flowState: resolveFlowState(ctx),
        key: buildDeliveryKey(ctx, 'plan_ack', item.text ?? ''),
        execute: () => ctx.answerCbQuery?.(item.text),
      })
    }
  }
}

export const conversationOrchestrator = {
  patchContext,
  deliverPlan,
}
export const planMessage = async (
  ctx: Context,
  method: 'ctx.reply' | 'ctx.editMessageText',
  transition: string,
  text: string,
  markup?: any,
  parseMode?: string
): Promise<any> => {
  if (method === 'ctx.reply') {
    return ctx.reply(text, {
      parse_mode: parseMode as any,
      reply_markup: markup,
    })
  } else if (method === 'ctx.editMessageText') {
    return ctx.editMessageText?.(text, {
      parse_mode: parseMode as any,
      reply_markup: markup,
    })
  }
}

export const planAck = async (
  ctx: Context,
  method: 'ctx.answerCbQuery',
  transition: string,
  text?: string
): Promise<boolean> => {
  return ctx.answerCbQuery?.(text) ?? false
}
