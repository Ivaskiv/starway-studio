export type ConversationButton =
  | {
      label: string
      kind: 'callback'
      value: string
    }
  | {
      label: string
      kind: 'url'
      value: string
    }
  | {
      label: string
      kind: 'web_app'
      value: string
    }

export interface ConversationCard {
  kind: 'message' | 'edit'
  text: string
  buttons?: ConversationButton[]
  parseMode?: 'Markdown' | 'HTML'
  order?: number
}

export interface ConversationMediaItem {
  kind: 'photo' | 'voice' | 'video' | 'document'
  assetKey: string
  caption?: string | null
  buttons?: ConversationButton[]
  parseMode?: 'Markdown' | 'HTML'
  order?: number
}

export type ConversationNextAction =
  | {
      type: 'ab_test_callback'
      action: string
    }
  | {
      type: 'status_screen'
    }
  | {
      type: 'state_menu'
    }
  | {
      type: 'entry_offer'
    }
  | {
      type: 'morning_answer'
      text: string
    }
  | {
      type: 'evening_answer'
      text: string
    }
  | {
      type: 'pending_name_capture'
      userId: string
      chatId: string
      text: string
    }
  | {
      type: 'pending_identity_capture'
      text: string
    }
  | {
      type: 'pending_email_capture'
      userId: string
      text: string
    }
  | {
      type: 'callback_ack'
      text?: string
      order?: number
    }
  | {
      type: 'chat_action'
      action: 'typing'
      order?: number
    }

export interface ConversationResponse {
  text: string | null
  cards: ConversationCard[]
  buttons: ConversationButton[]
  media: ConversationMediaItem[]
  nextActions: ConversationNextAction[]
  telemetry: Record<string, unknown>
  analytics: Record<string, unknown>
}

export function createConversationResponse(
  input: Partial<ConversationResponse> = {},
): ConversationResponse {
  return {
    text: input.text ?? null,
    cards: input.cards ?? [],
    buttons: input.buttons ?? [],
    media: input.media ?? [],
    nextActions: input.nextActions ?? [],
    telemetry: input.telemetry ?? {},
    analytics: input.analytics ?? {},
  }
}
