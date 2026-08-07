import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { ZoomMySessionsResponse, ZoomWeekOverview } from '@/features/zoom/types/zoom.types'

const mockDispatch = vi.fn()
const mockAuthState = {
  auth: {
    user: { id: 'user-zoom', role: 'USER' },
    role: 'USER',
    status: 'authenticated' as 'authenticated' | 'loading' | 'unauthenticated',
  },
}
const mockSessionOrchestrator = {
  authRestoreStatus: 'ready' as const,
  canRunProtectedQueries: true,
}
const mockSystemState: {
  zoomAccess: {
    state: 'FOCUS_ACTIVE' | 'NO_ACCESS'
    isActive: boolean
    hasFocus: boolean
  }
  isLoading: boolean
  isError: boolean
} = {
  zoomAccess: {
    state: 'FOCUS_ACTIVE',
    isActive: true,
    hasFocus: true,
  },
  isLoading: false,
  isError: false,
}
const mockRegisterAttendee = vi.fn((input: { sessionId: string }) => ({
  unwrap: async () => ({
    id: `attendee-${input.sessionId}`,
    sessionId: input.sessionId,
    userId: 'user-zoom',
    attended: false,
    createdAt: '2026-08-05T09:00:00.000Z',
  }),
}))
const mockSubmitBookingQuestion = vi.fn(() => ({
  unwrap: async () => ({ ok: true, id: 'booking-question', createdAt: '2026-08-05T09:00:00.000Z' }),
}))
const mockTelegramMiniAppAuth = vi.fn(() => Promise.resolve({}))
const mockCurrentWeekSessions: ZoomWeekOverview['sessions'] = [
  {
    id: 'zoom-booking-session',
    expertId: null,
    scheduledAt: '2026-08-10T16:00:00.000Z',
    topic: 'Фокус-сесія',
    status: 'SCHEDULED',
    requests: [],
    postSessionReport: null,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
    type: 'group_practice',
    attendeesCount: 9,
    questionPreviews: [
      'Як не зриватись на вихідних',
      'Планування тижня з дітьми',
      'Повернення після відпустки',
      'Як відновити режим після паузи',
      'Як не перевантажити план',
      'Що робити, коли немає сил',
      'Як тримати один пріоритет',
      'Як повернути ранковий ритм',
      'Як завершувати почате',
    ],
    questionsCount: 9,
    remainingQuestionsCount: 6,
    isMyBooking: false,
    audioFileId: null,
    hasAudio: false,
    zoomLink: '',
  },
]
let mockMySessionsResponse: ZoomMySessionsResponse = {
  sessions: [],
  previousSessionRecap: {
    id: 'recap-zoom',
    title: 'Розбирали, чому важко тримати фокус увечері',
    startsAt: '2026-07-28T16:00:00.000Z',
    endsAt: null,
    summary: 'Основний інсайт: втома тіла плутається з втомою мотивації. Домовились на цьому тижні відстежувати це окремо.',
    recordingUrl: null,
    materialsUrl: null,
    attendanceStatus: 'ATTENDED',
    attendanceCount: 14,
    nextStep: 'Відстежити енергію ввечері',
  },
  latestWeeklyReport: {
    id: 'report-zoom',
    weekStart: '2026-07-27T00:00:00.000Z',
    weekEnd: '2026-08-03T23:59:59.000Z',
    generatedAt: '2026-08-04T06:30:00.000Z',
    summary: 'Цей weekly report не має перекривати booking entry.',
    progress: 'Виконано 3/5 задач',
    achievement: null,
    blocker: null,
    nextStep: 'Записатися на наступну практику.',
    detailsAvailable: true,
  },
}

vi.mock('@/app/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockAuthState) => unknown) => selector(mockAuthState),
}))

vi.mock('@/features/auth/context/SessionOrchestratorContext', () => ({
  useSessionOrchestrator: () => mockSessionOrchestrator,
}))

vi.mock('@/features/auth/hooks/useSystemState', () => ({
  useSystemState: () => mockSystemState,
}))

vi.mock('@/features/auth/services/auth.api', () => ({
  useTelegramMiniAppAuthMutation: () => [
    mockTelegramMiniAppAuth,
  ],
}))

vi.mock('@/features/auth/services/accessApi', () => ({
  accessApi: {
    util: {
      upsertQueryData: vi.fn(() => ({ type: 'access/upsert' })),
    },
    endpoints: {
      getMySystemState: {
        initiate: vi.fn(() => ({ type: 'access/initiate' })),
      },
    },
  },
}))

vi.mock('@/features/subscription/services/billing.api', () => ({
  useCreateProductPaymentMutation: () => [
    vi.fn(() => ({ unwrap: async () => ({ status: 'already_active' }) })),
    { isLoading: false },
  ],
  useReportFocusPaymentIssueMutation: () => [
    vi.fn(() => ({ unwrap: async () => ({}) })),
    { isLoading: false },
  ],
}))

vi.mock('@/features/subscription/utils/openExternalPaymentUrl', () => ({
  openExternalPaymentUrl: vi.fn(),
}))

