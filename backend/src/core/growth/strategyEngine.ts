import type { Intent, Intervention, MentorChannel } from '../mentor/types.js'
import { buildFeedbackKey, getSuccessRate } from './feedbackEngine.js'

export type StrategyInput = {
  userId: string
  pattern: string | null
  intent: Intent
  intervention: Intervention
  channel?: MentorChannel
}

export type StrategyResult = {
  key: string
  feedbackRate: number
  adapted: boolean
  intent: Intent
  intervention: Intervention
  channel?: MentorChannel
}

export function optimizeStrategy(input: StrategyInput): StrategyResult {
  const key = buildFeedbackKey(input.pattern, input.intent, input.intervention.type)
  const feedbackRate = getSuccessRate(key)

  if (feedbackRate >= 0.4) {
    const stable: StrategyResult = {
      key,
      feedbackRate,
      adapted: false,
      intent: input.intent,
      intervention: input.intervention,
      channel: input.channel,
    }
    console.log('[STRATEGY]', stable)
    return stable
  }

  const next: StrategyResult = {
    key,
    feedbackRate,
    adapted: true,
    intent: input.intent,
    intervention: input.intervention,
    channel: input.channel,
  }

  switch (input.pattern) {
    case 'procrastination':
      next.intent = 'reduce_resistance_fast'
      next.intervention = { type: 'ultra_micro_task', priority: 'high' }
      break
    case 'avoidance':
      next.intent = 'increase_clarity'
      next.intervention = { type: 'guided_choice', priority: 'medium' }
      break
    case 'drop_off':
      next.intent = 'reengage'
      next.intervention = { type: 'emotional_rehook', priority: 'high' }
      break
    default:
      next.adapted = false
      break
  }

  console.log('[STRATEGY]', next)
  return next
}
