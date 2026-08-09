import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import { accessApi } from '@/features/auth/services/accessApi'
import { useTelegramMiniAppAuthMutation } from '@/features/auth/services/auth.api'
import {
  selectAuthStatus,
  selectCurrentUser,
  selectUserRole,
  setLoading,
} from '@/features/auth/services/auth.slice'
import {
  useCreateProductPaymentMutation,
  useReportFocusPaymentIssueMutation,
} from '@/features/subscription/services/billing.api'
import { openExternalPaymentUrl } from '@/features/subscription/utils/openExternalPaymentUrl'
import {
  useRegisterAttendeeMutation,
  useSubmitBookingQuestionMutation,
} from '@/features/zoom/services/zoom.api'
import type { ZoomWeekOverview } from '@/features/zoom/types/zoom.types'
import { getSessionDateLabel, getSessionMeta } from '@/features/zoom/zoom.utils'
import { api } from '@/services/api'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  ZoomCalendarCard as Card,
  ZoomCalendarSkeleton,
} from '../components/ZoomCalendarSkeleton'
import { useZoomCalendarData } from '../hooks/useZoomCalendarData'
import {
  formatWeekDate,
  getVisibleWeekSessions,
  hasConfirmedFocusAccess,
  isDirectZoomBookingRequest,
  isGroupPracticeBookingSession,
  normalizeZoomHubSession,
  pluralizeParticipants,
  readDirectZoomBookingParams,
  resolveBookingPrimaryActionLabel,
  resolveBookingSessionDateLabel,
  resolveDirectZoomBookingState,
  resolveNextSessionQuestionSummary,
  resolveNextZoomBoundaryAt,
  resolvePreviousZoomRecapAttendanceLabel,
  resolvePreviousZoomRecapDateLabel,
  resolvePreviousZoomRecapNextStep,
  resolvePreviousZoomRecapPreview,
  resolvePreviousZoomRecapTitle,
  resolveTelegramMiniAppAuthInitData,
  resolveUpcomingZoomSessions,
  resolveZoomAccessState,
  resolveZoomCalendarEntryMode,
  resolveZoomHubEmptyState,
  resolveZoomHubPrimaryAction,
  resolveZoomHubPrimaryActionClassName,
  resolveZoomSessionTitle,
  shouldPrimeDirectBooking,
  shouldRenderPaymentGate,
} from '../utils/zoomCalendar.utils'

import {
  addKyivDays,
  getKyivDateKey,
  KYIV_TIMEZONE,
} from '../utils/zoomDateTime.utils'

export { getKyivWeekRange } from '../utils/zoomDateTime.utils'

// COMPAT: presentation/hub helpers
export {
  resolvePreviousZoomRecapAttendanceLabel,
  resolvePreviousZoomRecapDateLabel,
  resolvePreviousZoomRecapNextStep,
  resolvePreviousZoomRecapPreview,
  resolvePreviousZoomRecapTitle,
  resolveZoomHubEmptyState,
  resolveZoomHubPrimaryAction,
  resolveZoomHubPrimaryActionClassName,
  resolveZoomSessionTitle,
  shouldRenderPaymentGate,
} from '../utils/zoomCalendar.utils'

// COMPAT: session-domain helpers
export {
  getVisibleWeekSessions,
  pickNextZoomSession,
  resolveNearestZoomSession,
  resolveNextZoomBoundaryAt,
  resolveUpcomingZoomSessions,
} from '../utils/zoomCalendar.utils'

// COMPAT: access/direct-booking helpers
export {
  hasConfirmedFocusAccess,
  isDirectZoomBookingRequest,
  readDirectZoomBookingParams,
  resolveDirectZoomBookingState,
  resolveTelegramMiniAppAuthInitData,
  resolveZoomAccessState,
  shouldPrimeDirectBooking,
} from '../utils/zoomCalendar.utils'

export {
  resolveNextSessionQuestionSummary,
  resolveZoomCalendarEntryMode,
} from '../utils/zoomCalendar.utils'

// MOVED TO ../utils/zoomDateTime.utils
// const KYIV_TIMEZONE = 'Europe/Kyiv'
/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
const FALLBACK_ZOOM_SESSION_TITLE = 'Групова Zoom-практика'
 */
// MOVED TO ../utils/zoomDateTime.utils
// const DEFAULT_ZOOM_SESSION_DURATION_MINUTES = 60

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/date formatting.
 * Kept temporarily for safe migration.
function formatWeekDate(value: string): string {
  return new Date(value).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    timeZone: KYIV_TIMEZONE,
  })
}
 */

/* MOVED TO ../utils/zoomDateTime.utils
 * Kept temporarily for safe migration.
function getKyivDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KYIV_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
 */

function isCoachRole(role: string | null | undefined): boolean {
  const normalizedRole = String(role ?? '')
    .trim()
    .toUpperCase()
  return (
    normalizedRole === 'EXPERT' ||
    normalizedRole === 'ADMIN' ||
    normalizedRole === 'SUPERADMIN'
  )
}

/* MOVED TO ../utils/zoomCalendar.utils
 * Kept temporarily for safe migration.
type ZoomAccessSnapshot =
  | {
      state: 'NO_ACCESS' | 'FOCUS_ACTIVE' | 'FREE_WEEK1' | 'PREMIUM'
      isActive: boolean
      hasFocus: boolean
    }
  | undefined
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Kept temporarily for safe migration.
type DirectZoomBookingParams = {
  action: string | null
  sessionId: string | null
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
type ZoomHubPrimaryAction = 'open_access' | 'book' | 'join' | 'browse' | 'none'
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
type ZoomHubPrimaryActionState = {
  action: ZoomHubPrimaryAction
  label: string
  description: string
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
type ZoomHubEmptyState = {
  title: string
  description: string
  accessNote: string
}
 */

// type ZoomBookingScreenData = {
//   previousSessionRecap: ZoomPreviousSessionRecap | null
//   nextSession: ZoomWeekOverview['sessions'][number] | null
//   isPreview: boolean
// }

type BookingRegistrationStatus =
  | 'booked'
  | 'already_booked'
  | 'no_active_subscription'
  | 'error'

export const MINIAPP_ACCENT_BUTTON_CLASSNAME =
  'rounded-xl bg-[rgb(var(--accent-rgb))] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-60'

const ZOOM_BOUNDARY_REFRESH_BUFFER_MS = 1000

/* MOVED TO ../utils/zoomCalendar.utils
 * Kept temporarily for safe migration.
export function resolveTelegramMiniAppAuthInitData(
  authStatus: 'authenticated' | 'loading' | 'unauthenticated' | string,
  initData: string | null | undefined
) {
  if (authStatus === 'authenticated' || authStatus === 'loading') {
    return null
  }

  const normalizedInitData = String(initData ?? '').trim()
  return normalizedInitData || null
}

export function resolveZoomAccessState(input: {
  authRestoreStatus: AuthRestoreStatus
  canRunProtectedQueries: boolean
  isAccessLoading: boolean
  zoomAccess: ZoomAccessSnapshot
}) {
  if (
    input.isAccessLoading ||
    input.authRestoreStatus !== 'ready' ||
    !input.canRunProtectedQueries ||
    input.zoomAccess === undefined
  ) {
    return 'loading' as const
  }

  if (
    (input.zoomAccess.state === 'FOCUS_ACTIVE' &&
      input.zoomAccess.hasFocus === true &&
      input.zoomAccess.isActive) ||
    input.zoomAccess.state === 'FREE_WEEK1'
  ) {
    return 'active' as const
  }

  if (input.zoomAccess.state === 'PREMIUM') {
    return 'active' as const
  }

  return 'inactive' as const
}

export function hasConfirmedFocusAccess(
  state:
    | {
        zoomAccess?: ZoomAccessSnapshot
      }
    | null
    | undefined
) {
  return Boolean(
    (state?.zoomAccess?.state === 'FOCUS_ACTIVE' &&
      state.zoomAccess.hasFocus === true &&
      state.zoomAccess.isActive) ||
    state?.zoomAccess?.state === 'FREE_WEEK1' ||
    state?.zoomAccess?.state === 'PREMIUM'
  )
}

export function readDirectZoomBookingParams(
  search: string
): DirectZoomBookingParams {
  const params = new URLSearchParams(search)
  const action = params.get('action')?.trim() ?? ''
  const sessionId = params.get('sessionId')?.trim() ?? ''

  return {
    action: action || null,
    sessionId: sessionId || null,
  }
}

export function isDirectZoomBookingRequest(
  params: DirectZoomBookingParams
): boolean {
  return params.action === 'book' && Boolean(params.sessionId)
}

export function shouldPrimeDirectBooking(input: {
  isDirectBooking: boolean
  isAlreadyBooked: boolean
  primedDirectSessionId: string | null
  questionSubmittedSessionId: string | null
  sessionId: string | null
}) {
  if (!input.isDirectBooking || !input.sessionId || input.isAlreadyBooked) {
    return false
  }

  return (
    input.primedDirectSessionId !== input.sessionId &&
    input.questionSubmittedSessionId !== input.sessionId
  )
}

export function resolveDirectZoomBookingState(input: {
  isDirectBooking: boolean
  accessState: 'loading' | 'active' | 'inactive'
  isScheduleLoading: boolean
  hasDirectSession: boolean
}) {
  if (!input.isDirectBooking) {
    return 'calendar' as const
  }

  if (input.accessState === 'loading') {
    return 'checking_access' as const
  }

  if (input.accessState === 'inactive') {
    return 'locked' as const
  }

  if (input.isScheduleLoading) {
    return 'loading_session' as const
  }

  if (input.hasDirectSession) {
    return 'session' as const
  }

  return 'calendar' as const
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: session-domain pure logic.
 * Kept temporarily for safe migration.
export function pickNextZoomSession(
  sessions: ZoomWeekOverview['sessions'],
  now = new Date()
) {
  const sortedSessions = [...sessions].sort(
    (left, right) =>
      new Date(left.scheduledAt).getTime() -
      new Date(right.scheduledAt).getTime()
  )

  const currentOrUpcoming = sortedSessions.find((session) =>
    isSessionStillRelevant(session, now)
  )

  if (currentOrUpcoming) {
    return currentOrUpcoming
  }

  return (
    sortedSessions.find((session) => session.status !== 'CANCELLED') ?? null
  )
}
 */

