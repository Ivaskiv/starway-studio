import type { Request, Response } from 'express'
import type { Prisma } from '@starway/db/prisma-client'
import { trackEvent } from './service.js'

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
  const payload = isJsonObject(body.payload) ? body.payload : {}

  if (!type) {
    return res.status(400).json({ error: 'type_required' })
  }

  if (!ALLOWED_SOURCES.has(source)) {
    return res.status(400).json({ error: 'invalid_source' })
  }

  await trackEvent({
    userId,
    type,
    source: source as 'telegram' | 'web' | 'miniapp',
    state,
    payload,
  })

  return res.json({ ok: true })
}
