import type { BehaviorInput, Intent, Intervention } from './types.js'

export function selectIntervention(intent: Intent, input: BehaviorInput): Intervention {
  switch (intent) {
    case 'reduce_resistance':
      return { type: 'micro_task', priority: 'high' }
    case 'reduce_resistance_fast':
      return { type: 'ultra_micro_task', priority: 'high' }
    case 'increase_clarity':
      return {
        type: 'reflection',
        priority: input.scores.avoidance >= 80 ? 'high' : 'medium',
      }
    case 'reengage':
      return { type: 'nudge', priority: 'high' }
    case 'stabilize_habit':
      return { type: 'micro_task', priority: 'medium' }
    case 'motivate':
    default:
      return { type: 'insight', priority: 'low' }
  }
}