/* MOVED TO ../utils/zoomDateTime.utils
 * Kept temporarily for safe migration.
function getTimeZoneDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0')

  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
    second: pick('second'),
  }
}
 */

/* MOVED TO ../utils/zoomDateTime.utils
 * Kept temporarily for safe migration.
function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getTimeZoneDateParts(date, timeZone)
  const utcTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )

  return utcTimestamp - date.getTime()
}
 */

/* MOVED TO ../utils/zoomDateTime.utils
 * Kept temporarily for safe migration.
function createUtcDateForTimeZone(input: {
  year: number
  month: number
  day: number
  hour?: number
  minute?: number
  second?: number
  millisecond?: number
  timeZone: string
}) {
  const utcGuess = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour ?? 0,
    input.minute ?? 0,
    input.second ?? 0,
    input.millisecond ?? 0
  )
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), input.timeZone)
  return new Date(utcGuess - offset)
}

/* MOVED TO ../utils/zoomDateTime.utils
 * Kept temporarily for safe migration.
function addKyivDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const base = createUtcDateForTimeZone({
    year,
    month,
    day,
    hour: 12,
    minute: 0,
    second: 0,
    millisecond: 0,
    timeZone: KYIV_TIMEZONE,
  })
  const shifted = new Date(base.getTime() + days * 86400000)
  return getKyivDateKey(shifted)
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: session-domain pure logic.
 * Kept temporarily for safe migration.
function getSessionDurationMinutes(session: { durationMinutes?: unknown }) {
  return typeof session.durationMinutes === 'number' &&
    session.durationMinutes > 0
    ? session.durationMinutes
    : DEFAULT_ZOOM_SESSION_DURATION_MINUTES
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: session-domain pure logic.
 * Kept temporarily for safe migration.
function resolveSessionEndAt(session: {
  scheduledAt: string
  endsAt?: unknown
  durationMinutes?: unknown
}) {
  if (typeof session.endsAt === 'string') {
    const explicitEnd = new Date(session.endsAt)
    if (Number.isFinite(explicitEnd.getTime())) {
      return explicitEnd
    }
  }

  return new Date(
    new Date(session.scheduledAt).getTime() +
      getSessionDurationMinutes(session) * 60 * 1000
  )
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: session-domain pure logic.
 * Kept temporarily for safe migration.
function isSessionStillRelevant(
  session: {
    scheduledAt: string
    status: string
    endsAt?: unknown
    durationMinutes?: unknown
  },
  now: Date
) {
  if (session.status === 'CANCELLED' || session.status === 'COMPLETED') {
    return false
  }

  const startsAt = new Date(session.scheduledAt)
  if (!Number.isFinite(startsAt.getTime())) {
    return false
  }

  const endsAt = resolveSessionEndAt(session)
  return endsAt.getTime() > now.getTime()
}
 */

export function resolveNearestSessionDateLabel(
  scheduledAt: string,
  now = new Date()
) {
  const sessionDate = new Date(scheduledAt)
  const sessionDateKey = getKyivDateKey(sessionDate)
  const todayKey = getKyivDateKey(now)
  const tomorrowKey = addKyivDays(todayKey, 1)
  const timeLabel = sessionDate.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KYIV_TIMEZONE,
  })

  if (sessionDateKey === todayKey) {
    return `Сьогодні · ${timeLabel}`
  }

  if (sessionDateKey === tomorrowKey) {
    return `Завтра · ${timeLabel}`
  }

  return `${formatWeekDate(scheduledAt)} · ${timeLabel}`
}

/* MOVED TO ../utils/zoomDateTime.utils
 * Kept temporarily for safe migration.
type KyivWeekRange = {
  from: string
  to: string
  timezone: typeof KYIV_TIMEZONE
}
 */

