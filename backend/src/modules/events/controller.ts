import type { Request, Response } from 'express'
import type { Prisma } from '@starway/db/prisma-client'
import { trackEvent, trackLeadEnteredApp } from './service.js'

const ALLOWED_SOURCES = new Set(['telegram', 'web', 'miniapp'])

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export async function ingestEvent(req: Request, res: Response) {
  const body = req.body

  if (!isJsonObject(body)) {
    return res.status(400).json({ error: 'invalid_body' })
  }

  const type = typeof body.type === 'string' ? body.type : ''
  const source = typeof body.source === 'string' ? body.source : ''
  const state = typeof body.state === 'string' ? body.state : null
  const userId = typeof body.userId === 'string' ? body.userId : null
  const email = typeof body.email === 'string' ? body.email : null
  const utmSource = typeof body.utm_source === 'string' ? body.utm_source : typeof body.utmSource === 'string' ? body.utmSource : null
  const utmCampaign = typeof body.utm_campaign === 'string' ? body.utm_campaign : typeof body.utmCampaign === 'string' ? body.utmCampaign : null
  const productId = typeof body.product_id === 'string' ? body.product_id : typeof body.productId === 'string' ? body.productId : null
  const payload = isJsonObject(body.payload) ? body.payload : {}

  if (!type) {
    return res.status(400).json({ error: 'type_required' })
  }

  if (!ALLOWED_SOURCES.has(source)) {
    return res.status(400).json({ error: 'invalid_source' })
  }

  const trackInput = {
    userId,
    type,
    source: source as 'telegram' | 'web' | 'miniapp',
    state,
    payload,
    email,
    utmSource,
    utmCampaign,
    productId,
    upsertUser: !userId && Boolean(email),
  }

  if (type === 'lead_entered_app') {
    await trackLeadEnteredApp(trackInput)
  } else {
    await trackEvent(trackInput)
  }

  return res.json({ ok: true })
}
