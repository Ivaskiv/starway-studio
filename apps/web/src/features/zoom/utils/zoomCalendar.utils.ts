import type {
  ZoomPreviousSessionRecap,
  ZoomSessionDTO,
  ZoomSessionWithAttendance,
  ZoomWeekOverview,
} from '../types/zoom.types'
import type { ZoomCalendarSession } from '../zoom.types'
import { getNormalizedSessionType } from '../zoom.utils'
import {
  DEFAULT_ZOOM_SESSION_DURATION_MINUTES,
  KYIV_TIMEZONE,
} from './zoomDateTime.utils'

export function resolveZoomCalendarEntryMode(search: string) {
  const intent = new URLSearchParams(search).get('intent')?.trim()

  return intent === 'booking' ? 'booking' : 'default'
}

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

export function resolveBookingPrimaryActionLabel(
  session: ZoomWeekOverview['sessions'][number]
) {
  void session
  return 'ЗАПИСАТИСЬ'
}

export function resolveBookingSessionDateLabel(
  scheduledAt: string
) {
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

// ACCESS + DIRECT BOOKING PURE LOGIC

export type ZoomAccessSnapshot =
  | {
      state: 'NO_ACCESS' | 'FOCUS_ACTIVE' | 'FREE_WEEK1' | 'PREMIUM'
      isActive: boolean
      hasFocus: boolean
    }
  | undefined

export type DirectZoomBookingParams = {
  action: string | null
  sessionId: string | null
}

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
  authRestoreStatus: string
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

// SESSION DOMAIN PURE LOGIC

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

function getSessionDurationMinutes(session: { durationMinutes?: unknown }) {
  return typeof session.durationMinutes === 'number' &&
    session.durationMinutes > 0
    ? session.durationMinutes
    : DEFAULT_ZOOM_SESSION_DURATION_MINUTES
}

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

export function isSessionStillRelevant(
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

export function normalizeZoomHubSession(
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
    attendeesCount:
      'attendeesCount' in session ? (session.attendeesCount ?? 0) : 0,
    questionPreviews:
      'questionPreviews' in session ? (session.questionPreviews ?? []) : [],
    questionsCount:
      'questionsCount' in session ? (session.questionsCount ?? 0) : 0,
    remainingQuestionsCount:
      'remainingQuestionsCount' in session
        ? (session.remainingQuestionsCount ?? 0)
        : 0,
    isMyBooking:
      'isMyBooking' in session ? (session.isMyBooking ?? false) : false,
    myQuestion:
      'myQuestion' in session ? (session.myQuestion ?? null) : null,
    audioFileId: null,
    hasAudio: false,
    zoomLink: '',
    ...patch,
  }
}

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

function mergeBookedState(
  session: ZoomWeekOverview['sessions'][number],
  bookedSessionIds: Set<string>
) {
  return {
    ...session,
    isMyBooking: session.isMyBooking || bookedSessionIds.has(session.id),
  }
}

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
    const authenticatedUpcoming = normalizeZoomHubSession(
      input.upcomingSession,
      {
        isMyBooking: bookedSessionIds.has(input.upcomingSession.id),
      }
    )

    mergedSessions.set(
      input.upcomingSession.id,
      existingSession
        ? {
            ...existingSession,
            ...authenticatedUpcoming,
            isMyBooking:
              authenticatedUpcoming.isMyBooking ||
              existingSession.isMyBooking ||
              bookedSessionIds.has(input.upcomingSession.id),
          }
        : authenticatedUpcoming
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

export function isGroupPracticeBookingSession(
  session: ZoomWeekOverview['sessions'][number]
) {
  const normalizedType = getNormalizedSessionType(session)
  return normalizedType === 'group_practice' || normalizedType === 'group'
}

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

// PRESENTATION + HUB PURE LOGIC

export function formatWeekDate(value: string): string {
  return new Date(value).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    timeZone: KYIV_TIMEZONE,
  })
}

const FALLBACK_ZOOM_SESSION_TITLE = 'Групова Zoom-практика'

export type ZoomHubPrimaryAction = 'open_access' | 'book' | 'join' | 'browse' | 'none'

export type ZoomHubPrimaryActionState = {
  action: ZoomHubPrimaryAction
  label: string
  description: string
}

export type ZoomHubEmptyState = {
  title: string
  description: string
  accessNote: string
}

export function shouldRenderPaymentGate(
  accessState: 'loading' | 'active' | 'inactive'
) {
  return accessState === 'inactive'
}

export function resolveZoomSessionTitle(topic: string | null | undefined) {
  const normalizedTopic = String(topic ?? '').trim()

  if (!normalizedTopic) {
    return FALLBACK_ZOOM_SESSION_TITLE
  }

  return normalizedTopic
}

const PREVIOUS_ZOOM_MATERIALS_PENDING_COPY =
  'Матеріали цієї практики ще готуються.'

export function resolvePreviousZoomRecapTitle(recap: ZoomPreviousSessionRecap) {
  const explicitTitle = recap.title?.trim()
  if (explicitTitle) {
    return explicitTitle
  }

  return `Zoom-практика за ${formatWeekDate(recap.startsAt)}`
}

export function resolvePreviousZoomRecapDateLabel(startsAt: string) {
  const date = new Date(startsAt)
  const timeLabel = date.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KYIV_TIMEZONE,
  })

  return `${formatWeekDate(startsAt)} · ${timeLabel}`
}

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

export function resolvePreviousZoomRecapAttendanceLabel(
  attendanceCount: number
) {
  if (!Number.isFinite(attendanceCount) || attendanceCount <= 0) {
    return null
  }

  return `${attendanceCount} ${pluralizeParticipants(attendanceCount)}`
}

export function resolvePreviousZoomRecapNextStep(
  recap: ZoomPreviousSessionRecap
) {
  const nextStep = recap.nextStep?.trim()
  return nextStep || null
}

export function pluralizeParticipants(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'учасник'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return 'учасники'
  return 'учасників'
}

export function formatUppercaseWeekday(scheduledAt: string) {
  return new Date(scheduledAt)
    .toLocaleDateString('uk-UA', {
      weekday: 'long',
      timeZone: KYIV_TIMEZONE,
    })
    .toUpperCase()
}

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
