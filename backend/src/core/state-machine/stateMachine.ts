import type { StateTransitionResult, UserEvent, UserState } from './types.js'

export function transition(
  state: UserState,
  event: UserEvent,
): StateTransitionResult | null {
  switch (state) {
    case 'NEW':
      if (event === 'TELEGRAM_LINKED') {
        return { state: 'TELEGRAM_LINKED', step: 'START_FLOW' }
      }
      return null

    case 'TELEGRAM_LINKED':
      if (event === 'FLOW_STARTED') {
        return { state: 'TRIAL_DAY_1', step: 'WHEEL' }
      }
      return null

    case 'TRIAL_DAY_1':
      if (event === 'WHEEL_COMPLETED') {
        return { state: 'TRIAL_DAY_2', step: 'DAILY_MORNING' }
      }
      return null

    case 'TRIAL_DAY_2':
      return null

    default:
      return null
  }
}
