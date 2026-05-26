import crypto from 'node:crypto'
import type { Context } from 'telegraf'

import { cleanupDuplicateUpdates, isDuplicateUpdate } from '../dedupe/updateDedupe.js'
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

export class ConversationOrchestrator {
  private sendOrderByChat = new Map<string, number>()
  private activeOperationByChat = new Set<string>()
  private deliveredKeys = new Map<string, number>()

  patchContext(ctx: OrchestratedContext): void {
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
      return this.enqueue(ctx, {
        source: 'ctx.reply',
        transition: 'message',
        flowState: this.resolveFlowState(ctx),
        key: this.buildDeliveryKey(ctx, 'reply', text),
        execute: () => originalReply(...args),
      })
    }) as Context['reply']

    if (originalEdit) {
      ctx.editMessageText = (async (...args: Parameters<NonNullable<Context['editMessageText']>>) => {
        const text = typeof args[0] === 'string' ? args[0] : ''
        return this.enqueue(ctx, {
          source: 'ctx.editMessageText',
          transition: 'edit',
          flowState: this.resolveFlowState(ctx),
          key: this.buildDeliveryKey(ctx, 'edit', text),
          execute: () => originalEdit(...args),
        })
      }) as Context['editMessageText']
    }

    if (originalAnswer) {
      ctx.answerCbQuery = (async (...args: Parameters<NonNullable<Context['answerCbQuery']>>) => {
        const text = typeof args[0] === 'string' ? args[0] : ''
        return this.enqueue(ctx, {
          source: 'ctx.answerCbQuery',
          transition: 'callback_ack',
          flowState: this.resolveFlowState(ctx),
          key: this.buildDeliveryKey(ctx, 'ack', text),
          execute: () => originalAnswer(...args),
        })
      }) as Context['answerCbQuery']
    }
  }

  async deliverPlan(
    ctx: OrchestratedContext,
    source: ConversationRenderSource,
    transition: string,
    items: ConversationMessagePlanItem[],
  ): Promise<void> {
    const sorted = [...items].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    for (const item of sorted) {
      const delayMs = item.delayMs ?? 0
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }

      if (item.type === 'message') {
        await this.enqueue(ctx, {
          source,
          transition,
          flowState: this.resolveFlowState(ctx),
          key: this.buildDeliveryKey(ctx, 'plan_message', item.text),
          execute: () =>
            ctx.reply(item.text, {
              ...(item.parseMode ? { parse_mode: item.parseMode } : {}),
              ...(item.keyboard ? { reply_markup: item.keyboard as never } : {}),
            }),
        })
        continue
      }

      if (item.type === 'edit' && ctx.editMessageText) {
        await this.enqueue(ctx, {
          source,
          transition,
          flowState: this.resolveFlowState(ctx),
          key: this.buildDeliveryKey(ctx, 'plan_edit', item.text),
          execute: () =>
            ctx.editMessageText?.(item.text, {
              ...(item.parseMode ? { parse_mode: item.parseMode } : {}),
              ...(item.keyboard ? { reply_markup: item.keyboard as never } : {}),
            }),
        })
        continue
      }

      if (item.type === 'callback_ack' && ctx.answerCbQuery) {
        await this.enqueue(ctx, {
          source,
          transition,
          flowState: this.resolveFlowState(ctx),
          key: this.buildDeliveryKey(ctx, 'plan_ack', item.text ?? ''),
          execute: () => ctx.answerCbQuery?.(item.text),
        })
      }
    }
  }

  private async enqueue(
    ctx: OrchestratedContext,
    op: DeliveryOperation,
  ): Promise<unknown> {
    cleanupDuplicateUpdates()

    const chatId = this.resolveChatId(ctx)
    const updateId = this.resolveUpdateId(ctx)
    const queuePosition = getQueueDepth(chatId)
    const duplicateUpdate = isDuplicateUpdate(updateId)

    return runInPerChatQueue(chatId, async () => {
      if (duplicateUpdate && op.transition !== 'callback_ack') {
        this.trace({
          update_id: updateId,
          chat_id: chatId,
          flow_state: op.flowState,
          transition: op.transition,
          render_source: op.source,
          queue_position: queuePosition,
          send_order: this.nextSendOrder(chatId),
          delivery_result: 'deduped',
        })
        return null
      }

      if (this.isDuplicateDelivery(op.key)) {
        this.trace({
          update_id: updateId,
          chat_id: chatId,
          flow_state: op.flowState,
          transition: op.transition,
          render_source: op.source,
          queue_position: queuePosition,
          send_order: this.nextSendOrder(chatId),
          delivery_result: 'deduped',
        })
        return null
      }

      const lockKey = `${chatId}:${op.transition}`
      if (this.activeOperationByChat.has(lockKey)) {
        this.trace({
          update_id: updateId,
          chat_id: chatId,
          flow_state: op.flowState,
          transition: op.transition,
          render_source: op.source,
          queue_position: queuePosition,
          send_order: this.nextSendOrder(chatId),
          delivery_result: 'deduped',
        })
        return null
      }

      this.activeOperationByChat.add(lockKey)
      const sendOrder = this.nextSendOrder(chatId)
      try {
        const result = await op.execute()
        this.deliveredKeys.set(op.key, Date.now())
        this.trace({
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
        this.trace({
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
        this.activeOperationByChat.delete(lockKey)
      }
    })
  }

  private trace(record: ConversationTraceRecord): void {
    console.info('[CONVERSATION_TRACE]', record)
  }

  private resolveChatId(ctx: Context): string {
    const chatId = ctx.chat?.id
    return typeof chatId === 'number' || typeof chatId === 'string'
      ? String(chatId)
      : `unknown:${ctx.from?.id ?? 'n/a'}`
  }

  private resolveUpdateId(ctx: Context): number | null {
    const updateId = (ctx.update as { update_id?: unknown }).update_id
    return typeof updateId === 'number' && Number.isFinite(updateId) ? updateId : null
  }

  private resolveFlowState(ctx: Context): string | null {
    const state = (ctx.state as Record<string, unknown> | undefined) ?? {}
    const value = state.userState
    return typeof value === 'string' ? value : null
  }

  private nextSendOrder(chatId: string): number {
    const current = this.sendOrderByChat.get(chatId) ?? 0
    const next = current + 1
    this.sendOrderByChat.set(chatId, next)
    return next
  }

  private buildDeliveryKey(ctx: Context, kind: string, text: string): string {
    const updateId = this.resolveUpdateId(ctx) ?? 0
    return `${this.resolveChatId(ctx)}:${updateId}:${kind}:${crypto
      .createHash('sha1')
      .update(text.slice(0, 256))
      .digest('hex')}`
  }

  private isDuplicateDelivery(key: string): boolean {
    const now = Date.now()
    for (const [existingKey, ts] of this.deliveredKeys.entries()) {
      if (now - ts > DELIVERY_DEDUPE_TTL_MS) {
        this.deliveredKeys.delete(existingKey)
      }
    }
    return this.deliveredKeys.has(key)
  }
}

export const conversationOrchestrator = new ConversationOrchestrator()
