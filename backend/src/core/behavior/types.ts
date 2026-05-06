import type { RoutedOrchestratorEvent } from '../orchestrator/eventRouter.js'
import type { ChannelContext } from '../orchestrator/channelRouter.js'
import type { Intent, MentorDelivery } from '../mentor/types.js'

export type RawEventType =
  | 'login'
  | 'task_complete'
  | 'task_skip'
  | 'text_input'
  | 'session_end'

export type RawEvent = {
  userId: string
  type: RawEventType
  timestamp: number
  metadata?: Record<string, unknown>
}

export type Features = {
  sessionLength: number
  tasksCompleted: number
  tasksSkipped: number
  focusSwitches: number
  inactivityGap: number
  sentimentScore?: number
}

export type Pattern =
  | 'procrastination'
  | 'avoidance'
  | 'high_engagement'
  | 'drop_off'
  | 'inconsistency'

export type BehaviorScore = {
  procrastination: number
  avoidance: number
  engagement: number
  consistency: number
}

export type BehaviorUpdateEvent = {
  type: 'behavior_update'
  userId: string
  scores: BehaviorScore
  patterns: Pattern[]
  timestamp: number
  delivery?: MentorDelivery
  meta?: {
    expected_action: boolean
    timestamp: number
    strategyKey?: string
  }
}

export type BehaviorProcessResult = {
  userId: string
  features: Features
  patterns: Pattern[]
  scores: BehaviorScore
  event: BehaviorUpdateEvent
  routedEvent: RoutedOrchestratorEvent | null
}

export type ProcessBehaviorOptions = {
  debounceMs?: number
  emit?: boolean
  channelContext?: Partial<ChannelContext>
}

export type BehaviorEmitContext = {
  intent?: Intent
  delivery?: MentorDelivery
  channelContext?: Partial<ChannelContext>
}
