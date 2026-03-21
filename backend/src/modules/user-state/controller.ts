import type { Response } from 'express'
import { prisma } from '../../db/client.js'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { trackEvent } from '../events/service.js'

const DEFAULT_STATE = 'NEW'
const DEFAULT_STEP = 'LINK_TELEGRAM'

export async function getUserState(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentState: true,
      currentStep: true,
    },
  })

  if (!user) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  const state = user.currentState ?? DEFAULT_STATE
  const step = user.currentStep ?? DEFAULT_STEP
  await trackEvent({
    userId,
    type: 'web_user_state_viewed',
    source: 'web',
    state,
    payload: {
      step,
    },
  })

  return res.json({
    state,
    step,
  })
}