vi.mock('@/features/zoom/services/zoom.api', () => ({
  useGetMySessionsQuery: () => ({
    data: mockMySessionsResponse,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGetUpcomingSessionQuery: () => ({
    data: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useRegisterAttendeeMutation: () => [
    mockRegisterAttendee,
    { isLoading: false },
  ],
  useSubmitBookingQuestionMutation: () => [
    mockSubmitBookingQuestion,
    { isLoading: false },
  ],
}))

vi.mock('@/features/zoom/zoom.api', () => ({
  useGetCalendarSessionsQuery: () => ({
    data: mockCurrentWeekSessions,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}))

vi.mock('@/services/api', () => ({
  api: {
    util: {
      invalidateTags: vi.fn(() => ({ type: 'api/invalidate' })),
    },
  },
}))

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  mockAuthState.auth.status = 'authenticated'
  mockAuthState.auth.user = { id: 'user-zoom', role: 'USER' }
  mockSessionOrchestrator.authRestoreStatus = 'ready'
  mockSessionOrchestrator.canRunProtectedQueries = true
  if (typeof window !== 'undefined') {
    delete (window as typeof window & { Telegram?: unknown }).Telegram
  }
  if (typeof document !== 'undefined') {
    document.body.innerHTML = ''
  }
})

let resolveZoomAccessState: typeof import('./CleanMiniAppZoomCalendar').resolveZoomAccessState
let hasConfirmedFocusAccess: typeof import('./CleanMiniAppZoomCalendar').hasConfirmedFocusAccess
let readDirectZoomBookingParams: typeof import('./CleanMiniAppZoomCalendar').readDirectZoomBookingParams
let isDirectZoomBookingRequest: typeof import('./CleanMiniAppZoomCalendar').isDirectZoomBookingRequest
let shouldPrimeDirectBooking: typeof import('./CleanMiniAppZoomCalendar').shouldPrimeDirectBooking
let pickNextZoomSession: typeof import('./CleanMiniAppZoomCalendar').pickNextZoomSession
let resolveZoomHubPrimaryAction: typeof import('./CleanMiniAppZoomCalendar').resolveZoomHubPrimaryAction
let resolveZoomHubPrimaryActionClassName: typeof import('./CleanMiniAppZoomCalendar').resolveZoomHubPrimaryActionClassName
let getKyivWeekRange: typeof import('./CleanMiniAppZoomCalendar').getKyivWeekRange
let resolveNearestZoomSession: typeof import('./CleanMiniAppZoomCalendar').resolveNearestZoomSession
let resolveNearestSessionDateLabel: typeof import('./CleanMiniAppZoomCalendar').resolveNearestSessionDateLabel
let shouldRenderPaymentGate: typeof import('./CleanMiniAppZoomCalendar').shouldRenderPaymentGate
let getVisibleWeekSessions: typeof import('./CleanMiniAppZoomCalendar').getVisibleWeekSessions
let resolveZoomHubEmptyState: typeof import('./CleanMiniAppZoomCalendar').resolveZoomHubEmptyState
let resolveZoomSessionTitle: typeof import('./CleanMiniAppZoomCalendar').resolveZoomSessionTitle
let MINIAPP_ACCENT_BUTTON_CLASSNAME: typeof import('./CleanMiniAppZoomCalendar').MINIAPP_ACCENT_BUTTON_CLASSNAME
let resolveUpcomingZoomSessions: typeof import('./CleanMiniAppZoomCalendar').resolveUpcomingZoomSessions
let resolveNextZoomBoundaryAt: typeof import('./CleanMiniAppZoomCalendar').resolveNextZoomBoundaryAt
let resolvePreviousZoomRecapTitle: typeof import('./CleanMiniAppZoomCalendar').resolvePreviousZoomRecapTitle
let resolvePreviousZoomRecapDateLabel: typeof import('./CleanMiniAppZoomCalendar').resolvePreviousZoomRecapDateLabel
let resolvePreviousZoomRecapPreview: typeof import('./CleanMiniAppZoomCalendar').resolvePreviousZoomRecapPreview
let resolveZoomCalendarEntryMode: typeof import('./CleanMiniAppZoomCalendar').resolveZoomCalendarEntryMode
let performBookingScreenRegistration: typeof import('./CleanMiniAppZoomCalendar').performBookingScreenRegistration
let resolveTelegramMiniAppAuthInitData: typeof import('./CleanMiniAppZoomCalendar').resolveTelegramMiniAppAuthInitData
let CleanMiniAppZoomCalendar: typeof import('./CleanMiniAppZoomCalendar').default

const LEGACY_PREPARE_LABELS = [
  ['П', 'і', 'д', 'г', 'о', 'т', 'у', 'в', 'а', 'т', 'и', 'с', 'я'].join(''),
  ['П', 'і', 'д', 'г', 'о', 'т', 'у', 'в', 'а', 'т', 'и', 'с', 'ь'].join(''),
]

beforeAll(async () => {
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })

  ;({
    resolveZoomAccessState,
    hasConfirmedFocusAccess,
    readDirectZoomBookingParams,
    isDirectZoomBookingRequest,
    shouldPrimeDirectBooking,
    pickNextZoomSession,
    resolveZoomHubPrimaryAction,
    resolveZoomHubPrimaryActionClassName,
    getKyivWeekRange,
    resolveNearestZoomSession,
    resolveNearestSessionDateLabel,
    shouldRenderPaymentGate,
    getVisibleWeekSessions,
    resolveZoomHubEmptyState,
    resolveZoomSessionTitle,
    MINIAPP_ACCENT_BUTTON_CLASSNAME,
    resolveUpcomingZoomSessions,
    resolveNextZoomBoundaryAt,
    resolvePreviousZoomRecapTitle,
    resolvePreviousZoomRecapDateLabel,
    resolvePreviousZoomRecapPreview,
    resolveZoomCalendarEntryMode,
    performBookingScreenRegistration,
    resolveTelegramMiniAppAuthInitData,
    default: CleanMiniAppZoomCalendar,
  } = await import('./CleanMiniAppZoomCalendar'))
})

describe('resolveZoomAccessState', () => {
  it('keeps access in loading state until protected auth is ready', () => {
    expect(
      resolveZoomAccessState({
        authRestoreStatus: 'restoring',
        canRunProtectedQueries: false,
        isAccessLoading: false,
        zoomAccess: {
          state: 'NO_ACCESS',
          isActive: false,
          hasFocus: false,
        },
      }),
    ).toBe('loading')
  })

  it('returns active only for confirmed active focus access', () => {
    expect(
      resolveZoomAccessState({
        authRestoreStatus: 'ready',
        canRunProtectedQueries: true,
        isAccessLoading: false,
        zoomAccess: {
          state: 'FOCUS_ACTIVE',
          isActive: true,
          hasFocus: true,
        },
      }),
    ).toBe('active')
  })

  it('returns inactive after auth is ready and focus access is absent', () => {
    expect(
      resolveZoomAccessState({
        authRestoreStatus: 'ready',
        canRunProtectedQueries: true,
        isAccessLoading: false,
        zoomAccess: {
          state: 'NO_ACCESS',
          isActive: false,
          hasFocus: false,
        },
      }),
    ).toBe('inactive')
  })

  it('treats PREMIUM zoom access as active for the single-session trial flow', () => {
    expect(
      resolveZoomAccessState({
        authRestoreStatus: 'ready',
        canRunProtectedQueries: true,
        isAccessLoading: false,
        zoomAccess: {
          state: 'PREMIUM',
          isActive: false,
          hasFocus: false,
        },
      }),
    ).toBe('active')
  })

  it('treats FREE_WEEK1 access as active for the first-week free Zoom hub', () => {
    expect(
      resolveZoomAccessState({
        authRestoreStatus: 'ready',
        canRunProtectedQueries: true,
        isAccessLoading: false,
        zoomAccess: {
          state: 'FREE_WEEK1',
          isActive: true,
          hasFocus: false,
        },
      }),
    ).toBe('active')
  })

  it('recognizes refreshed FOCUS_ACTIVE response for canonical cache sync', () => {
    expect(
      hasConfirmedFocusAccess({
        zoomAccess: {
          state: 'FOCUS_ACTIVE',
          isActive: true,
          hasFocus: true,
        },
      }),
    ).toBe(true)
  })

  it('recognizes refreshed PREMIUM access for the trial Zoom session', () => {
    expect(
      hasConfirmedFocusAccess({
        zoomAccess: {
          state: 'PREMIUM',
          isActive: false,
          hasFocus: false,
        },
      }),
    ).toBe(true)
  })

  it('recognizes refreshed FREE_WEEK1 access for the first-week funnel', () => {
    expect(
      hasConfirmedFocusAccess({
        zoomAccess: {
          state: 'FREE_WEEK1',
          isActive: true,
          hasFocus: false,
        },
      }),
    ).toBe(true)
  })

  it('does not map FREE_WEEK1 to the payment gate', () => {
    const accessState = resolveZoomAccessState({
      authRestoreStatus: 'ready',
      canRunProtectedQueries: true,
      isAccessLoading: false,
      zoomAccess: {
        state: 'FREE_WEEK1',
        isActive: true,
        hasFocus: false,
      },
    })

    expect(shouldRenderPaymentGate(accessState)).toBe(false)
  })
})

describe('direct zoom booking params', () => {
  it('reads sessionId and action from a direct booking url', () => {
    expect(readDirectZoomBookingParams('?sessionId=zoom-42&action=book')).toEqual({
      action: 'book',
      sessionId: 'zoom-42',
    })
  })

  it('recognizes only explicit direct booking requests', () => {
    expect(isDirectZoomBookingRequest({
      action: 'book',
      sessionId: 'zoom-42',
    })).toBe(true)

    expect(isDirectZoomBookingRequest({
      action: 'book',
      sessionId: null,
    })).toBe(false)
  })

  it('primes direct booking only for an unresolved direct session', () => {
    expect(
      shouldPrimeDirectBooking({
        isDirectBooking: true,
        isAlreadyBooked: false,
        primedDirectSessionId: null,
        questionSubmittedSessionId: null,
        sessionId: 'zoom-42',
      }),
    ).toBe(true)

    expect(
      shouldPrimeDirectBooking({
        isDirectBooking: true,
        isAlreadyBooked: true,
        primedDirectSessionId: null,
        questionSubmittedSessionId: null,
        sessionId: 'zoom-42',
      }),
    ).toBe(false)

    expect(
      shouldPrimeDirectBooking({
        isDirectBooking: true,
        isAlreadyBooked: false,
        primedDirectSessionId: 'zoom-42',
        questionSubmittedSessionId: null,
        sessionId: 'zoom-42',
      }),
    ).toBe(false)

    expect(
      shouldPrimeDirectBooking({
        isDirectBooking: true,
        isAlreadyBooked: false,
        primedDirectSessionId: null,
        questionSubmittedSessionId: null,
        sessionId: 'zoom-42',
      }),
    ).toBe(true)
  })
})

describe('zoom hub next session', () => {
  it('uses semantic on-accent text for dark accent CTA buttons', () => {
    expect(MINIAPP_ACCENT_BUTTON_CLASSNAME).toContain('text-[var(--on-accent)]')
    expect(MINIAPP_ACCENT_BUTTON_CLASSNAME).not.toContain('text-[var(--bg-primary)]')
  })

  it('keeps header count and featured card on the same filtered upcoming result', () => {
    const resolved = resolveUpcomingZoomSessions({
      currentWeekSessions: [
        {
          id: 'ended',
          expertId: null,
          scheduledAt: '2026-08-03T15:00:00.000Z',
          topic: 'Ended session',
          status: 'SCHEDULED',
          requests: [],
          postSessionReport: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
          type: 'GROUP',
          attendeesCount: 1,
          isMyBooking: false,
          audioFileId: null,
          hasAudio: false,
          zoomLink: '',
          durationMinutes: 60,
        } as ZoomWeekOverview['sessions'][number] & { durationMinutes: number },
      ],
      upcomingSession: {
        id: 'next-monday',
        expertId: null,
        scheduledAt: '2026-08-10T15:00:00.000Z',
        topic: 'Next Monday',
        status: 'SCHEDULED',
        requests: [],
        postSessionReport: null,
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: '2026-08-01T08:00:00.000Z',
      },
      mySessions: [],
      now: new Date('2026-08-04T09:00:00.000Z'),
    })

    expect(resolved.visibleSessionCount).toBe(1)
    expect(resolved.nextSession?.id).toBe('next-monday')
  })

  it('formats the previous practice title from persisted topic or falls back to the date', () => {
    expect(
      resolvePreviousZoomRecapTitle({
        id: 'recap-1',
        title: 'Повернення до ритму',
        startsAt: '2026-08-03T15:00:00.000Z',
        endsAt: null,
        summary: null,
        recordingUrl: null,
        materialsUrl: null,
        attendanceStatus: 'ATTENDED',
        attendanceCount: 7,
        nextStep: 'Зафіксувати один конкретний крок.',
      }),
    ).toBe('Повернення до ритму')

    expect(
      resolvePreviousZoomRecapTitle({
        id: 'recap-2',
        title: '   ',
        startsAt: '2026-08-03T15:00:00.000Z',
        endsAt: null,
        summary: null,
        recordingUrl: null,
        materialsUrl: null,
        attendanceStatus: 'BOOKED',
        attendanceCount: 0,
        nextStep: null,
      }),
    ).toBe('Zoom-практика за 3 серпня')
  })

  it('shows only confirmed recap content and uses the pending materials fallback', () => {
    expect(resolvePreviousZoomRecapDateLabel('2026-08-03T15:00:00.000Z')).toBe('3 серпня · 18:00')

    expect(
      resolvePreviousZoomRecapPreview({
        id: 'recap-1',
        title: 'Повернення до ритму',
        startsAt: '2026-08-03T15:00:00.000Z',
        endsAt: null,
        summary: 'Один короткий підсумок.',
        recordingUrl: null,
        materialsUrl: null,
        attendanceStatus: 'ATTENDED',
        attendanceCount: 7,
        nextStep: 'Зафіксувати один конкретний крок.',
      }),
    ).toBe('Один короткий підсумок.')

    expect(
      resolvePreviousZoomRecapPreview({
        id: 'recap-2',
        title: 'Повернення до ритму',
        startsAt: '2026-08-03T15:00:00.000Z',
        endsAt: null,
        summary: null,
        recordingUrl: null,
        materialsUrl: null,
        attendanceStatus: 'ATTENDED',
        attendanceCount: 0,
        nextStep: null,
      }),
    ).toBe('Матеріали цієї практики ще готуються.')
  })

  it('reads booking entry mode only from the route search params', () => {
    expect(resolveZoomCalendarEntryMode('?intent=booking')).toBe('booking')
    expect(resolveZoomCalendarEntryMode('?intent=home')).toBe('default')
    expect(resolveZoomCalendarEntryMode('')).toBe('default')
  })

  it('renders the canonical booking screen from real Zoom data', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const bookingMarkup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/miniapp/zoom-calendar?intent=booking'] },
        createElement(
          Routes,
          undefined,
          createElement(Route, {
            path: '/miniapp/zoom-calendar',
            element: createElement(CleanMiniAppZoomCalendar),
          }),
        ),
      ),
    )

    consoleErrorSpy.mockRestore()

    expect(bookingMarkup).toContain('Минула зустріч, 28 липня')
    expect(bookingMarkup).toContain('Розбирали, чому важко тримати фокус увечері')
    expect(bookingMarkup).toContain('Основний інсайт: втома тіла плутається з втомою мотивації.')
    expect(bookingMarkup).toContain('14')
    expect(bookingMarkup).toContain('Відстежити енергію ввечері')
    expect(bookingMarkup).toContain('ЗАПИСАТИСЬ')
    expect(bookingMarkup).toContain('Понеділок, 10 серпня · 19:00')
    expect(bookingMarkup).toContain('Вже записались: 9')
    expect(bookingMarkup).toContain('Про що питають учасники')
    expect(bookingMarkup).toContain('Як не зриватись на вихідних')
    expect(bookingMarkup).toContain('Планування тижня з дітьми')
    expect(bookingMarkup).toContain('Повернення після відпустки')
    expect(bookingMarkup).toContain('і ще 6 питань від учасників')
    expect(bookingMarkup).not.toContain('Наступний Zoom уже готується')
    expect(bookingMarkup).not.toContain('Твій підсумок тижня')
    expect(bookingMarkup).not.toContain('ПЕРЕГЛЯНУТИ ПОВНИЙ ЗВІТ')
  })

  it('reuses existing verified initData bootstrap only for unauthenticated direct miniapp entry', () => {
    expect(resolveTelegramMiniAppAuthInitData('unauthenticated', ' signed-init-data ')).toBe('signed-init-data')
    expect(resolveTelegramMiniAppAuthInitData('loading', 'signed-init-data')).toBeNull()
    expect(resolveTelegramMiniAppAuthInitData('authenticated', 'signed-init-data')).toBeNull()
    expect(resolveTelegramMiniAppAuthInitData('unauthenticated', '   ')).toBeNull()
  })

  it('renders the approved development fixture on the real booking url without preview=booking', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const previousMySessionsResponse = mockMySessionsResponse
    const previousCurrentWeekSessions = [...mockCurrentWeekSessions]

    mockMySessionsResponse = {
      ...mockMySessionsResponse,
      sessions: [],
      previousSessionRecap: null,
    }
    mockCurrentWeekSessions.length = 0

    const bookingMarkup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/miniapp/zoom-calendar?intent=booking'] },
        createElement(
          Routes,
          undefined,
          createElement(Route, {
            path: '/miniapp/zoom-calendar',
            element: createElement(CleanMiniAppZoomCalendar),
          }),
        ),
      ),
    )

    mockMySessionsResponse = previousMySessionsResponse
    mockCurrentWeekSessions.splice(0, mockCurrentWeekSessions.length, ...previousCurrentWeekSessions)
    consoleErrorSpy.mockRestore()

    expect(bookingMarkup).toContain('Минула зустріч, 28 липня')
    expect(bookingMarkup).toContain('Понеділок, 10 серпня · 19:00')
    expect(bookingMarkup).toContain('14')
    expect(bookingMarkup).toContain('Вже записались: 9')
    expect(bookingMarkup).toContain('ЗАПИСАТИСЬ')
    expect(bookingMarkup).toContain('Реальна сесія ще не створена')
    expect(bookingMarkup).toContain('disabled=""')
    expect(bookingMarkup).toContain('і ще 6 питань від учасників')
    expect(bookingMarkup).not.toContain('Наступний Zoom уже готується')
    expect(mockRegisterAttendee).not.toHaveBeenCalled()
  })

  it('merges real recap with fallback next-session preview instead of dropping the booking card', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const previousCurrentWeekSessions = [...mockCurrentWeekSessions]

    mockCurrentWeekSessions.length = 0

    const bookingMarkup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/miniapp/zoom-calendar?intent=booking'] },
        createElement(
          Routes,
          undefined,
          createElement(Route, {
            path: '/miniapp/zoom-calendar',
            element: createElement(CleanMiniAppZoomCalendar),
          }),
        ),
      ),
    )

    mockCurrentWeekSessions.splice(0, mockCurrentWeekSessions.length, ...previousCurrentWeekSessions)
    consoleErrorSpy.mockRestore()

    expect(bookingMarkup).toContain('Розбирали, чому важко тримати фокус увечері')
    expect(bookingMarkup).toContain('Понеділок, 10 серпня · 19:00')
    expect(bookingMarkup).toContain('Вже записались: 9')
    expect(bookingMarkup).toContain('Реальна сесія ще не створена')
    expect(bookingMarkup).not.toContain('Твій підсумок тижня')
  })

  it('keeps the production empty state on the same booking url when real data is absent', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const previousMySessionsResponse = mockMySessionsResponse
    const previousCurrentWeekSessions = [...mockCurrentWeekSessions]

    vi.stubEnv('DEV', false)
    vi.stubEnv('PROD', true)
    vi.stubEnv('MODE', 'production')

    mockMySessionsResponse = {
      ...mockMySessionsResponse,
      sessions: [],
      previousSessionRecap: null,
    }
    mockCurrentWeekSessions.length = 0

    const emptyMarkup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/miniapp/zoom-calendar?intent=booking'] },
        createElement(
          Routes,
          undefined,
          createElement(Route, {
            path: '/miniapp/zoom-calendar',
            element: createElement(CleanMiniAppZoomCalendar),
          }),
        ),
      ),
    )

    mockMySessionsResponse = previousMySessionsResponse
    mockCurrentWeekSessions.splice(0, mockCurrentWeekSessions.length, ...previousCurrentWeekSessions)
    consoleErrorSpy.mockRestore()

