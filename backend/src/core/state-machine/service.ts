import { transition } from './stateMachine.js'
import type {
  StateMachineUser,
  StateTransitionResult,
  UserEvent,
} from './types.js'

export function applyTransition(
  user: StateMachineUser,
  event: UserEvent,
): StateTransitionResult {
  const next = transition(user.currentState, event)

  if (!next) {
    throw new Error('INVALID_TRANSITION')
  }

  return next
}
