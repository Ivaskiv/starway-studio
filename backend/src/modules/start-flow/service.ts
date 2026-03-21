import { prisma } from '../../db/client.js'
import { applyTransition } from '../../core/state-machine/service.js'
import type {
  StateMachineUser,
  UserState,
  UserStep,
} from '../../core/state-machine/types.js'

const DEFAULT_STATE: UserState = 'NEW'
const DEFAULT_STEP: UserStep = 'LINK_TELEGRAM'

export async function startFlow(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      currentState: true,
      currentStep: true,
    },
  })

  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }

  const stateMachineUser: StateMachineUser = {
    currentState: (user.currentState as UserState | null) ?? DEFAULT_STATE,
    currentStep: (user.currentStep as UserStep | null) ?? DEFAULT_STEP,
  }

  const result = applyTransition(stateMachineUser, 'TELEGRAM_LINKED')

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      currentState: result.state,
      currentStep: result.step,
      telegramLinkedAt: new Date(),
    },
    select: {
      currentState: true,
      currentStep: true,
    },
  })

  return {
    state: updated.currentState ?? result.state,
    step: updated.currentStep ?? result.step,
  }
}
