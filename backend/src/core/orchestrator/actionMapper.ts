import type { Decision } from './decisionResolver.js'

export type ExecutionPlan = {
  agent: 'mentor' | 'nudge' | 'conversion' | 'none'
  trigger: string
}

export function mapAction(decision: Decision): ExecutionPlan {
  switch (decision.action) {
    case 'push_task':
      return {
        agent: 'mentor',
        trigger: 'generate_task',
      }
    case 'nudge':
      return {
        agent: 'nudge',
        trigger: 'send_nudge',
      }
    case 'reflect':
      return {
        agent: 'mentor',
        trigger: 'generate_reflection',
      }
    case 'offer_conversion':
      return {
        agent: 'conversion',
        trigger: 'trigger_paywall',
      }
    case 'do_nothing':
      return {
        agent: 'none',
        trigger: 'noop',
      }
    default:
      return {
        agent: 'none',
        trigger: 'noop',
      }
  }
}