/* MOVED TO ../utils/zoomDateTime.utils
 * Kept temporarily for safe migration.
export function getKyivWeekRange(now = new Date()): KyivWeekRange {
  const kyivNow = getTimeZoneDateParts(now, KYIV_TIMEZONE)
  const kyivNoonUtc = createUtcDateForTimeZone({
    ...kyivNow,
    hour: 12,
    minute: 0,
    second: 0,
    millisecond: 0,
    timeZone: KYIV_TIMEZONE,
  })
  const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: KYIV_TIMEZONE,
    weekday: 'short',
  })
  const weekday = weekdayFormatter.format(kyivNoonUtc)
  const weekdayIndex = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ].indexOf(weekday)
  const mondayNoonUtc = new Date(
    kyivNoonUtc.getTime() - Math.max(weekdayIndex, 0) * 86400000
  )
  const sundayNoonUtc = new Date(mondayNoonUtc.getTime() + 6 * 86400000)
  const mondayKyiv = getTimeZoneDateParts(mondayNoonUtc, KYIV_TIMEZONE)
  const sundayKyiv = getTimeZoneDateParts(sundayNoonUtc, KYIV_TIMEZONE)

  const fromDate = createUtcDateForTimeZone({
    ...mondayKyiv,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
    timeZone: KYIV_TIMEZONE,
  })

  return {
    from: fromDate.toISOString(),
    to: new Date(fromDate.getTime() + 7 * 86400000 - 1).toISOString(),
    timezone: KYIV_TIMEZONE,
  }
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: session-domain pure logic.
 * Kept temporarily for safe migration.
function normalizeZoomHubSession(
  session: ZoomSessionDTO | ZoomCalendarSession,
  patch?: Partial<ZoomWeekOverview['sessions'][number]>
): ZoomWeekOverview['sessions'][number] {
  return {
    id: session.id,
    expertId: 'expertId' in session ? (session.expertId ?? null) : null,
    scheduledAt: session.scheduledAt,
    topic: session.topic,
    status: session.status,
    requests: 'requests' in session ? session.requests : [],
    postSessionReport:
      'postSessionReport' in session ? session.postSessionReport : null,
    createdAt: 'createdAt' in session ? session.createdAt : session.scheduledAt,
    updatedAt: 'updatedAt' in session ? session.updatedAt : session.scheduledAt,
    type: 'GROUP',
    attendeesCount: 0,
    questionPreviews: [],
    questionsCount: 0,
    remainingQuestionsCount: 0,
    isMyBooking: false,
    audioFileId: null,
    hasAudio: false,
    zoomLink: '',
    ...patch,
  }
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: session-domain pure logic.
 * Kept temporarily for safe migration.
export function resolveNearestZoomSession(input: {
  currentWeekSessions: ZoomWeekOverview['sessions']
  upcomingSession: ZoomSessionDTO | null | undefined
  mySessions: ZoomSessionWithAttendance[]
  now?: Date
}) {
  const now = input.now ?? new Date()
  const bookedSessionIds = new Set(
    input.mySessions
      .filter((session) => session.isRegistered)
      .map((session) => session.id)
  )

  if (
    input.upcomingSession &&
    isSessionStillRelevant(input.upcomingSession, now)
  ) {
    const currentWeekMatch = input.currentWeekSessions.find(
      (session) => session.id === input.upcomingSession?.id
    )

    if (currentWeekMatch) {
      return {
        ...currentWeekMatch,
        isMyBooking:
          currentWeekMatch.isMyBooking ||
          bookedSessionIds.has(currentWeekMatch.id),
      }
    }

    return normalizeZoomHubSession(input.upcomingSession, {
      isMyBooking: bookedSessionIds.has(input.upcomingSession.id),
    })
  }

  return pickNextZoomSession(input.currentWeekSessions, now)
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: session-domain pure logic.
 * Kept temporarily for safe migration.
function mergeBookedState(
  session: ZoomWeekOverview['sessions'][number],
  bookedSessionIds: Set<string>
) {
  return {
    ...session,
    isMyBooking: session.isMyBooking || bookedSessionIds.has(session.id),
  }
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: session-domain pure logic.
 * Kept temporarily for safe migration.
export function resolveUpcomingZoomSessions(input: {
  currentWeekSessions: ZoomWeekOverview['sessions']
  upcomingSession: ZoomSessionDTO | null | undefined
  mySessions: ZoomSessionWithAttendance[]
  now?: Date
}) {
  const now = input.now ?? new Date()
  const bookedSessionIds = new Set(
    input.mySessions
      .filter((session) => session.isRegistered)
      .map((session) => session.id)
  )
  const mergedSessions = new Map<string, ZoomWeekOverview['sessions'][number]>()

  for (const session of input.currentWeekSessions) {
    mergedSessions.set(session.id, mergeBookedState(session, bookedSessionIds))
  }

  if (input.upcomingSession) {
    const existingSession = mergedSessions.get(input.upcomingSession.id)
    mergedSessions.set(
      input.upcomingSession.id,
      existingSession
        ? mergeBookedState(existingSession, bookedSessionIds)
        : normalizeZoomHubSession(input.upcomingSession, {
            isMyBooking: bookedSessionIds.has(input.upcomingSession.id),
          })
    )
  }

  const upcomingSessions = [...mergedSessions.values()]
    .filter((session) => isSessionStillRelevant(session, now))
    .sort(
      (left, right) =>
        new Date(left.scheduledAt).getTime() -
        new Date(right.scheduledAt).getTime()
    )

  return {
    upcomingSessions,
    nextSession: upcomingSessions[0] ?? null,
    visibleSessionCount: upcomingSessions.length,
  }
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: session-domain pure logic.
 * Kept temporarily for safe migration.
export function resolveNextZoomBoundaryAt(
  sessions: Array<{
    scheduledAt: string
    status: string
    endsAt?: unknown
    durationMinutes?: unknown
  }>,
  now = new Date()
) {
  const candidateBoundaries = sessions.flatMap((session) => {
    if (session.status === 'CANCELLED' || session.status === 'COMPLETED') {
      return []
    }

    const startsAt = new Date(session.scheduledAt)
    if (!Number.isFinite(startsAt.getTime())) {
      return []
    }

    const endsAt = resolveSessionEndAt(session)
    const boundaries = []

    if (startsAt.getTime() > now.getTime()) {
      boundaries.push(startsAt)
    }

    if (endsAt.getTime() > now.getTime()) {
      boundaries.push(endsAt)
    }

    return boundaries
  })

  if (candidateBoundaries.length === 0) {
    return null
  }

  return (
    candidateBoundaries.sort(
      (left, right) => left.getTime() - right.getTime()
    )[0] ?? null
  )
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
export function shouldRenderPaymentGate(
  accessState: 'loading' | 'active' | 'inactive'
) {
  return accessState === 'inactive'
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
export function resolveZoomSessionTitle(topic: string | null | undefined) {
  const normalizedTopic = String(topic ?? '').trim()

  if (!normalizedTopic) {
    return FALLBACK_ZOOM_SESSION_TITLE
  }

  return normalizedTopic
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
const PREVIOUS_ZOOM_MATERIALS_PENDING_COPY =
  'Матеріали цієї практики ще готуються.'
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
export function resolvePreviousZoomRecapTitle(recap: ZoomPreviousSessionRecap) {
  const explicitTitle = recap.title?.trim()
  if (explicitTitle) {
    return explicitTitle
  }

  return `Zoom-практика за ${formatWeekDate(recap.startsAt)}`
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
export function resolvePreviousZoomRecapDateLabel(startsAt: string) {
  const date = new Date(startsAt)
  const timeLabel = date.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KYIV_TIMEZONE,
  })

  return `${formatWeekDate(startsAt)} · ${timeLabel}`
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
export function resolvePreviousZoomRecapPreview(
  recap: ZoomPreviousSessionRecap
) {
  const summary = recap.summary?.trim()
  if (summary) {
    return summary.length > 180
      ? `${summary.slice(0, 177).trimEnd()}...`
      : summary
  }

  if (!recap.recordingUrl && !recap.materialsUrl) {
    return PREVIOUS_ZOOM_MATERIALS_PENDING_COPY
  }

  return null
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
export function resolvePreviousZoomRecapAttendanceLabel(
  attendanceCount: number
) {
  if (!Number.isFinite(attendanceCount) || attendanceCount <= 0) {
    return null
  }

  return `${attendanceCount} ${pluralizeParticipants(attendanceCount)}`
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
export function resolvePreviousZoomRecapNextStep(
  recap: ZoomPreviousSessionRecap
) {
  const nextStep = recap.nextStep?.trim()
  return nextStep || null
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Kept temporarily for safe migration.
export function resolveZoomCalendarEntryMode(search: string) {
  const intent = new URLSearchParams(search).get('intent')?.trim()
  return intent === 'booking' ? 'booking' : 'default'
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
function pluralizeParticipants(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'учасник'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return 'учасники'
  return 'учасників'
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
function formatUppercaseWeekday(scheduledAt: string) {
  return new Date(scheduledAt)
    .toLocaleDateString('uk-UA', {
      weekday: 'long',
      timeZone: KYIV_TIMEZONE,
    })
    .toUpperCase()
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Kept temporarily for safe migration.
export function resolveNextSessionQuestionSummary(
  session: ZoomWeekOverview['sessions'][number]
) {
  const questions = session.questionPreviews ?? []

  if (questions.length === 0) {
    return null
  }

  return {
    primary: questions.slice(0, 3),
    all: questions,
    remaining: Math.max(questions.length - 3, 0),
  }
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Kept temporarily for safe migration.
function resolveBookingPrimaryActionLabel(
  session: ZoomWeekOverview['sessions'][number]
) {
  void session
  return 'ЗАПИСАТИСЬ'
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Kept temporarily for safe migration.
function resolveBookingSessionDateLabel(scheduledAt: string) {
  const date = new Date(scheduledAt)
  const dayLabel = date.toLocaleDateString('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: KYIV_TIMEZONE,
  })
  const time = date.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KYIV_TIMEZONE,
  })

  return `${dayLabel.charAt(0).toUpperCase()}${dayLabel.slice(1)} · ${time}`
}
 */

// function getBookingPreviewFixture(): ZoomBookingScreenData {
//   return {
//     isPreview: true,
//     previousSessionRecap: {
//       id: 'preview-previous-session',
//       title: 'Розбирали, чому важко тримати фокус увечері',
//       startsAt: '2026-07-28T16:00:00.000Z',
//       endsAt: null,
//       summary:
//         'Основний інсайт: втома тіла плутається з втомою мотивації. Домовились на цьому тижні відстежувати це окремо.',
//       recordingUrl: null,
//       materialsUrl: null,
//       attendanceStatus: 'ATTENDED',
//       attendanceCount: 14,
//       nextStep: 'Відстежити енергію ввечері',
//     },
//     nextSession: {
//       id: 'preview-next-session',
//       expertId: null,
//       scheduledAt: '2026-08-10T16:00:00.000Z',
//       topic: 'Понеділок, 10 серпня · 19:00',
//       status: 'SCHEDULED',
//       requests: [],
//       postSessionReport: null,
//       createdAt: '2026-08-05T08:00:00.000Z',
//       updatedAt: '2026-08-05T08:00:00.000Z',
//       type: 'group_practice',
//       attendeesCount: 9,
//       questionPreviews: [
//         'Як не зриватись на вихідних',
//         'Планування тижня з дітьми',
//         'Повернення після відпустки',
//         'Як відновити режим після паузи',
//         'Як не перевантажити план',
//         'Що робити, коли немає сил',
//         'Як тримати один пріоритет',
//         'Як повернути ранковий ритм',
//         'Як завершувати почате',
//       ],
//       questionsCount: 9,
//       remainingQuestionsCount: 6,
//       isMyBooking: false,
//       audioFileId: null,
//       hasAudio: false,
//       zoomLink: '',
//     },
//   }
// }

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: session-domain pure logic.
 * Kept temporarily for safe migration.
function isGroupPracticeBookingSession(
  session: ZoomWeekOverview['sessions'][number]
) {
  const normalizedType = getNormalizedSessionType(session)
  return normalizedType === 'group_practice' || normalizedType === 'group'
}
 */

export async function performBookingScreenRegistration(input: {
  sessionId: string
  registerAttendee: (payload: { sessionId: string }) => {
    unwrap: () => Promise<unknown>
  }
  refetchCurrentWeek: () => Promise<unknown> | unknown
  refetchUpcoming: () => Promise<unknown> | unknown
  refetchMySessions: () => Promise<unknown> | unknown
}): Promise<BookingRegistrationStatus> {
  try {
    await input.registerAttendee({ sessionId: input.sessionId }).unwrap()
    await Promise.all([
      input.refetchCurrentWeek(),
      input.refetchUpcoming(),
      input.refetchMySessions(),
    ])
    return 'booked'
  } catch (error) {
    const normalizedError =
      typeof error === 'object' && error && 'data' in error
        ? (error as { data?: { error?: string } }).data?.error
        : null

    if (normalizedError === 'ALREADY_BOOKED') {
      return 'already_booked'
    }

    if (normalizedError === 'NO_ACTIVE_SUBSCRIPTION') {
      return 'no_active_subscription'
    }

    return 'error'
  }
}

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: session-domain pure logic.
 * Kept temporarily for safe migration.
