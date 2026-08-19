import type { ZoomSessionType } from '@starway/db/prisma-client'
import { KYIV_TIME_ZONE } from './zoom.time.utils.js'

export function getKyivDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KYIV_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function extractZoomLinkFromRequests(requests: unknown): string {
  if (!requests || Array.isArray(requests) || typeof requests !== 'object')
    return ''
  const meta = requests as Record<string, unknown>
  return typeof meta.zoomLink === 'string' ? meta.zoomLink : ''
}

export function resolveRequestedSessionType(requests: unknown): string | null {
  if (!requests || Array.isArray(requests) || typeof requests !== 'object')
    return null
  const rawType = (requests as Record<string, unknown>).type
  return typeof rawType === 'string' ? rawType.trim().toLowerCase() : null
}

type TrialZoomSessionCandidate = {
  id: string
  scheduledAt: Date
  requests?: unknown
  type?: ZoomSessionType
}

export function selectTrialZoomEligibleSession<
  T extends TrialZoomSessionCandidate,
>(sessions: T[], trialEndsAt: Date | null): T | null {
  if (!trialEndsAt) return null

  const targetDateKey = getKyivDateKey(trialEndsAt)
  const matchingSessions = sessions
    .filter((session) => {
      const sessionType =
        resolveRequestedSessionType(session.requests) ??
        String(session.type ?? '')
          .trim()
          .toLowerCase()
      return (
        sessionType === 'group_practice' &&
        getKyivDateKey(session.scheduledAt) === targetDateKey
      )
    })
    .sort(
      (left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime()
    )

  return matchingSessions[0] ?? null
}
