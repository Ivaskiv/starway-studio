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

export function isGroupPracticeRequest(requests: unknown): boolean {
  return resolveRequestedSessionType(requests) === 'group_practice'
}

export function isKyivMonday(date: Date): boolean {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: KYIV_TIME_ZONE,
    weekday: 'short',
  }).format(date) === 'Mon'
}

type MondayGroupPracticeCandidate = {
  id: string
  expertId?: string | null
  scheduledAt: Date
  requests?: unknown
  status?: string | null
}

/**
 * Calendar projection and creation both use this stable identity for the one
 * canonical Monday FOCUS practice: expert + Kyiv Monday + group_practice.
 * A cancelled predecessor never displaces a live replacement; otherwise the
 * earliest persisted practice is retained as the canonical record.
 */
export function selectCanonicalMondayGroupPracticeSessions<
  T extends MondayGroupPracticeCandidate,
>(sessions: T[]): T[] {
  const canonicalByPracticeDay = new Map<string, T>()

  for (const session of sessions) {
    if (
      !session.expertId
      || !isGroupPracticeRequest(session.requests)
      || !isKyivMonday(session.scheduledAt)
    ) {
      continue
    }

    const key = `${session.expertId}:${getKyivDateKey(session.scheduledAt)}`
    const current = canonicalByPracticeDay.get(key)
    if (!current) {
      canonicalByPracticeDay.set(key, session)
      continue
    }

    const currentIsCancelled = String(current.status ?? '').toUpperCase() === 'CANCELLED'
    const candidateIsCancelled = String(session.status ?? '').toUpperCase() === 'CANCELLED'
    const candidateWins =
      (currentIsCancelled && !candidateIsCancelled)
      || (currentIsCancelled === candidateIsCancelled
        && session.scheduledAt.getTime() < current.scheduledAt.getTime())

    if (candidateWins) {
      canonicalByPracticeDay.set(key, session)
    }
  }

  return sessions.filter((session) => {
    if (
      !session.expertId
      || !isGroupPracticeRequest(session.requests)
      || !isKyivMonday(session.scheduledAt)
    ) {
      return true
    }

    const key = `${session.expertId}:${getKyivDateKey(session.scheduledAt)}`
    return canonicalByPracticeDay.get(key)?.id === session.id
  })
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
