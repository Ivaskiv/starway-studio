import type { Response } from 'express'
import { trackEvent } from '../events/service.js'
import { resolveUserState } from '../telegram-mentor/handlers/start.js'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { startFlow } from './service.js'

export async function startFlowController(
  req: AuthenticatedRequest,
  res: Response,
) {
  const userId = req.user?.id

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const result = await startFlow(userId)
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_start_flow_started',
      source: 'web',
      state,
      payload: {
        result: typeof result === 'object' && result ? JSON.parse(JSON.stringify(result)) : null,
      },
    })
    return res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

    if (message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'user_not_found' })
    }

    if (message === 'INVALID_TRANSITION') {
      return res.status(409).json({ error: 'INVALID_TRANSITION' })
    }

    return res.status(500).json({ error: 'server_error' })
  }
}
