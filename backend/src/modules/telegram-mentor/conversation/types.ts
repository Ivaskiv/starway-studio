import type { Context } from 'telegraf'

export type ConversationRenderSource =
  | 'ctx.reply'
  | 'ctx.editMessageText'
  | 'ctx.answerCbQuery'
  | 'telegram_flow'
  | 'telegram_decision'
  | 'unknown'

export type ConversationMessagePlanItem =
  | {
      type: 'message'
      text: string
      keyboard?: unknown
      priority?: number
      delayMs?: number
      parseMode?: 'Markdown' | 'HTML'
    }
  | {
      type: 'edit'
      text: string
      keyboard?: unknown
      priority?: number
      delayMs?: number
      parseMode?: 'Markdown' | 'HTML'
    }
  | {
      type: 'callback_ack'
      text?: string
      priority?: number
      delayMs?: number
    }

export type ConversationTraceRecord = {
  update_id: number | null
  chat_id: string
  flow_state: string | null
  transition: string
  render_source: ConversationRenderSource
  queue_position: number
  send_order: number
  delivery_result: 'ok' | 'failed' | 'deduped'
  error?: string
}

export type OrchestratedContext = Context & {
  state: Context['state'] & {
    __conversation_patched__?: boolean
    __orchestration_pass_id__?: string
  }
}
