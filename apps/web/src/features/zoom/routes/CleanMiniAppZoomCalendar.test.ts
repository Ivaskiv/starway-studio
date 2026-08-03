import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { ZoomWeekOverview } from '@/features/zoom/types/zoom.types'

let resolveZoomAccessState: typeof import('./CleanMiniAppZoomCalendar').resolveZoomAccessState
let hasConfirmedFocusAccess: typeof import('./CleanMiniAppZoomCalendar').hasConfirmedFocusAccess
let readDirectZoomBookingParams: typeof import('./CleanMiniAppZoomCalendar').readDirectZoomBookingParams
let isDirectZoomBookingRequest: typeof import('./CleanMiniAppZoomCalendar').isDirectZoomBookingRequest
let shouldPrimeDirectBooking: typeof import('./CleanMiniAppZoomCalendar').shouldPrimeDirectBooking
let pickNextZoomSession: typeof import('./CleanMiniAppZoomCalendar').pickNextZoomSession
let resolveZoomHubPrimaryAction: typeof import('./CleanMiniAppZoomCalendar').resolveZoomHubPrimaryAction
let getKyivWeekRange: typeof import('./CleanMiniAppZoomCalendar').getKyivWeekRange
let resolveNearestZoomSession: typeof import('./CleanMiniAppZoomCalendar').resolveNearestZoomSession
let shouldRenderPaymentGate: typeof import('./CleanMiniAppZoomCalendar').shouldRenderPaymentGate
let getVisibleWeekSessions: typeof import('./CleanMiniAppZoomCalendar').getVisibleWeekSessions
let resolveWeekEmptyMessage: typeof import('./CleanMiniAppZoomCalendar').resolveWeekEmptyMessage
let resolveZoomSessionTitle: typeof import('./CleanMiniAppZoomCalendar').resolveZoomSessionTitle

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
    getKyivWeekRange,
    resolveNearestZoomSession,
    shouldRenderPaymentGate,
    getVisibleWeekSessions,
    resolveWeekEmptyMessage,
    resolveZoomSessionTitle,
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
      }).action,
    ).toBe('prepare')
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
    ], nearest)

    expect(weekSessions.map((session) => session.id)).toEqual(['other'])
  })

  it('shows a dedicated empty copy when no other week sessions remain after dedup', () => {
    expect(
      resolveWeekEmptyMessage({
        hasZoomHubAccess: true,
        shouldShowDirectSessionOnly: false,
        currentWeekSessions: [
          {
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
        ],
        visibleWeekSessions: [],
      }),
    ).toBe('На цьому тижні інших практик немає.')
  })

  it('shows the current-week empty copy when the Monday-Sunday range has no sessions', () => {
    expect(
      resolveWeekEmptyMessage({
        hasZoomHubAccess: true,
        shouldShowDirectSessionOnly: false,
        currentWeekSessions: [],
        visibleWeekSessions: [],
      }),
    ).toBe('На поточному тижні практик немає.')
  })

  it('uses the canonical group title only for blank topics', () => {
    expect(resolveZoomSessionTitle('')).toBe('Групова Zoom-практика')
    expect(resolveZoomSessionTitle(undefined)).toBe('Групова Zoom-практика')
  })

  it('preserves a normal real title unchanged', () => {
    expect(resolveZoomSessionTitle('Групова Zoom-практика')).toBe('Групова Zoom-практика')
    expect(resolveZoomSessionTitle('ФОКУС · Zoom-практика')).toBe('ФОКУС · Zoom-практика')
  })

  it('resolves prepare CTA for an already booked scheduled session', () => {
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
      }).action,
    ).toBe('prepare')
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
