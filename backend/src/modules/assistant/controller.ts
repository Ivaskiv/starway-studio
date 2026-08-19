import type { Response } from 'express'
import { trackEvent, trackQuestionEvent } from '../events/service.js'
import { resolveUserState } from '../telegram-mentor/handlers/start.js'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { assistantChat } from './service.js'

function resolveRequestId(req: AuthenticatedRequest): string {
  const headerValue = req.headers['x-request-id']
  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim()
  }
  return `web:${req.user?.id ?? 'anonymous'}:${Date.now()}`
}

export async function chat(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id
  const message = typeof req.body?.message === 'string' ? req.body.message : ''

  if (!userId) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const state = await resolveUserState(userId).catch(() => null)

  await trackEvent({
    userId,
    type: 'web_assistant_chat_requested',
    source: 'web',
    state,
    payload: {
      hasMessage: Boolean(message),
    },
  })

  if (message) {
    await trackQuestionEvent({
      userId,
      source: 'web',
      state,
      text: message,
      detectedIntent: 'general',
      productContext: 'general',
      category: 'general',
    })
  }

  const data = await assistantChat(userId, message, {
    platform: 'web',
    requestId: resolveRequestId(req),
  })

  await trackEvent({
    userId,
    type: 'web_assistant_chat_completed',
    source: 'web',
    state,
    payload: {
      hasResponse: Boolean(data),
    },
  })

  return res.json(data)
}
