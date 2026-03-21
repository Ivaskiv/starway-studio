export type UserState =
  | 'NEW'
  | 'TELEGRAM_LINKED'
  | 'TRIAL_DAY_1'
  | 'TRIAL_DAY_2'

export type UserStep =
  | 'LINK_TELEGRAM'
  | 'START_FLOW'
  | 'WHEEL'
  | 'DAILY_MORNING'

export type UserEvent =
  | 'TELEGRAM_LINKED'
  | 'FLOW_STARTED'
  | 'WHEEL_COMPLETED'

export interface StateTransitionResult {
  state: UserState
  step: UserStep
}

export interface StateMachineUser {
  currentState: UserState
  currentStep: UserStep
}
