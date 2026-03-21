import { applyTransition } from './service.js'
import { transition } from './stateMachine.js'

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

export function runStateMachineSelfTest(): true {
  const linked = transition('NEW', 'TELEGRAM_LINKED')
  assert(linked?.state === 'TELEGRAM_LINKED', 'NEW -> TELEGRAM_LINKED failed')
  assert(linked?.step === 'START_FLOW', 'NEW -> START_FLOW failed')

  const started = transition('TELEGRAM_LINKED', 'FLOW_STARTED')
  assert(started?.state === 'TRIAL_DAY_1', 'FLOW_STARTED state failed')
  assert(started?.step === 'WHEEL', 'FLOW_STARTED step failed')

  const completedWheel = applyTransition(
    { currentState: 'TRIAL_DAY_1', currentStep: 'WHEEL' },
    'WHEEL_COMPLETED',
  )
  assert(completedWheel.state === 'TRIAL_DAY_2', 'WHEEL_COMPLETED state failed')
  assert(
    completedWheel.step === 'DAILY_MORNING',
    'WHEEL_COMPLETED step failed',
  )

  return true
}
