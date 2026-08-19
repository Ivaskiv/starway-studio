import { Router, type Request, type Response } from 'express'

import { authRequired } from '../auth/middleware/auth.js'
import {
  findCloudinaryZoomAudioById,
  listCloudinaryZoomAudio,
} from '../zoom/audio/cloudinary-audio-ingest.service.js'

const router = Router()
const KYIV_TZ = 'Europe/Kyiv'

function getKyivDate(year: number, month: number, day: number, hour = 0, min = 0, sec = 0): Date {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  const date = new Date(dateStr)
  return new Date(date.toLocaleString('en-US', { timeZone: KYIV_TZ }))
}

function parseMonthRange(rawMonth: string | undefined): { from: Date; to: Date } | null {
  const normalized = String(rawMonth ?? '').trim()
  if (!/^\d{4}-\d{2}$/.test(normalized)) {
    return null
  }

  const [yearValue, monthValue] = normalized.split('-')
  const year = Number(yearValue)
  const monthIndex = Number(monthValue) - 1
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null
  }

  const from = getKyivDate(year, monthIndex + 1, 1, 0, 0, 0)
  const to = getKyivDate(year, monthIndex + 2, 0, 23, 59, 59)
  return { from, to }
}

function resolveAudioMimeType(format?: string | null): string {
  const normalized = String(format ?? '').trim().toLowerCase()
  switch (normalized) {
    case 'mp3':
      return 'audio/mpeg'
    case 'm4a':
    case 'mp4':
      return 'audio/mp4'
    case 'ogg':
    case 'oga':
      return 'audio/ogg'
    case 'wav':
      return 'audio/wav'
    case 'aac':
      return 'audio/aac'
    case 'flac':
      return 'audio/flac'
    case 'webm':
      return 'audio/webm'
    default:
      return 'application/octet-stream'
  }
}

function audioAuthMiddleware(req: Request, res: Response, next: () => void) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[audio:list] dev mode — auth bypass')
    return next()
  }
  return authRequired(req, res, next)
}

router.get('/list', audioAuthMiddleware, async (req: Request, res: Response) => {
  const month = typeof req.query.month === 'string' ? req.query.month : ''
  const monthRange = month ? parseMonthRange(month) : null

  if (month && !monthRange) {
    return res.status(400).json({
      ok: false,
      message: 'invalid month format, expected YYYY-MM',
    })
  }

  try {
    const items = await listCloudinaryZoomAudio({
      limitPerFolder: 100,
      ...(monthRange ?? {}),
    })

    return res.json({
      ok: true,
      month: month || null,
      count: items.length,
      items,
    })
  } catch (error) {
    console.error('[audio:list] failed', error)
    return res.status(500).json({
      ok: false,
      message: 'audio_list_failed',
    })
  }
})

router.get('/stream/:audioId', async (req: Request, res: Response) => {
  const audioId = String(req.params.audioId ?? '').trim()
  const disposition = String(req.query.download ?? '').trim() === '1'
    ? 'attachment'
    : 'inline'

  if (!audioId) {
    return res.status(400).json({
      ok: false,
      message: 'audioId required',
    })
  }

  try {
    const item = await findCloudinaryZoomAudioById(audioId)
    if (!item) {
      return res.status(404).json({
        ok: false,
        message: 'audio_not_found',
      })
    }

    const upstream = await fetch(item.secureUrl)
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        ok: false,
        message: 'audio_upstream_failed',
      })
    }

    const fileBuffer = Buffer.from(await upstream.arrayBuffer())
    const contentType = upstream.headers.get('content-type') || resolveAudioMimeType(item.format)
    const contentLength = upstream.headers.get('content-length')
    const safeFileName = item.fileName.replace(/[^a-zA-Z0-9._-]+/g, '_')

    res.setHeader('Content-Type', contentType)
    if (contentLength) {
      res.setHeader('Content-Length', contentLength)
    }
    res.setHeader('Cache-Control', 'private, max-age=300')
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeFileName}"`)
    return res.status(200).send(fileBuffer)
  } catch (error) {
    console.error('[audio:stream] failed', { audioId, error })
    return res.status(500).json({
      ok: false,
      message: 'audio_stream_failed',
    })
  }
})

export default router
