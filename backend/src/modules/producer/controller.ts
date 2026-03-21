// backend/src/modules/producer/controller.ts

import type { Response } from 'express'
import { AuthenticatedRequest } from '../../types/globalTypes.js'
import { trackEvent, trackQuestionEvent } from '../events/service.js'
import { resolveUserState } from '../telegram-mentor/handlers/start.js'
import { analyzeFunnel, generateSEO, generateTargeting, getAssistantProgress, producerMentorChat } from './service.js'
import type { ProducerMentorChatBody, SEOInput } from './types.js'

const safeHandler = (
  fn: (req: AuthenticatedRequest, res: Response) => Promise<void | Response>,
) => async (req: AuthenticatedRequest, res: Response) => {
  try {
    await fn(req, res)
  } catch (error) {
    console.error('[Producer]', error)
    res.status(500).json({ error: 'producer_error', message: (error as Error).message })
  }
}

const requireUser = (req: AuthenticatedRequest, res: Response): string | null => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'unauthorized' })
    return null
  }
  return req.user.id
}

// POST /api/producer/seo
// Body: { productId, pageType, keyword? }
export const seoHandler = safeHandler(async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const input = req.body as SEOInput
  if (!input?.productId) return res.status(400).json({ error: 'product_id_required' })
  if (!input?.pageType)  return res.status(400).json({ error: 'page_type_required' })

  const result = await generateSEO(input)
  res.json({ success: true, seo: result })
})

// POST /api/producer/targeting
// Body: { productId }
export const targetingHandler = safeHandler(async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const { productId } = req.body as { productId?: string }
  if (!productId) return res.status(400).json({ error: 'product_id_required' })

  const result = await generateTargeting(productId)
  res.json({ success: true, targeting: result })
})

// POST /api/producer/funnel
// Body: { productId }
export const funnelHandler = safeHandler(async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const { productId } = req.body as { productId?: string }
  if (!productId) return res.status(400).json({ error: 'product_id_required' })

  const result = await analyzeFunnel(productId)
  res.json({ success: true, funnel: result })
})

export const assistantProgress = safeHandler(async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const progress = await getAssistantProgress(userId)
  res.json(progress)
})

export const producerMentorChatHandler = safeHandler(async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const body = req.body as ProducerMentorChatBody
  if (!body.message?.trim()) {
    return res.status(400).json({ error: 'empty_message' })
  }

  const state = await resolveUserState(userId).catch(() => null)
  await trackQuestionEvent({
    userId,
    source: 'web',
    state,
    text: body.message,
    detectedIntent: 'general',
    productContext: 'subscription',
    category: 'general',
  })

  const result = await producerMentorChat(userId, body)
  await trackEvent({
    userId,
    type: 'web_producer_mentor_chat_completed',
    source: 'web',
    state,
    payload: {
      replyLength: result.length,
      hasStepContext: Boolean(body.stepContext),
    },
  })

  res.json({ result })
})
