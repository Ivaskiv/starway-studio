import { Router,type Response } from 'express'
import type { AuthenticatedRequest } from '../../../types/globalTypes.js'
import { authRequired } from '../../auth/middleware/auth.js'
import { getAllResearchData,getResearchData,refreshMarketResearch } from '../content-research/service.js'
import { expertGuard } from '../guards.js'
import {
filterContentStudioItemsByFormats,
generateContentStudioImages,
generateContentStudioItems,
publishContentStudioItem,
publishLeadMagnet,
regenerateContentStudioItem,
saveLeadMagnetDraft,
testLeadMagnetTelegram,
type ContentStudioInputs,
type ContentStudioItem,
type ContentStudioRequestedFormat,
type LeadMagnetPreviewPayload,
} from './service.js'

const contentStudioRouter = Router()

contentStudioRouter.post('/content-studio/generate', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const { inputs, formats, strategy } = req.body as { inputs?: ContentStudioInputs; formats?: ContentStudioRequestedFormat[]; strategy?: unknown }
  if (!inputs) {
    return res.status(400).json({ error: 'inputs_required' })
  }

  const items = filterContentStudioItemsByFormats(generateContentStudioItems(inputs, strategy as any), formats)
  return res.json({
    ok: true,
    items,
    generatedAt: new Date().toISOString(),
  })
})

contentStudioRouter.post('/content-studio/regenerate', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const { item, inputs, strategy } = req.body as { item?: ContentStudioItem; inputs?: ContentStudioInputs; strategy?: unknown }
  if (!item || !inputs) {
    return res.status(400).json({ error: 'item_and_inputs_required' })
  }

  const nextItem = regenerateContentStudioItem(item, inputs, strategy as any)
  return res.json(nextItem)
})

contentStudioRouter.post('/content-studio/publish', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const { item } = req.body as { item?: ContentStudioItem }
  if (!item) {
    return res.status(400).json({ error: 'item_required' })
  }

  const publishedItem = publishContentStudioItem(item)

  console.log('[content-studio] published', {
    userId: req.user?.id ?? null,
    itemId: publishedItem.id,
    type: publishedItem.type,
    title: publishedItem.title,
  })

  return res.json({
    ok: true,
    item: publishedItem,
    publishedAt: publishedItem.updatedAt,
  })
})

contentStudioRouter.post('/content-studio/lead-magnet/save', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const { payload } = req.body as { payload?: LeadMagnetPreviewPayload }
  if (!payload) {
    return res.status(400).json({ error: 'payload_required' })
  }

  try {
    const result = await saveLeadMagnetDraft({
      userId: req.user?.id ?? '',
      payload,
    })

    return res.json({ ok: true, ...result })
  } catch (error) {
    console.error('[content-studio] lead magnet save failed', error)
    return res.status(502).json({ error: 'lead_magnet_save_failed' })
  }
})

contentStudioRouter.post('/content-studio/lead-magnet/test', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const { payload, telegramToken, telegramChatId } = req.body as {
    payload?: LeadMagnetPreviewPayload
    telegramToken?: string
    telegramChatId?: string
  }

  if (!payload) {
    return res.status(400).json({ error: 'payload_required' })
  }
  if (!telegramToken?.trim() || !telegramChatId?.trim()) {
    return res.status(400).json({ error: 'telegram_token_and_chat_required' })
  }

  try {
    const result = await testLeadMagnetTelegram({
      userId: req.user?.id ?? '',
      payload,
      telegramToken,
      telegramChatId,
    })

    return res.json({ ok: true, ...result })
  } catch (error) {
    console.error('[content-studio] lead magnet telegram test failed', error)
    return res.status(502).json({ error: 'lead_magnet_telegram_test_failed' })
  }
})

contentStudioRouter.post('/content-studio/lead-magnet/publish', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const { payload, telegramToken, telegramChatId } = req.body as {
    payload?: LeadMagnetPreviewPayload
    telegramToken?: string
    telegramChatId?: string
  }

  if (!payload) {
    return res.status(400).json({ error: 'payload_required' })
  }
  if (payload.status !== 'approved') {
    return res.status(409).json({ error: 'lead_magnet_not_approved' })
  }
  if (payload.destinations.includes('telegram_bot') && (!telegramToken?.trim() || !telegramChatId?.trim())) {
    return res.status(400).json({ error: 'telegram_token_and_chat_required' })
  }

  try {
    const result = await publishLeadMagnet({
      userId: req.user?.id ?? '',
      payload,
      telegramToken,
      telegramChatId,
    })

    return res.json({ ok: true, ...result })
  } catch (error) {
    console.error('[content-studio] lead magnet publish failed', error)
    return res.status(502).json({ error: 'lead_magnet_publish_failed' })
  }
})

contentStudioRouter.post('/content-studio/generate-images', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const { item, count } = req.body as { item?: ContentStudioItem; count?: number }
  if (!item) {
    return res.status(400).json({ error: 'item_required' })
  }

  try {
    const nextItem = await generateContentStudioImages(item, count ?? 5)
    return res.json({
      ok: true,
      item: nextItem,
      generatedAt: nextItem.updatedAt,
    })
  } catch (error) {
    console.error('[content-studio] image generation failed', error)
    return res.status(502).json({ error: 'image_generation_failed' })
  }
})

contentStudioRouter.get('/content-studio/research', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const rawType = req.query.type
  const rawPlatform = req.query.platform
  const type = typeof rawType === 'string' ? rawType : null
  const platform = typeof rawPlatform === 'string' ? rawPlatform : 'instagram'

  if (type) {
    const data = await getResearchData(type as 'hooks' | 'ads' | 'formulas' | 'reels_trends', platform as 'instagram' | 'meta_ads' | 'tiktok' | 'youtube')
    return res.json(data ?? { error: 'no_data_yet' })
  }

  const payload = await getAllResearchData()
  return res.json(payload)
})

contentStudioRouter.post('/content-studio/research/refresh', authRequired, async (req: AuthenticatedRequest, res: Response) => {
  if (expertGuard(req, res)) return

  const result = await refreshMarketResearch()
  return res.json({
    ok: result.success,
    updated: result.updated,
    errors: result.errors,
    message: `Оновлено ${result.updated} джерел даних`,
    nextRefresh: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
  })
})

export default contentStudioRouter
