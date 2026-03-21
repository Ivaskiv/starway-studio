import type { UserState } from '../handlers/start.js'

export type FlowState = 'guest' | 'morning' | 'day' | 'evening' | null

export interface RouterContext {
  userId: string | null
  telegramId: string
  chatId: string
  updateType: 'command' | 'callback' | 'text' | 'deeplink'
  payload: string
  rawText: string
  userState: UserState
  subscriptionStatus: string | null
  trialDay: string | null
  leadProgress: number | null
  mentorStage: string | null
  mentorInsight: string | null
  mentorBlocker: string | null
  activeSession: boolean
  flowState: FlowState
  hasPendingTask: boolean
  userMenuContext?: {
    trialStartsAt: Date | null
  } | null
}
