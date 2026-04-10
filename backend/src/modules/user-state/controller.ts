import type { Response } from 'express'
import { prisma } from '../../db/client.js'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { trackEvent } from '../events/service.js'
import { getAccessControlState } from '../access/service.js'
import { resolveUserLifecycle, syncLifecycleForUser } from '../flow-control/service.js'
import { getUserFunnelStage } from '../../lib/funnel/getUserFunnelStage.js'
import { getCrossChannelUserState } from './crossChannelState.service.js'

const DEFAULT_STATE = 'NEW'
const DEFAULT_STEP = 'LINK_TELEGRAM'

export async function getUserState(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const [user, accessControl, crossChannelState] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentState: true,
        currentStep: true,
      },
    }),
    getAccessControlState(userId),
    getCrossChannelUserState(userId),
  ])

  if (!user) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  await syncLifecycleForUser(userId).catch(() => null)
  const lifecycle = await resolveUserLifecycle(userId)
  const funnelStage = await getUserFunnelStage(userId)
  const state = lifecycle.state === 'trial'
    ? (user.currentState ?? 'TRIAL_DAY_1')
    : lifecycle.state === 'paid'
      ? 'ACTIVE'
      : lifecycle.state === 'expired'
        ? 'INACTIVE'
        : (user.currentState ?? DEFAULT_STATE)
  const step = lifecycle.state === 'trial' || lifecycle.state === 'paid'
    ? 'START_FLOW'
    : lifecycle.state === 'expired'
      ? 'PAYWALL'
      : (user.currentStep ?? DEFAULT_STEP)
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
    currentState: lifecycle.state,
    currentStep: lifecycle.currentStep,
    funnelStage,
    subscriptionStatus: lifecycle.subscriptionStatus,
    accessControl,
    lifecycle,
    crossChannelState,
  })
}