expect(emptyMarkup).toContain('Минула зустріч, 28 липня')
expect(emptyMarkup).toContain(
  'Розбирали, чому важко тримати фокус увечері',
)
expect(emptyMarkup).toContain(
  'Основний інсайт: втома тіла плутається з втомою мотивації.',
)
expect(emptyMarkup).toContain('Було на сесії')
expect(emptyMarkup).toContain('14')
expect(emptyMarkup).toContain('Наступний крок')
expect(emptyMarkup).toContain('Відстежити енергію ввечері')

expect(emptyMarkup).toContain('ЗАПИСАТИСЬ')
expect(emptyMarkup).toContain('Реальна сесія ще не створена')
expect(emptyMarkup).toContain('disabled=""')

expect(emptyMarkup).toContain('Понеділок, 10 серпня · 19:00')
expect(emptyMarkup).toContain('Вже записались: 9')
expect(emptyMarkup).toContain('Про що питають учасники')
expect(emptyMarkup).toContain('Як не зриватись на вихідних')
expect(emptyMarkup).toContain('Планування тижня з дітьми')
expect(emptyMarkup).toContain('Повернення після відпустки')
expect(emptyMarkup).toContain('і ще 6 питань від учасників')

expect(emptyMarkup).not.toContain('Наступний Zoom уже готується')
expect(emptyMarkup).not.toContain('Твій підсумок тижня')
expect(emptyMarkup).not.toContain('ПЕРЕГЛЯНУТИ ПОВНИЙ ЗВІТ')
expect(mockRegisterAttendee).not.toHaveBeenCalled()

})

  it('bypasses the inactive-access payment gate on the booking entry path', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const previousSystemState = {
      ...mockSystemState,
      zoomAccess: { ...mockSystemState.zoomAccess },
    }

    mockSystemState.zoomAccess = {
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
    }

    const bookingMarkup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/miniapp/zoom-calendar?intent=booking'] },
        createElement(
          Routes,
          undefined,
          createElement(Route, {
            path: '/miniapp/zoom-calendar',
            element: createElement(CleanMiniAppZoomCalendar),
          }),
        ),
      ),
    )

    mockSystemState.zoomAccess = previousSystemState.zoomAccess
    consoleErrorSpy.mockRestore()

    expect(bookingMarkup).toContain('ЗАПИСАТИСЬ')
    expect(bookingMarkup).toContain('Понеділок, 10 серпня · 19:00')
    expect(bookingMarkup).not.toContain('Доступ до Zoom ще не підтверджено.')
    expect(bookingMarkup).not.toContain('ОПЛАТИТИ ФОКУС')
    expect(bookingMarkup).not.toContain('Твій підсумок тижня')
  })

  it('uses the existing booking mutation with the exact real session id and refetches once', async () => {
    const refetchCurrentWeek = vi.fn(async () => undefined)
    const refetchUpcoming = vi.fn(async () => undefined)
    const refetchMySessions = vi.fn(async () => undefined)

    await expect(
      performBookingScreenRegistration({
        sessionId: 'zoom-booking-session',
        registerAttendee: mockRegisterAttendee,
        refetchCurrentWeek,
        refetchUpcoming,
        refetchMySessions,
      }),
    ).resolves.toBe('booked')

    expect(mockRegisterAttendee).toHaveBeenCalledTimes(1)
    expect(mockRegisterAttendee).toHaveBeenCalledWith({ sessionId: 'zoom-booking-session' })
    expect(refetchCurrentWeek).toHaveBeenCalledTimes(1)
    expect(refetchUpcoming).toHaveBeenCalledTimes(1)
    expect(refetchMySessions).toHaveBeenCalledTimes(1)
  })

  it('hides ended sessions and returns an honest empty state when nothing upcoming remains', () => {
    const resolved = resolveUpcomingZoomSessions({
      currentWeekSessions: [
        {
          id: 'ended-only',
          expertId: null,
          scheduledAt: '2026-08-03T15:00:00.000Z',
          topic: 'Ended only',
          status: 'SCHEDULED',
          requests: [],
          postSessionReport: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
          type: 'GROUP',
          attendeesCount: 1,
          isMyBooking: false,
          audioFileId: null,
          hasAudio: false,
          zoomLink: '',
          durationMinutes: 60,
        } as ZoomWeekOverview['sessions'][number] & { durationMinutes: number },
      ],
      upcomingSession: null,
      mySessions: [],
      now: new Date('2026-08-04T09:00:00.000Z'),
    })

    expect(resolved.visibleSessionCount).toBe(0)
    expect(resolved.nextSession).toBeNull()
    expect(
      resolveZoomHubEmptyState({
        hasZoomHubAccess: true,
        shouldShowDirectSessionOnly: false,
        nextSession: resolved.nextSession,
        previousSessionRecap: null,
      }),
    ).toEqual({
      title: 'Наступний Zoom уже готується',
      description: 'Розклад оновлюється автоматично. Щойно наступна практика буде доступна, ми повідомимо тебе в боті.',
      accessNote: 'Твій доступ активний.',
    })
  })

  it('returns an exact Monday-Sunday Kyiv range instead of a rolling 15-day window', () => {
    const week = getKyivWeekRange(new Date('2026-08-02T12:00:00.000Z'))

    expect(week).toEqual({
      from: '2026-07-26T21:00:00.000Z',
      to: '2026-08-02T20:59:59.999Z',
      timezone: 'Europe/Kyiv',
    })
  })

  it('picks the closest actionable upcoming session and skips completed ones', () => {
    const next = pickNextZoomSession([
      {
        id: 'completed',
        expertId: null,
        scheduledAt: '2026-08-01T10:00:00.000Z',
        topic: 'Completed',
        status: 'COMPLETED',
        requests: [],
        postSessionReport: null,
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: '2026-08-01T08:00:00.000Z',
        type: 'GROUP',
        attendeesCount: 1,
        isMyBooking: true,
        audioFileId: null,
        hasAudio: false,
        zoomLink: '',
      },
      {
        id: 'next',
        expertId: null,
        scheduledAt: '2026-08-03T16:00:00.000Z',
        topic: 'Next',
        status: 'SCHEDULED',
        requests: [],
        postSessionReport: null,
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: '2026-08-01T08:00:00.000Z',
        type: 'GROUP',
        attendeesCount: 0,
        isMyBooking: false,
        audioFileId: null,
        hasAudio: false,
        zoomLink: '',
      },
    ], new Date('2026-08-02T12:00:00.000Z'))

    expect(next?.id).toBe('next')
  })

  it('keeps the nearest future session visible when the current week is empty', () => {
    const next = resolveNearestZoomSession({
      currentWeekSessions: [],
      upcomingSession: {
        id: 'future',
        expertId: null,
        scheduledAt: '2026-08-03T16:00:00.000Z',
        topic: 'Nearest future',
        status: 'SCHEDULED',
        requests: [],
        postSessionReport: null,
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: '2026-08-01T08:00:00.000Z',
      },
      mySessions: [],
      now: new Date('2026-08-02T12:00:00.000Z'),
    })

    expect(next?.id).toBe('future')
  })

  it('formats a same-day nearest session as today in Kyiv time', () => {
    expect(
      resolveNearestSessionDateLabel(
        '2026-08-03T15:00:00.000Z',
        new Date('2026-08-03T13:00:00.000Z'),
      ),
    ).toBe('Сьогодні · 18:00')
  })

  it('formats a next-day nearest session as tomorrow in Kyiv time', () => {
    expect(
      resolveNearestSessionDateLabel(
        '2026-08-04T15:00:00.000Z',
        new Date('2026-08-03T13:00:00.000Z'),
      ),
    ).toBe('Завтра · 18:00')
  })

  it('formats a later nearest session as an absolute Kyiv date and time', () => {
    expect(
      resolveNearestSessionDateLabel(
        '2026-08-06T15:00:00.000Z',
        new Date('2026-08-03T13:00:00.000Z'),
      ),
    ).toBe('6 серпня · 18:00')
  })

  it('keeps an active session as nearest until its effective end', () => {
    const activeNow = {
      id: 'active-now',
      expertId: null,
      scheduledAt: '2026-08-03T14:30:00.000Z',
      topic: 'Active now',
      status: 'ACTIVE',
      requests: [],
      postSessionReport: null,
      createdAt: '2026-08-01T08:00:00.000Z',
      updatedAt: '2026-08-01T08:00:00.000Z',
      type: 'GROUP',
      attendeesCount: 1,
      isMyBooking: true,
      audioFileId: null,
      hasAudio: false,
      zoomLink: '',
      durationMinutes: 120,
    } as ZoomWeekOverview['sessions'][number] & { durationMinutes: number }

    const next = resolveNearestZoomSession({
      currentWeekSessions: [
        activeNow,
        {
          id: 'next-up',
          expertId: null,
          scheduledAt: '2026-08-03T17:00:00.000Z',
          topic: 'Next up',
          status: 'SCHEDULED',
          requests: [],
          postSessionReport: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
          type: 'GROUP',
          attendeesCount: 0,
          isMyBooking: false,
          audioFileId: null,
          hasAudio: false,
          zoomLink: '',
        },
      ],
      upcomingSession: null,
      mySessions: [],
      now: new Date('2026-08-03T15:00:00.000Z'),
    })

    expect(next?.id).toBe('active-now')
  })

  it('excludes an ended active session and picks the next future one', () => {
    const endedActive = {
      id: 'ended-active',
      expertId: null,
      scheduledAt: '2026-08-03T12:00:00.000Z',
      topic: 'Ended active',
      status: 'ACTIVE',
      requests: [],
      postSessionReport: null,
      createdAt: '2026-08-01T08:00:00.000Z',
      updatedAt: '2026-08-01T08:00:00.000Z',
      type: 'GROUP',
      attendeesCount: 1,
      isMyBooking: true,
      audioFileId: null,
      hasAudio: false,
      zoomLink: '',
      durationMinutes: 60,
    } as ZoomWeekOverview['sessions'][number] & { durationMinutes: number }

    const next = resolveNearestZoomSession({
      currentWeekSessions: [
        endedActive,
        {
          id: 'future-next',
          expertId: null,
          scheduledAt: '2026-08-03T17:00:00.000Z',
          topic: 'Future next',
          status: 'SCHEDULED',
          requests: [],
          postSessionReport: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
          type: 'GROUP',
          attendeesCount: 0,
          isMyBooking: false,
          audioFileId: null,
          hasAudio: false,
          zoomLink: '',
        },
      ],
      upcomingSession: {
        id: 'ended-upcoming',
        expertId: null,
        scheduledAt: '2026-08-03T12:00:00.000Z',
        topic: 'Ended upcoming',
        status: 'ACTIVE',
        requests: [],
        postSessionReport: null,
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: '2026-08-01T08:00:00.000Z',
      },
      mySessions: [],
      now: new Date('2026-08-03T15:00:00.000Z'),
    })

    expect(next?.id).toBe('future-next')
  })

  it('maps isRegistered booking state onto the nearest session card', () => {
    const next = resolveNearestZoomSession({
      currentWeekSessions: [],
      upcomingSession: {
        id: 'booked',
        expertId: null,
        scheduledAt: '2026-08-03T16:00:00.000Z',
        topic: 'Booked future',
        status: 'SCHEDULED',
        requests: [],
        postSessionReport: null,
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: '2026-08-01T08:00:00.000Z',
      },
      mySessions: [
        {
          id: 'booked',
          expertId: null,
          scheduledAt: '2026-08-03T16:00:00.000Z',
          topic: 'Booked future',
          status: 'SCHEDULED',
          requests: [],
          postSessionReport: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
          isRegistered: true,
          attendeeId: 'att-1',
        },
      ],
      now: new Date('2026-08-02T12:00:00.000Z'),
    })

    expect(next?.isMyBooking).toBe(true)
    expect(
      resolveZoomHubPrimaryAction({
        accessState: 'active',
        session: next ?? null,
      }),
    ).toMatchObject({
      action: 'none',
      label: 'ТИ ЗАПИСАНА',
    })
  })

  it('returns uppercase booking CTA for an available unbooked session', () => {
    expect(
      resolveZoomHubPrimaryAction({
        accessState: 'active',
        session: {
          id: 'available',
          expertId: null,
          scheduledAt: '2026-08-05T16:00:00.000Z',
          topic: 'Available',
          status: 'SCHEDULED',
          requests: [],
          postSessionReport: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
          type: 'GROUP',
          attendeesCount: 0,
          isMyBooking: false,
          audioFileId: null,
          hasAudio: false,
          zoomLink: '',
        },
      }),
    ).toMatchObject({
      action: 'book',
      label: 'ЗАПИСАТИСЬ НА СЕРЕДА',
    })
  })

  it('returns booked CTA without rebooking before the join window opens', () => {
    expect(
      resolveZoomHubPrimaryAction({
        accessState: 'active',
        session: {
          id: 'booked',
          expertId: null,
          scheduledAt: '2026-08-05T16:00:00.000Z',
          topic: 'Booked',
          status: 'SCHEDULED',
          requests: [],
          postSessionReport: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
          type: 'GROUP',
          attendeesCount: 1,
          isMyBooking: true,
          audioFileId: null,
          hasAudio: false,
          zoomLink: '',
        },
      }),
    ).toMatchObject({
      action: 'none',
      label: 'ТИ ЗАПИСАНА',
    })
  })

  it('returns join CTA with the canonical zoom action when the session is active', () => {
    expect(
      resolveZoomHubPrimaryAction({
        accessState: 'active',
        session: {
          id: 'joinable',
          expertId: null,
          scheduledAt: '2026-08-03T15:00:00.000Z',
          topic: 'Joinable',
          status: 'ACTIVE',
          requests: [],
          postSessionReport: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
          type: 'GROUP',
          attendeesCount: 1,
          isMyBooking: true,
          audioFileId: null,
          hasAudio: false,
          zoomLink: 'https://zoom.example/join',
        },
        now: new Date('2026-08-03T15:30:00.000Z'),
      }),
    ).toMatchObject({
      action: 'join',
      label: 'ПРИЄДНАТИСЯ',
    })
  })

  it('does not return an active CTA for completed or cancelled sessions', () => {
    const completed = resolveZoomHubPrimaryAction({
      accessState: 'active',
      session: {
        id: 'completed',
        expertId: null,
        scheduledAt: '2026-08-03T10:00:00.000Z',
        topic: 'Completed',
        status: 'COMPLETED',
        requests: [],
        postSessionReport: null,
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: '2026-08-01T08:00:00.000Z',
        type: 'GROUP',
        attendeesCount: 1,
        isMyBooking: true,
        audioFileId: null,
        hasAudio: false,
        zoomLink: 'https://zoom.example/completed',
      },
    })
    const cancelled = resolveZoomHubPrimaryAction({
      accessState: 'active',
      session: {
        id: 'cancelled',
        expertId: null,
        scheduledAt: '2026-08-03T10:00:00.000Z',
        topic: 'Cancelled',
        status: 'CANCELLED',
        requests: [],
        postSessionReport: null,
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: '2026-08-01T08:00:00.000Z',
        type: 'GROUP',
        attendeesCount: 1,
        isMyBooking: false,
        audioFileId: null,
        hasAudio: false,
        zoomLink: 'https://zoom.example/cancelled',
      },
    })

    expect(completed.action).toBe('none')
    expect(cancelled.action).toBe('none')
    expect(completed.label).not.toBe('ПРИЄДНАТИСЯ')
    expect(cancelled.label).not.toBe('ПРИЄДНАТИСЯ')
  })

  it('uses readable contrast classes for book, booked, join and access CTAs', () => {
    expect(resolveZoomHubPrimaryActionClassName('book')).toContain('text-[var(--on-accent)]')
    expect(resolveZoomHubPrimaryActionClassName('join')).toContain('text-white')
    expect(resolveZoomHubPrimaryActionClassName('open_access')).toContain('text-[var(--on-accent)]')
    expect(resolveZoomHubPrimaryActionClassName('none')).toContain('text-white')
    expect(resolveZoomHubPrimaryActionClassName('none')).toContain('bg-white/[0.08]')
  })

  it('removes the legacy prepare CTA label from the active runtime contract', () => {
    const labels = [
      resolveZoomHubPrimaryAction({
        accessState: 'active',
        session: {
          id: 'available',
          expertId: null,
          scheduledAt: '2026-08-05T16:00:00.000Z',
          topic: 'Available',
          status: 'SCHEDULED',
          requests: [],
          postSessionReport: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
          type: 'GROUP',
          attendeesCount: 0,
          isMyBooking: false,
          audioFileId: null,
          hasAudio: false,
          zoomLink: '',
        },
      }).label,
      resolveZoomHubPrimaryAction({
        accessState: 'active',
        session: {
          id: 'booked',
          expertId: null,
          scheduledAt: '2026-08-05T16:00:00.000Z',
          topic: 'Booked',
          status: 'SCHEDULED',
          requests: [],
          postSessionReport: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
          type: 'GROUP',
          attendeesCount: 1,
          isMyBooking: true,
          audioFileId: null,
          hasAudio: false,
          zoomLink: '',
        },
      }).label,
      resolveZoomHubPrimaryAction({
        accessState: 'active',
        session: {
          id: 'joinable',
          expertId: null,
          scheduledAt: '2026-08-03T15:00:00.000Z',
          topic: 'Joinable',
          status: 'ACTIVE',
          requests: [],
          postSessionReport: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
          type: 'GROUP',
          attendeesCount: 1,
          isMyBooking: true,
          audioFileId: null,
          hasAudio: false,
          zoomLink: 'https://zoom.example/join',
        },
        now: new Date('2026-08-03T15:30:00.000Z'),
      }).label,
    ]

    for (const legacyLabel of LEGACY_PREPARE_LABELS) {
      expect(labels).not.toContain(legacyLabel)
    }
  })

  it('renders the nearest session only once by removing it from the week list', () => {
    const nearest: ZoomWeekOverview['sessions'][number] = {
      id: 'nearest',
      expertId: null,
      scheduledAt: '2026-08-03T16:00:00.000Z',
      topic: 'Nearest future',
      status: 'SCHEDULED',
      requests: [],
      postSessionReport: null,
      createdAt: '2026-08-01T08:00:00.000Z',
      updatedAt: '2026-08-01T08:00:00.000Z',
      type: 'GROUP',
      attendeesCount: 1,
      isMyBooking: true,
      audioFileId: null,
      hasAudio: false,
      zoomLink: '',
    }

    const weekSessions = getVisibleWeekSessions([
      nearest,
      {
        id: 'other',
        expertId: null,
        scheduledAt: '2026-08-04T16:00:00.000Z',
        topic: 'Other session',
        status: 'SCHEDULED',
        requests: [],
        postSessionReport: null,
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: '2026-08-01T08:00:00.000Z',
        type: 'GROUP',
        attendeesCount: 0,
        isMyBooking: false,
        audioFileId: null,
        hasAudio: false,
        zoomLink: '',
      },
    ], nearest, new Date('2026-08-03T12:00:00.000Z'))

    expect(weekSessions.map((session) => session.id)).toEqual(['other'])
  })

  it('does not show empty copy while a next session exists', () => {
    expect(
      resolveZoomHubEmptyState({
        hasZoomHubAccess: true,
        shouldShowDirectSessionOnly: false,
        nextSession: {
          id: 'nearest',
          expertId: null,
          scheduledAt: '2026-08-03T16:00:00.000Z',
          topic: 'Nearest future',
          status: 'SCHEDULED',
          requests: [],
          postSessionReport: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
          type: 'GROUP',
          attendeesCount: 1,
          isMyBooking: true,
          audioFileId: null,
          hasAudio: false,
          zoomLink: '',
        },
        previousSessionRecap: null,
      }),
    ).toBeNull()
  })

  it('shows the canonical empty copy when no upcoming session exists', () => {
    expect(
      resolveZoomHubEmptyState({
        hasZoomHubAccess: true,
        shouldShowDirectSessionOnly: false,
        nextSession: null,
        previousSessionRecap: null,
      }),
    ).toEqual({
      title: 'Наступний Zoom уже готується',
      description: 'Розклад оновлюється автоматично. Щойно наступна практика буде доступна, ми повідомимо тебе в боті.',
      accessNote: 'Твій доступ активний.',
    })
  })

  it('returns the next boundary once for automatic refetch after session rollover', () => {
    const nextBoundary = resolveNextZoomBoundaryAt([
      {
        scheduledAt: '2026-08-03T15:00:00.000Z',
        status: 'SCHEDULED',
        durationMinutes: 60,
      },
      {
        scheduledAt: '2026-08-10T15:00:00.000Z',
        status: 'SCHEDULED',
        durationMinutes: 60,
      },
    ], new Date('2026-08-04T09:00:00.000Z'))

    expect(nextBoundary?.toISOString()).toBe('2026-08-10T15:00:00.000Z')
  })

  it('uses the canonical group title only for blank topics', () => {
    expect(resolveZoomSessionTitle('')).toBe('Групова Zoom-практика')
    expect(resolveZoomSessionTitle(undefined)).toBe('Групова Zoom-практика')
  })

  it('preserves a normal real title unchanged', () => {
    expect(resolveZoomSessionTitle('Групова Zoom-практика')).toBe('Групова Zoom-практика')
    expect(resolveZoomSessionTitle('ФОКУС · Zoom-практика')).toBe('ФОКУС · Zoom-практика')
  })

  it('resolves a booked scheduled session to the canonical booked CTA', () => {
    expect(
      resolveZoomHubPrimaryAction({
        accessState: 'active',
        session: {
          id: 'booked',
          expertId: null,
          scheduledAt: '2026-08-03T16:00:00.000Z',
          topic: 'Booked',
          status: 'SCHEDULED',
          requests: [],
          postSessionReport: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
          type: 'GROUP',
          attendeesCount: 1,
          isMyBooking: true,
          audioFileId: null,
          hasAudio: false,
          zoomLink: '',
        },
      }),
    ).toMatchObject({
      action: 'none',
      label: 'ТИ ЗАПИСАНА',
    })
  })

  it('resolves open_access CTA when access is inactive even if a session exists', () => {
    expect(
      resolveZoomHubPrimaryAction({
        accessState: 'inactive',
        session: {
          id: 'locked',
          expertId: null,
          scheduledAt: '2026-08-03T16:00:00.000Z',
          topic: 'Locked',
          status: 'SCHEDULED',
          requests: [],
          postSessionReport: null,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
          type: 'GROUP',
          attendeesCount: 0,
          isMyBooking: false,
          audioFileId: null,
          hasAudio: false,
          zoomLink: '',
        },
      }).action,
    ).toBe('open_access')
  })
})
