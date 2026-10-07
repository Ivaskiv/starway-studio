import { resolveTelegramWebappBaseUrl } from '../../config/webapp.js'

export type ZoomCalendarUrlParams = {
  intent?: string | null
  sessionId?: string | null
  cacheBust?: string | number | null
  zoomRole?: 'user' | 'coach' | 'ops' | null
}

export function buildZoomCalendarUrl(params: ZoomCalendarUrlParams = {}): string {
  const base = resolveTelegramWebappBaseUrl().replace(/\/$/, '')
  const search = new URLSearchParams()
  const intent = String(params.intent ?? '').trim()
  const sessionId = String(params.sessionId ?? '').trim()
  const cacheBust = String(params.cacheBust ?? '').trim()
  const zoomRole = params.zoomRole ?? 'user'

  if (intent) {
    search.set('intent', intent)
  }

  if (sessionId) {
    search.set('sessionId', sessionId)
  }

  if (cacheBust) {
    search.set('v', cacheBust)
  }

  search.set('zoomRole', zoomRole)

  const query = search.toString()
  return query ? `${base}/miniapp/zoom-calendar?${query}` : `${base}/miniapp/zoom-calendar`
}
