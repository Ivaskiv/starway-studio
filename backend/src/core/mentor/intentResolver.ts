import type { BehaviorInput, Intent } from './types.js'

const LOW_CONSISTENCY_THRESHOLD = 40
const HIGH_AVOIDANCE_THRESHOLD = 60
const HIGH_PROCRASTINATION_THRESHOLD = 60
const LOW_ENGAGEMENT_THRESHOLD = 30

export function resolveIntent(input: BehaviorInput): Intent {
  if (input.scores.procrastination > HIGH_PROCRASTINATION_THRESHOLD) {
    return 'reduce_resistance'
  }

  if (input.scores.avoidance > HIGH_AVOIDANCE_THRESHOLD) {
    return 'increase_clarity'
  }

  if (input.scores.engagement < LOW_ENGAGEMENT_THRESHOLD || input.patterns.includes('drop_off')) {
    return 'reengage'
  }

  if (
    input.scores.consistency < LOW_CONSISTENCY_THRESHOLD
    || input.patterns.includes('inconsistency')
  ) {
    return 'stabilize_habit'
  }

  return 'motivate'
}