export function getVisibleWeekSessions(
  currentWeekSessions: ZoomWeekOverview['sessions'],
  nextSession: ZoomWeekOverview['sessions'][number] | null,
  now = new Date()
) {
  return currentWeekSessions.filter(
    (session) =>
      isSessionStillRelevant(session, now) && session.id !== nextSession?.id
  )
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
export function resolveZoomHubEmptyState(input: {
  hasZoomHubAccess: boolean
  shouldShowDirectSessionOnly: boolean
  nextSession: ZoomWeekOverview['sessions'][number] | null
  previousSessionRecap: ZoomPreviousSessionRecap | null
}): ZoomHubEmptyState | null {
  if (!input.hasZoomHubAccess || input.shouldShowDirectSessionOnly) {
    return null
  }

  if (!input.nextSession && !input.previousSessionRecap) {
    return {
      title: 'Наступний Zoom уже готується',
      description:
        'Розклад оновлюється автоматично. Щойно наступна практика буде доступна, ми повідомимо тебе в боті.',
      accessNote: 'Твій доступ активний.',
    }
  }

  return null
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
export function resolveZoomHubPrimaryAction(input: {
  accessState: 'loading' | 'active' | 'inactive'
  session: ZoomWeekOverview['sessions'][number] | null
  now?: Date
}): ZoomHubPrimaryActionState {
  if (input.accessState === 'inactive') {
    return {
      action: 'open_access' as ZoomHubPrimaryAction,
      label: 'Отримати доступ',
      description: 'Оплати ФОКУС або онови статус, щоб записатися на Zoom.',
    }
  }

  if (!input.session) {
    return {
      action: 'none' as ZoomHubPrimaryAction,
      label: 'Zoom ще не відкрито',
      description: 'Розклад оновлюється автоматично.',
    }
  }

  const now = input.now ?? new Date()
  const sessionIsActive =
    isSessionStillRelevant(input.session, now) &&
    new Date(input.session.scheduledAt).getTime() <= now.getTime()

  if (sessionIsActive && input.session.zoomLink) {
    return {
      action: 'join' as ZoomHubPrimaryAction,
      label: 'ПРИЄДНАТИСЯ',
      description: 'Практика вже триває. Відкрий Zoom за активним посиланням.',
    }
  }

  if (input.session.status === 'COMPLETED') {
    return {
      action: 'none' as ZoomHubPrimaryAction,
      label: 'Zoom завершено',
      description:
        'Ця практика вже завершилась. Обери наступну доступну сесію.',
    }
  }

  if (input.session.status === 'CANCELLED') {
    return {
      action: 'none' as ZoomHubPrimaryAction,
      label: 'Сесію скасовано',
      description:
        'Цю сесію скасовано. Нижче показані актуальні доступні Zoom.',
    }
  }

  if (input.session.isMyBooking) {
    return {
      action: 'none' as ZoomHubPrimaryAction,
      label: 'ТИ ЗАПИСАНА',
      description:
        'Ти вже записана. Зафіксуй питання або відкрий свою сесію нижче.',
    }
  }

  return {
    action: 'book' as ZoomHubPrimaryAction,
    label: `ЗАПИСАТИСЬ НА ${formatUppercaseWeekday(input.session.scheduledAt)}`,
    description: 'Обери цю практику як наступний конкретний крок.',
  }
}
 */

/* MOVED TO ../utils/zoomCalendar.utils
 * Canonical owner: presentation/hub pure logic.
 * Kept temporarily for safe migration.
export function resolveZoomHubPrimaryActionClassName(
  action: ZoomHubPrimaryAction
) {
  if (action === 'join') {
    return 'min-h-11 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white'
  }

  if (action === 'book') {
    return 'min-h-11 rounded-xl bg-[rgb(var(--accent-rgb))] px-4 py-3 text-sm font-semibold text-[var(--on-accent)]'
  }

  if (action === 'open_access') {
    return 'min-h-11 rounded-xl bg-[rgb(var(--accent-rgb))] px-4 py-3 text-sm font-semibold text-[var(--on-accent)]'
  }

  return 'min-h-11 rounded-xl bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-100'
}
 */

export default function CleanMiniAppZoomCalendar() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const authStatus = useAppSelector(selectAuthStatus)
  const user = useAppSelector(selectCurrentUser)
  const role = useAppSelector(selectUserRole)
  const isCoach = isCoachRole(role)

  const { authRestoreStatus, canRunProtectedQueries } = useSessionOrchestrator()
  const {
    zoomAccess,
    isLoading: isAccessLoading,
    isError: isAccessError,
  } = useSystemState()

  const routeSearch = location.search
  const entryMode = resolveZoomCalendarEntryMode(routeSearch)
  const isBookingEntry = entryMode === 'booking'

  const {
    usePublicBookingSchedule,
    weekRange,
    rawCurrentWeekSessions,
    isCurrentWeekLoading,
    isCurrentWeekError,
    refetchCurrentWeek,
    publicUpcomingSession,
    isPublicUpcomingLoading,
    isPublicUpcomingError,
    upcomingSession,
    isUpcomingLoading,
    isUpcomingError,
    refetchUpcoming,
    mySessions,
    previousSessionRecap,
    isMySessionsLoading,
    isMySessionsError,
    refetchMySessions,
  } = useZoomCalendarData({
    hasUser: Boolean(user),
    userId: user?.id ?? '',
    isCoach,
    isBookingEntry,
    authRestoreStatus,
    canRunProtectedQueries,
  })

  const [telegramMiniAppAuth] = useTelegramMiniAppAuthMutation()
  const [registerAttendee, { isLoading: isRegistering }] =
    useRegisterAttendeeMutation()
  const [submitBookingQuestion, { isLoading: isSubmittingBookingQuestion }] =
    useSubmitBookingQuestionMutation()
  const [createProductPayment, { isLoading: isOpeningPayment }] =
    useCreateProductPaymentMutation()
  const [reportFocusPaymentIssue, { isLoading: isReportingPaymentIssue }] =
    useReportFocusPaymentIssueMutation()
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [bookingSuccessSessionId, setBookingSuccessSessionId] = useState<
    string | null
  >(null)
  const [questionSessionId, setQuestionSessionId] = useState<string | null>(
    null
  )
  const [bookingQuestionText, setBookingQuestionText] = useState('')
  const [bookingQuestionError, setBookingQuestionError] = useState<
    string | null
  >(null)
  const [questionSubmittedSessionId, setQuestionSubmittedSessionId] = useState<
    string | null
  >(null)
  const [questionSkippedSessionId, setQuestionSkippedSessionId] = useState<
    string | null
  >(null)
  const [showQuestionInput, setShowQuestionInput] = useState(false)
  const [showAllBookingQuestions, setShowAllBookingQuestions] = useState(false)
  const [primedDirectSessionId, setPrimedDirectSessionId] = useState<
    string | null
  >(null)
  const [directBookingExpired, setDirectBookingExpired] = useState(false)
  const authBootstrapStartedRef = useRef(false)
  const bookingButtonRef = useRef<HTMLButtonElement | null>(null)
  const directBookingParams = readDirectZoomBookingParams(routeSearch)

  const scheduleSessions = usePublicBookingSchedule
    ? []
    : rawCurrentWeekSessions

  const currentWeekSessions = scheduleSessions.map((session) =>
    normalizeZoomHubSession(session, {
      type: session.type as ZoomWeekOverview['sessions'][number]['type'],
      attendeesCount: session.attendeesCount ?? 0,
      questionPreviews: session.questionPreviews ?? [],
      questionsCount: session.questionsCount ?? 0,
      remainingQuestionsCount: session.remainingQuestionsCount ?? 0,
      isMyBooking: session.isMyBooking ?? false,
      audioFileId: session.audioFileId ?? null,
      hasAudio: Boolean(session.audioFileId),
      zoomLink: session.zoomLink ?? '',
    })
  )

  const now = new Date()
  const accessState = resolveZoomAccessState({
    authRestoreStatus,
    canRunProtectedQueries,
    isAccessLoading,
    zoomAccess,
  })
  const hasZoomHubAccess = accessState === 'active'
  const isDirectBooking =
    isDirectZoomBookingRequest(directBookingParams) && !directBookingExpired

  const directSessionId = directBookingParams.sessionId

  const effectiveUpcomingSession =
    upcomingSession ??
    (usePublicBookingSchedule ? publicUpcomingSession : null)

  const canonicalSessions = resolveUpcomingZoomSessions({
    currentWeekSessions: currentWeekSessions.filter(
      isGroupPracticeBookingSession
    ),
    upcomingSession: effectiveUpcomingSession,
    mySessions,
    now,
  })

  const nextSession = canonicalSessions.nextSession
  const directSession = isDirectBooking
    ? (canonicalSessions.upcomingSessions.find(
        (session) => session.id === directSessionId
      ) ?? (nextSession?.id === directSessionId ? nextSession : null))
    : null

  const isScheduleLoading = usePublicBookingSchedule
    ? isPublicUpcomingLoading
    : isCurrentWeekLoading || isUpcomingLoading || isMySessionsLoading

  const isScheduleError = usePublicBookingSchedule
    ? isPublicUpcomingError
    : isCurrentWeekError || isUpcomingError || isMySessionsError

  const directBookingState = resolveDirectZoomBookingState({
    isDirectBooking,
    accessState,
    isScheduleLoading,
    hasDirectSession: Boolean(directSession),
  })
  const isCalendarLoading = isBookingEntry
    ? isScheduleLoading
    : !isDirectBooking && (accessState === 'loading' || isScheduleLoading)

  const shouldShowCalendarSkeleton =
    isCalendarLoading ||
    directBookingState === 'checking_access' ||
    directBookingState === 'loading_session'

  const shouldShowDirectSessionOnly =
    directBookingState === 'session' && Boolean(directSession)

  const visibleWeekSessions = getVisibleWeekSessions(
    currentWeekSessions,
    nextSession,
    now
  )

  const visibleSessions =
    shouldShowDirectSessionOnly && directSession
      ? [directSession]
      : visibleWeekSessions

  const sessionsCount = shouldShowDirectSessionOnly
    ? 1
    : canonicalSessions.visibleSessionCount

  const primaryAction = resolveZoomHubPrimaryAction({
    accessState,
    session: nextSession,
    now,
  })

  // const bookingPreviewFixture = isBookingEntry
  //   ? getBookingPreviewFixture()
  //   : null

  // const bookingPreviousSessionRecap =
  //   previousSessionRecap ?? bookingPreviewFixture?.previousSessionRecap ?? null

  // const bookingNextSession =
  //   nextSession ?? bookingPreviewFixture?.nextSession ?? null

  //   !nextSession &&
  //   bookingNextSession?.id === bookingPreviewFixture?.nextSession?.id

  // const shouldRenderBookingScreen =
  //   isBookingEntry && Boolean(bookingPreviousSessionRecap || bookingNextSession)

  const bookingPreviousSessionRecap = previousSessionRecap ?? null

  const bookingNextSession =
    isBookingEntry && upcomingSession
      ? normalizeZoomHubSession(upcomingSession, {
          attendeesCount: upcomingSession.attendeesCount ?? 0,
          questionPreviews: upcomingSession.questionPreviews ?? [],
          questionsCount: upcomingSession.questionsCount ?? 0,
          remainingQuestionsCount:
            upcomingSession.remainingQuestionsCount ?? 0,
          isMyBooking: upcomingSession.isMyBooking ?? false,
          myQuestion: upcomingSession.myQuestion ?? null,
        })
      : nextSession ?? null

  const shouldRenderBookingScreen =
    isBookingEntry && Boolean(bookingPreviousSessionRecap || bookingNextSession)
  const bookingQuestionSummary = bookingNextSession
    ? resolveNextSessionQuestionSummary(bookingNextSession)
    : null

  const emptyState = resolveZoomHubEmptyState({
    hasZoomHubAccess,
    shouldShowDirectSessionOnly,
    nextSession,
    previousSessionRecap,
  })
  const visiblePreviousSessionRecap = previousSessionRecap
  const nextBoundaryAt = resolveNextZoomBoundaryAt(
    canonicalSessions.upcomingSessions,
    now
  )

  useEffect(() => {
    dispatch(
      api.util.invalidateTags([
        'Access',
        'Products',
        'Subscription',
        'ZoomSession',
      ])
    )
  }, [dispatch])

  useEffect(() => {
    if (authBootstrapStartedRef.current) {
      return
    }

    const nextInitData = resolveTelegramMiniAppAuthInitData(
      authStatus,
      (
        window as {
          Telegram?: {
            WebApp?: {
              initData?: string
            }
          }
        }
      ).Telegram?.WebApp?.initData
    )

    if (!nextInitData) {
      return
    }

    authBootstrapStartedRef.current = true
    dispatch(setLoading())
    void telegramMiniAppAuth({ initData: nextInitData })
  }, [authStatus, dispatch, telegramMiniAppAuth])

  useEffect(() => {
    if (!user || authRestoreStatus !== 'ready' || !canRunProtectedQueries) {
      return
    }

    const refetchZoomState = () => {
      dispatch(api.util.invalidateTags(['ZoomSession']))
      void Promise.all([
        refetchCurrentWeek(),
        refetchUpcoming(),
        refetchMySessions(),
      ])
    }

    const handleWindowFocus = () => {
      refetchZoomState()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetchZoomState()
      }
    }

    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [
    authRestoreStatus,
    canRunProtectedQueries,
    dispatch,
    refetchCurrentWeek,
    refetchMySessions,
    refetchUpcoming,
    user,
  ])

  useEffect(() => {
    if (
      !nextBoundaryAt ||
      !user ||
      authRestoreStatus !== 'ready' ||
      !canRunProtectedQueries
    ) {
      return
    }

    const timeoutMs = Math.max(
      0,
      nextBoundaryAt.getTime() - Date.now() + ZOOM_BOUNDARY_REFRESH_BUFFER_MS
    )
    const timerId = window.setTimeout(() => {
      dispatch(api.util.invalidateTags(['ZoomSession']))
      void Promise.all([
        refetchCurrentWeek(),
        refetchUpcoming(),
        refetchMySessions(),
      ])
    }, timeoutMs)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [
    authRestoreStatus,
    canRunProtectedQueries,
    dispatch,
    nextBoundaryAt,
    refetchCurrentWeek,
    refetchMySessions,
    refetchUpcoming,
    user,
  ])

  useEffect(() => {
    if (!user || !import.meta.env.DEV || accessState === 'loading') return
    console.info('[ZOOM_CALENDAR_ACCESS]', {
      userId: user.id,
      zoomAccess,
      accessState,
    })
  }, [accessState, user, zoomAccess])

  useEffect(() => {
    const sessionId = directSession?.id ?? null
    if (
      !shouldPrimeDirectBooking({
        isDirectBooking,
        isAlreadyBooked: Boolean(directSession?.isMyBooking),
        primedDirectSessionId,
        questionSubmittedSessionId,
        sessionId: directSessionId ?? sessionId,
      })
    ) {
      return
    }

    setActiveSessionId(null)
    setBookingSuccessSessionId(null)
    setQuestionSessionId(directSessionId ?? sessionId)
    setBookingQuestionText('')
    setBookingQuestionError(null)
    setQuestionSkippedSessionId(null)
    setShowQuestionInput(true)
    setMessage(null)
    setPrimedDirectSessionId(directSessionId ?? sessionId)
  }, [
    directSession,
    isDirectBooking,
    directSessionId,
    primedDirectSessionId,
    questionSubmittedSessionId,
  ])

  const openBookingQuestionForm = (sessionId: string) => {
    console.log('[ZOOM_BOOKING_DEBUG][QUESTION_FORM]', {
      sessionId,
    })

    setActiveSessionId(null)
    setBookingSuccessSessionId(null)
    setQuestionSessionId(sessionId)
    setBookingQuestionText('')
    setBookingQuestionError(null)
    setQuestionSubmittedSessionId(null)
    setQuestionSkippedSessionId(null)
    setShowQuestionInput(true)
    setMessage(null)
  }
  const refreshAccess = async () => {
    setMessage(null)
    const telegramUserId =
      (
        window as {
          Telegram?: {
            WebApp?: {
              initDataUnsafe?: {
                user?: { id?: number }
              }
            }
          }
        }
      ).Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null
    const endpoint = '/access/state'
    const zoomAccessBeforeRefresh = zoomAccess
    let responseBody: unknown = null
    let httpStatus: number | null = null
    let focusAccessConfirmed = false

    try {
      const accessResponse = await dispatch(
        accessApi.endpoints.getMySystemState.initiate(undefined, {
          forceRefetch: true,
          subscribe: false,
        })
      )

      if ('data' in accessResponse) {
        const nextSystemState = accessResponse.data
        responseBody = nextSystemState
        httpStatus = 200
        if (nextSystemState) {
          dispatch(
            accessApi.util.upsertQueryData(
              'getMySystemState',
              undefined,
              nextSystemState
            )
          )
          focusAccessConfirmed = hasConfirmedFocusAccess(nextSystemState)
        }
      } else {
        responseBody = accessResponse.error
        httpStatus =
          typeof accessResponse.error === 'object' &&
          accessResponse.error &&
          'status' in accessResponse.error
            ? Number(accessResponse.error.status ?? 0) || null
            : null
      }
    } catch (error) {
      responseBody = error
    }

    if (focusAccessConfirmed) {
      dispatch(api.util.invalidateTags(['ZoomSession']))
      await Promise.all([
        refetchCurrentWeek(),
        refetchUpcoming(),
        refetchMySessions(),
      ])
    }

    console.info('[ZOOM_ACCESS_REFRESH_FRONTEND]', {
      telegramUserId,
      authSessionUserId: user?.id ?? null,
      endpoint,
      httpStatus,
      responseBody,
      zoomAccessBeforeRefresh,
      zoomAccessAfterRefresh:
        typeof responseBody === 'object' && responseBody
          ? ((responseBody as { zoomAccess?: unknown }).zoomAccess ?? null)
          : null,
    })

    if (focusAccessConfirmed) {
      setMessage('Доступ оновлено.')
      return
    }

    setMessage(
      'Доступ ще не підтверджено. Якщо вже оплатила, натисни ПРОБЛЕМИ З ОПЛАТОЮ.'
    )
  }

  const handleRefreshAccess = async () => {
    await refreshAccess()
  }

  const openPayment = async () => {
    setMessage(null)
    try {
      const response = await createProductPayment({
        productId: 'focus',
        planCode: '1month',
        source: 'web',
        targetPath: '/miniapp/zoom-calendar?payment=success',
      }).unwrap()

      if (response.status === 'already_active') {
        await refreshAccess()
        return
      }

      const checkoutUrl = response.checkoutUrl ?? response.paymentUrl
      if (!checkoutUrl) {
        setMessage('Не вдалося відкрити оплату. Натисни ПРОБЛЕМИ З ОПЛАТОЮ.')
        return
      }

      openExternalPaymentUrl(checkoutUrl)
    } catch (err) {
      const paymentError =
        typeof err === 'object' && err
          ? (err as {
              status?: number | string
              data?: { error?: string; message?: string } | string | null
            })
          : null
      const errorMessage =
        typeof paymentError?.data === 'object' && paymentError.data
          ? (paymentError.data.error ?? paymentError.data.message ?? null)
          : typeof paymentError?.data === 'string'
            ? paymentError.data
            : null

      console.error('[FOCUS_PAYMENT_OPEN_ERROR]', {
        status: paymentError?.status ?? null,
        data: paymentError?.data ?? null,
        error: err,
      })
      setMessage(
        errorMessage ??
          'Не вдалося відкрити оплату. Натисни ПРОБЛЕМИ З ОПЛАТОЮ.'
      )
    }
  }

  const handleReportPaymentIssue = async () => {
    setMessage(null)
    try {
      await reportFocusPaymentIssue().unwrap()
      setMessage(
        'Проблему з оплатою передано в STARWAY OPS. Перевіряємо транзакцію.'
      )
    } catch {
      setMessage('Не вдалося зафіксувати проблему з оплатою. Спробуй ще раз.')
    }
  }

  const register = async (sessionId: string) => {
    openBookingQuestionForm(sessionId)
  }

  const handleSubmitBookingQuestion = async () => {
    const sessionId = questionSessionId?.trim()
    const questionText = bookingQuestionText.trim()
    const selectedSession =
      canonicalSessions.upcomingSessions.find(
        (session) => session.id === sessionId
      ) ?? null
    const shouldCreateBooking =
      !selectedSession?.isMyBooking && questionSubmittedSessionId !== sessionId

    if (!sessionId) return
    if (!questionText) {
      setBookingQuestionError('Напиши питання або ситуацію, щоб надіслати.')
      return
    }

    setBookingQuestionError(null)

    try {
      if (shouldCreateBooking) {
        setActiveSessionId(sessionId)

        try {
          await registerAttendee({ sessionId }).unwrap()
        } catch (error) {
          const normalizedError =
            typeof error === 'object' && error && 'data' in error
              ? (error as { data?: { error?: string } }).data?.error
              : null

          if (normalizedError === 'NO_ACTIVE_SUBSCRIPTION') {
            setMessage('Доступ до Zoom відкривається з активним ФОКУСОМ.')
            return
          }

          if (normalizedError === 'session_not_found') {
            setDirectBookingExpired(true)
            setBookingQuestionError(null)
            setMessage('Це посилання застаріло. Ось актуальні Zoom-сесії.')
            return
          }

          if (normalizedError !== 'ALREADY_BOOKED') {
            setBookingQuestionError(
              'Не вдалося записати. Онови доступ і спробуй ще раз.'
            )
            return
          }
        }
      }

      await submitBookingQuestion({ sessionId, questionText }).unwrap()
      await Promise.all([
        refetchCurrentWeek(),
        refetchUpcoming(),
        refetchMySessions(),
      ])
      setBookingSuccessSessionId(sessionId)
      setQuestionSubmittedSessionId(sessionId)
      setShowQuestionInput(false)
      setBookingQuestionText('')
      setMessage('Ти записана.')
    } catch {
      setBookingQuestionError('Не вдалося надіслати питання. Спробуй ще раз.')
    } finally {
      if (shouldCreateBooking) {
        setActiveSessionId(null)
      }
    }
  }

  const handleSkipBookingQuestion = async () => {
    const sessionId = questionSessionId?.trim()
    const selectedSession =
      canonicalSessions.upcomingSessions.find(
        (session) => session.id === sessionId
      ) ?? null

    if (!sessionId) return

    setBookingQuestionError(null)

    try {
      if (
        !selectedSession?.isMyBooking &&
        questionSubmittedSessionId !== sessionId
      ) {
        setActiveSessionId(sessionId)

        const registrationStatus = await performBookingScreenRegistration({
          sessionId,
          registerAttendee,
          refetchCurrentWeek,
          refetchUpcoming,
          refetchMySessions,
        })

        if (registrationStatus === 'no_active_subscription') {
          setMessage('Доступ до Zoom відкривається з активним ФОКУСОМ.')
          return
        }

        if (registrationStatus === 'error') {
          setBookingQuestionError(
            'Не вдалося записати. Онови доступ і спробуй ще раз.'
          )
          return
        }

        setBookingSuccessSessionId(sessionId)
      }

      setQuestionSkippedSessionId(sessionId)
      setShowQuestionInput(false)
      setBookingQuestionText('')
      setMessage('Ти записана.')
    } finally {
      setActiveSessionId(null)
    }
  }

  const handleNextZoomAction = async () => {
    if (primaryAction.action === 'open_access') {
      await openPayment()
      return
    }

    if (!nextSession) {
      return
    }

    if (primaryAction.action === 'book') {
      await register(nextSession.id)
      return
    }

    if (primaryAction.action === 'join' && nextSession.zoomLink) {
      window.open(nextSession.zoomLink, '_blank', 'noopener,noreferrer')
      return
    }

    if (primaryAction.action === 'browse') {
      const sessionCard = document.querySelector<HTMLElement>(
        `[data-session-card="${nextSession.id}"]`
      )
      sessionCard?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  useEffect(() => {
    if (!isBookingEntry) return

    const timer = window.setTimeout(() => {
      const button = bookingButtonRef.current

      const reactDisabledReasons = {
        activeRequest:
          Boolean(bookingNextSession) &&
          activeSessionId === bookingNextSession?.id,

        alreadyBooked: Boolean(bookingNextSession?.isMyBooking),

        bookingSucceeded:
          Boolean(bookingNextSession) &&
          bookingSuccessSessionId === bookingNextSession?.id,
      }

      const computedStyle = button ? window.getComputedStyle(button) : null

      const rect = button?.getBoundingClientRect() ?? null

      const centerElement =
        rect && rect.width > 0 && rect.height > 0
          ? document.elementFromPoint(
              rect.left + rect.width / 2,
              rect.top + rect.height / 2
            )
          : null

      console.group('🔥 [ZOOM_BOOKING_DIAGNOSTIC]')

      console.log('1_FRONTEND_RUNTIME', {
        href: window.location.href,
        origin: window.location.origin,
        hostname: window.location.hostname,
        port: window.location.port,
        mode: import.meta.env.MODE,
        dev: import.meta.env.DEV,
        prod: import.meta.env.PROD,
      })

      console.log('2_AUTH', {
        authStatus,
        authRestoreStatus,
        canRunProtectedQueries,
        hasUser: Boolean(user),
        userId: user?.id ?? null,
        accessState,
        zoomAccess,
      })

      console.log('3_DATA_SOURCE', {
        usePublicBookingSchedule,

        publicUpcomingLoading: isPublicUpcomingLoading,
        publicUpcomingError: isPublicUpcomingError,

        publicUpcomingSession: publicUpcomingSession
          ? {
              id: publicUpcomingSession.id,
              scheduledAt: publicUpcomingSession.scheduledAt,
              status: publicUpcomingSession.status,
              topic: publicUpcomingSession.topic,
            }
          : null,

        authenticatedUpcomingSession: upcomingSession
          ? {
              id: upcomingSession.id,
              scheduledAt: upcomingSession.scheduledAt,
              status: upcomingSession.status,
              topic: upcomingSession.topic,
            }
          : null,

        effectiveUpcomingSession: effectiveUpcomingSession
          ? {
              id: effectiveUpcomingSession.id,
              scheduledAt: effectiveUpcomingSession.scheduledAt,
              status: effectiveUpcomingSession.status,
              topic: effectiveUpcomingSession.topic,
            }
          : null,
      })

      console.log('4_CANONICAL_SESSION', {
        canonicalCount: canonicalSessions.upcomingSessions.length,

        canonicalSessions: canonicalSessions.upcomingSessions.map(
          (session) => ({
            id: session.id,
            scheduledAt: session.scheduledAt,
            status: session.status,
            type: session.type,
            isMyBooking: session.isMyBooking,
          })
        ),

        nextSession: nextSession
          ? {
              id: nextSession.id,
              scheduledAt: nextSession.scheduledAt,
              status: nextSession.status,
              type: nextSession.type,
              isMyBooking: nextSession.isMyBooking,
            }
          : null,
      })

      console.log('5_BOOKING_SESSION', {
        bookingNextSession: bookingNextSession
          ? {
              id: bookingNextSession.id,
              scheduledAt: bookingNextSession.scheduledAt,
              status: bookingNextSession.status,
              type: bookingNextSession.type,
              isMyBooking: bookingNextSession.isMyBooking,
            }
          : null,

        isFixture: bookingNextSession?.id === 'preview-next-session',
      })

      console.log('6_REACT_DISABLED_REASONS', {
        ...reactDisabledReasons,

        shouldBeDisabled:
          reactDisabledReasons.activeRequest ||
          reactDisabledReasons.alreadyBooked ||
          reactDisabledReasons.bookingSucceeded,

        activeSessionId,
        bookingSuccessSessionId,
      })

      console.log('7_REAL_DOM_BUTTON', {
        found: Boolean(button),

        disabledProperty: button?.disabled ?? null,

        disabledAttribute: button?.hasAttribute('disabled') ?? null,

        disabledAttributeValue: button?.getAttribute('disabled') ?? null,

        ariaDisabled: button?.getAttribute('aria-disabled') ?? null,

        pointerEvents: computedStyle?.pointerEvents ?? null,

        cursor: computedStyle?.cursor ?? null,

        opacity: computedStyle?.opacity ?? null,

        display: computedStyle?.display ?? null,

        visibility: computedStyle?.visibility ?? null,

        className: button?.className ?? null,
      })

      console.log('8_HIT_TEST', {
        buttonRect: rect
          ? {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            }
          : null,

        elementAtButtonCenter: centerElement
          ? {
              tagName: centerElement.tagName,
              id: centerElement.id,
              className:
                typeof centerElement.className === 'string'
                  ? centerElement.className
                  : null,

              isBookingButton:
                centerElement === button ||
                Boolean(button?.contains(centerElement)),
            }
          : null,
      })

      console.log('9_FINAL_VERDICT', {
        wrongFrontend:
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1',

        fixtureRendered: bookingNextSession?.id === 'preview-next-session',

        reactSaysDisabled:
          reactDisabledReasons.activeRequest ||
          reactDisabledReasons.alreadyBooked ||
          reactDisabledReasons.bookingSucceeded,

        domActuallyDisabled: button?.disabled ?? null,

        overlayIntercepting: Boolean(
          button &&
          centerElement &&
          centerElement !== button &&
          !button.contains(centerElement)
        ),
      })

      console.groupEnd()
    }, 500)

    return () => window.clearTimeout(timer)
  }, [
    isBookingEntry,
    authStatus,
    authRestoreStatus,
    canRunProtectedQueries,
    user,
    accessState,
    zoomAccess,

    usePublicBookingSchedule,

    publicUpcomingSession,
    isPublicUpcomingLoading,
    isPublicUpcomingError,

    upcomingSession,
    effectiveUpcomingSession,

    canonicalSessions,
    nextSession,

    bookingNextSession,

    activeSessionId,
    bookingSuccessSessionId,
  ])

  const handleBookingScreenPrimaryAction = async () => {
    console.log('[ZOOM_BOOKING][CLICK]', {
      sessionId: bookingNextSession?.id ?? null,
      isMyBooking: bookingNextSession?.isMyBooking ?? false,
      activeSessionId,
      bookingSuccessSessionId,
    })

    if (!bookingNextSession) {
      console.warn('[ZOOM_BOOKING][BLOCKED]', {
        reason: 'NO_SESSION',
      })
      return
    }

    if (
      bookingNextSession.isMyBooking ||
      bookingSuccessSessionId === bookingNextSession.id
    ) {
      console.warn('[ZOOM_BOOKING][BLOCKED]', {
        reason: 'ALREADY_BOOKED',
        sessionId: bookingNextSession.id,
      })
      return
    }

    console.log('[ZOOM_BOOKING][OPEN_FORM]', {
      sessionId: bookingNextSession.id,
    })

    openBookingQuestionForm(bookingNextSession.id)
  }

  const renderBookingQuestionPanel = (
    session: ZoomWeekOverview['sessions'][number],
    isDirectTargetSession: boolean
  ) => {
    const isQuestionVisible =
      showQuestionInput && questionSessionId === session.id
    const shouldRenderQuestionPanel =
      isQuestionVisible ||
      (!showQuestionInput && questionSubmittedSessionId === session.id) ||
      (!showQuestionInput && questionSkippedSessionId === session.id)

    if (!shouldRenderQuestionPanel) {
      return null
    }

    return (
      <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-50">
        {isQuestionVisible ? (
          <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-black/10 p-3">
            <p className="font-semibold text-emerald-50">
              З яким питанням ти приходиш?
            </p>
            <textarea
              value={bookingQuestionText}
              onChange={(event) => setBookingQuestionText(event.target.value)}
              placeholder="Напиши питання або ситуацію..."
              rows={3}
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
            />
            {bookingQuestionError ? (
              <p className="mt-2 text-xs text-amber-100">
                {bookingQuestionError}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSubmitBookingQuestion()}
                disabled={
                  isSubmittingBookingQuestion || activeSessionId === session.id
                }
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50 disabled:opacity-60"
              >
                {isSubmittingBookingQuestion || activeSessionId === session.id
                  ? 'Надсилаємо…'
                  : 'Надіслати'}
              </button>
              {!isDirectTargetSession ? (
                <button
                  type="button"
                  onClick={() => void handleSkipBookingQuestion()}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Пропустити
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {!showQuestionInput && questionSubmittedSessionId === session.id ? (
          <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-black/10 p-3 text-emerald-100/90">
            Питання збережено. Повернемось до нього на Zoom.
          </div>
        ) : null}

        {!showQuestionInput && questionSkippedSessionId === session.id ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 p-3">
            <p className="text-emerald-100/90">Можеш додати питання пізніше.</p>
            <button
              type="button"
              onClick={() => {
                setQuestionSessionId(session.id)
                setQuestionSkippedSessionId(null)
                setBookingQuestionError(null)
                setShowQuestionInput(true)
              }}
              className="mt-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Додати питання
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  if (!user && !isBookingEntry) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-4 pb-24 text-white">
        <Card>
          <p className="font-semibold">Готуємо Zoom-календар.</p>
          <p className="mt-1 text-sm text-white/65">
            Відновлюємо доступ без повторного входу.
          </p>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-4 pb-24 text-white">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              Zoom Hub
            </p>
            <h1 className="mt-1 text-xl font-semibold">ФОКУС · Zoom</h1>
            {sessionsCount > 0 ? (
              <p className="mt-1 text-sm text-white/55">
                {formatWeekDate(weekRange.from)} —{' '}
                {formatWeekDate(weekRange.to)} · {weekRange.timezone}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {shouldShowCalendarSkeleton ? <ZoomCalendarSkeleton /> : null}

          {!shouldShowCalendarSkeleton &&
          shouldRenderBookingScreen &&
          bookingPreviousSessionRecap ? (
            <Card>
              <p className="text-sm text-white/65">
                {`Минула зустріч, ${formatWeekDate(bookingPreviousSessionRecap.startsAt)}`}
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {resolvePreviousZoomRecapTitle(bookingPreviousSessionRecap)}
              </p>
              {resolvePreviousZoomRecapPreview(bookingPreviousSessionRecap) ? (
                <p className="mt-4 text-base leading-8 text-white/72">
                  {resolvePreviousZoomRecapPreview(bookingPreviousSessionRecap)}
                </p>
              ) : null}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {resolvePreviousZoomRecapAttendanceLabel(
                  bookingPreviousSessionRecap.attendanceCount ?? 0
                ) ? (
                  <div className="rounded-2xl bg-white/[0.03] p-4">
                    <p className="text-sm text-white/55">Було на сесії</p>
                    <p className="mt-2 text-3xl font-semibold">
                      {bookingPreviousSessionRecap.attendanceCount ?? 0}
                    </p>
                  </div>
                ) : null}
                {resolvePreviousZoomRecapNextStep(
                  bookingPreviousSessionRecap
                ) ? (
                  <div className="rounded-2xl bg-white/[0.03] p-4">
                    <p className="text-sm text-white/55">Наступний крок</p>
                    <p className="mt-2 text-xl font-semibold leading-8 text-white">
                      {resolvePreviousZoomRecapNextStep(
                        bookingPreviousSessionRecap
                      )}
                    </p>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          {!shouldShowCalendarSkeleton &&
          shouldRenderBookingScreen &&
          bookingNextSession ? (
            bookingNextSession.isMyBooking ||
            bookingSuccessSessionId === bookingNextSession.id ? (
              <Card>
                <div className="space-y-5">
                  {user?.firstName ? (
                    <p className="text-xl font-semibold">{user.firstName}</p>
                  ) : null}

                  <div>
                    <p className="text-sm text-white/55">
                      Найближча Zoom-практика
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {resolveBookingSessionDateLabel(
                        bookingNextSession.scheduledAt
                      )}
                    </p>
                  </div>

                  <div className="inline-flex rounded-2xl bg-emerald-400/15 px-4 py-2 text-base font-semibold text-emerald-200">
                    Ти вже записана
                  </div>

                  {bookingNextSession.myQuestion ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                        Твоя точка фокусу
                      </p>
                      <p className="mt-2 text-lg leading-7 text-white">
                        «{bookingNextSession.myQuestion.text}»
                      </p>
                      <p className="mt-2 text-xs text-white/45">
                        Питання №{bookingNextSession.myQuestion.position} у черзі
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="font-semibold">Точка фокусу ще не додана</p>
                      <p className="mt-2 text-sm leading-6 text-white/65">
                        Сформулюй одну конкретну ситуацію або питання, яке хочеш
                        розібрати на Zoom.
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                      Наступний крок
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-white">
                      {bookingNextSession.myQuestion
                        ? 'Підготуй одну конкретну ситуацію, яку хочеш розібрати на Zoom. Посилання на підключення з’явиться тут перед початком практики.'
                        : 'Сформулюй та запиши одну конкретну ситуацію для розбору.'}
                    </p>
                  </div>

                  <div className="text-sm text-white/55">
                    {`Записано учасників: ${bookingNextSession.attendeesCount}`}
                  </div>

                  {bookingQuestionSummary ? (
                    <div className="space-y-3 border-t border-white/10 pt-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                        Про що запитують інші учасники
                      </p>
                      {(showAllBookingQuestions
                        ? bookingQuestionSummary.all
                        : bookingQuestionSummary.primary
                      ).map((questionText) => (
                        <p
                          key={questionText}
                          className="rounded-2xl border-l-2 border-[rgb(var(--accent-rgb))] bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/75"
                        >
                          «{questionText}»
                        </p>
                      ))}
                      {bookingQuestionSummary.remaining > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setShowAllBookingQuestions((current) => !current)
                          }
                          className="text-left text-sm font-medium text-white/65 underline underline-offset-4"
                        >
                          {showAllBookingQuestions
                            ? 'Згорнути'
                            : `Показати ще ${bookingQuestionSummary.remaining}`}
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {renderBookingQuestionPanel(bookingNextSession, false)}
                </div>
              </Card>
            ) : (
              <Card>
                <p className="text-2xl font-semibold">
                  {resolveBookingSessionDateLabel(
                    bookingNextSession.scheduledAt
                  )}
                </p>

                <div className="mt-4 text-sm text-white/55">
                  {`Записано учасників: ${bookingNextSession.attendeesCount}`}
                </div>

                <button
                  ref={bookingButtonRef}
                  data-testid="zoom-booking-primary"
                  type="button"
                  onClick={() => void handleBookingScreenPrimaryAction()}
                  disabled={activeSessionId === bookingNextSession.id}
                  className={`${resolveZoomHubPrimaryActionClassName('book')} mt-5 flex w-full items-center justify-center disabled:cursor-not-allowed`}
                >
                  {activeSessionId === bookingNextSession.id
                    ? 'Записуємо…'
                    : resolveBookingPrimaryActionLabel(bookingNextSession)}
                </button>
              </Card>
            )
          ) : null}

          {!shouldShowCalendarSkeleton &&
          !isBookingEntry &&
          visiblePreviousSessionRecap ? (
            <Card>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                МИНУЛА ЗУСТРІЧ
              </p>
              <p className="mt-2 text-lg font-semibold">
                {resolvePreviousZoomRecapTitle(visiblePreviousSessionRecap)}
              </p>
              <p className="mt-1 text-sm text-white/65">
                {resolvePreviousZoomRecapDateLabel(
                  visiblePreviousSessionRecap.startsAt
                )}
              </p>
              {resolvePreviousZoomRecapPreview(visiblePreviousSessionRecap) ? (
                <p className="mt-3 text-sm leading-6 text-white/70">
                  {resolvePreviousZoomRecapPreview(visiblePreviousSessionRecap)}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {resolvePreviousZoomRecapAttendanceLabel(
                  visiblePreviousSessionRecap.attendanceCount ?? 0
                ) ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/70">
                    {resolvePreviousZoomRecapAttendanceLabel(
                      visiblePreviousSessionRecap.attendanceCount ?? 0
                    )}
                  </span>
                ) : null}
              </div>
              {resolvePreviousZoomRecapNextStep(visiblePreviousSessionRecap) ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                    Наступний крок
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white">
                    {resolvePreviousZoomRecapNextStep(
                      visiblePreviousSessionRecap
                    )}
                  </p>
                </div>
              ) : null}
            </Card>
          ) : null}

          {!shouldShowCalendarSkeleton && !isBookingEntry && nextSession ? (
            <Card>
              <button
                type="button"
                onClick={() => void handleNextZoomAction()}
                disabled={primaryAction.action === 'none'}
                className={`${resolveZoomHubPrimaryActionClassName(primaryAction.action)} flex w-full items-center justify-center`}
              >
                {primaryAction.label}
              </button>
            </Card>
          ) : null}

          {!shouldShowCalendarSkeleton && !isBookingEntry && nextSession ? (
            <Card>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                Наступна Zoom-практика
              </p>
              <p className="mt-2 text-lg font-semibold">
                {resolveZoomSessionTitle(nextSession.topic)}
              </p>
              <p className="mt-1 text-sm text-white/65">
                {resolveNearestSessionDateLabel(nextSession.scheduledAt)} ·{' '}
                {getSessionMeta(nextSession)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/70">
                  {nextSession.attendeesCount}{' '}
                  {pluralizeParticipants(nextSession.attendeesCount)}
                </span>
                {nextSession.isMyBooking ? (
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                    Записано
                  </span>
                ) : null}
              </div>
              {resolveNextSessionQuestionSummary(nextSession) ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                    Питання учасників
                  </p>
                  {resolveNextSessionQuestionSummary(nextSession)?.primary.map(
                    (questionText) => (
                      <p
                        key={questionText}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm leading-6 text-white/78"
                      >
                        {questionText}
                      </p>
                    )
                  )}
                  {resolveNextSessionQuestionSummary(nextSession)?.remaining ? (
                    <p className="text-sm text-white/55">
                      і ще{' '}
                      {
                        resolveNextSessionQuestionSummary(nextSession)
                          ?.remaining
                      }{' '}
                      питань від учасників
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/55">
                  Учасники ще не залишили питання до цієї практики.
                </p>
              )}
            </Card>
          ) : null}

          {!shouldShowCalendarSkeleton &&
          directBookingState !== 'locked' &&
          (isBookingEntry ? isScheduleError : isAccessError || isScheduleError) ? (
            <Card>
              <p className="font-semibold">Не вдалося завантажити календар.</p>
              <button
                type="button"
                onClick={() => void handleRefreshAccess()}
                className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Спробувати ще раз
              </button>
            </Card>
          ) : null}

          {!isBookingEntry && shouldRenderPaymentGate(accessState) ? (
            <Card>
              <p className="font-semibold">
                Доступ до Zoom ще не підтверджено.
              </p>
              <p className="mt-1 text-sm text-white/65">
                Уже оплатила — спочатку онови статус. Не оплатила — відкрий
                оплату.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleRefreshAccess()}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold"
                >
                  ОНОВИТИ ДОСТУП
                </button>
                <button
                  type="button"
                  onClick={() => void openPayment()}
                  disabled={isOpeningPayment}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-300"
                >
                  {isOpeningPayment ? 'ВІДКРИВАЄМО…' : 'ОПЛАТИТИ ФОКУС'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => void handleReportPaymentIssue()}
                disabled={isReportingPaymentIssue}
                className="mt-2 w-full rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100"
              >
                {isReportingPaymentIssue
                  ? 'ФІКСУЄМО ПРОБЛЕМУ…'
                  : 'ПРОБЛЕМИ З ОПЛАТОЮ'}
              </button>
            </Card>
          ) : null}

          {!shouldShowCalendarSkeleton &&
          (!isBookingEntry || !shouldRenderBookingScreen) &&
          emptyState ? (
            <Card>
              <p className="font-semibold">{emptyState.title}</p>
              <p className="mt-1 text-sm text-white/65">
                {emptyState.description}
              </p>
              <p className="mt-3 text-sm text-emerald-100/90">
                {emptyState.accessNote}
              </p>
            </Card>
          ) : null}

          {!shouldShowCalendarSkeleton &&
          !isBookingEntry &&
          (hasZoomHubAccess || shouldShowDirectSessionOnly)
            ? visibleSessions.map((session) => {
                const isDirectTargetSession =
                  isDirectBooking && directSessionId === session.id
                const isQuestionVisible =
                  showQuestionInput && questionSessionId === session.id

                return (
                  <Card key={session.id}>
                    <div
                      className="flex items-start justify-between gap-3"
                      data-session-card={session.id}
                    >
                      <div>
                        {isDirectTargetSession ? (
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                            Обрана Zoom-сесія
                          </p>
                        ) : null}
                        <p className="font-semibold">
                          {resolveZoomSessionTitle(session.topic)}
                        </p>
                        <p className="mt-1 text-xs text-white/55">
                          {getSessionDateLabel(session.scheduledAt)} ·{' '}
                          {getSessionMeta(session)}
                        </p>
                      </div>
                      {session.isMyBooking ? (
                        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                          Записано
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {!session.isMyBooking && !isDirectTargetSession ? (
                        <button
                          type="button"
                          onClick={() => void register(session.id)}
                          disabled={activeSessionId === session.id}
                          className={MINIAPP_ACCENT_BUTTON_CLASSNAME}
                        >
                          {activeSessionId === session.id
                            ? 'Відкриваємо…'
                            : 'Записатись'}
                        </button>
                      ) : null}
                      {session.zoomLink ? (
                        <a
                          href={session.zoomLink}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold"
                        >
                          Відкрити Zoom
                        </a>
                      ) : (
                        <span className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/50">
                          Посилання з’явиться перед практикою
                        </span>
                      )}
                    </div>

                    {renderBookingQuestionPanel(session, isDirectTargetSession)}
                  </Card>
                )
              })
            : null}

          {message ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/80">
              {message}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
