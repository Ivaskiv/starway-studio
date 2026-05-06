export type BehaviorScores = {
  procrastination: number
  avoidance: number
  engagement: number
  consistency: number
}

export type BehaviorInput = {
  userId: string
  patterns: string[]
  scores: BehaviorScores
}

export type Intent =
  | 'motivate'
  | 'reduce_resistance'
  | 'reduce_resistance_fast'
  | 'increase_clarity'
  | 'stabilize_habit'
  | 'reengage'

export type Intervention = {
  type:
    | 'nudge'
    | 'reflection'
    | 'micro_task'
    | 'insight'
    | 'ultra_micro_task'
    | 'guided_choice'
    | 'emotional_rehook'
  priority: 'low' | 'medium' | 'high'
}

export type MentorChannel = 'web' | 'telegram' | 'miniapp'

export type MentorMessage = {
  text: string
  channel: MentorChannel
  meta?: {
    expected_action: boolean
    timestamp: number
    strategyKey?: string
  }
}

export type MentorTemplate = {
  observation: string
  nextStep: string
  followUp?: string
}

export type MentorRunResult = {
  intent: Intent
  intervention: Intervention
  message: MentorMessage
}

export type MentorRunOptions = {
  channel?: MentorChannel
  overrideIntent?: Intent
  overrideIntervention?: Intervention
  meta?: MentorMessage['meta']
}

export type MentorDelivery = {
  channel: MentorChannel
  adaptedMessage: string
  meta?: MentorMessage['meta']
}
