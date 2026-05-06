import type { UserState } from './stateResolver.js'

export type Decision = {
  action:
    | 'nudge'
    | 'reflect'
    | 'push_task'
    | 'offer_conversion'
    | 'do_nothing'
  priority: 'low' | 'medium' | 'high'
}

export function resolveDecision(state: UserState): Decision {
  switch (state) {
    case 'stuck':
      return {
        action: 'push_task',
        priority: 'high',
      }
    case 'churn_risk':
      return {
        action: 'nudge',
        priority: 'high',
      }
    case 'engaged':
      return {
        action: 'offer_conversion',
        priority: 'medium',
      }
    case 'converting':
      return {
        action: 'offer_conversion',
        priority: 'high',
      }
    case 'new':
      return {
        action: 'reflect',
        priority: 'low',
      }
    case 'paid':
      return {
        action: 'do_nothing',
        priority: 'low',
      }
    default:
      return {
        action: 'do_nothing',
        priority: 'low',
      }
  }
}
