import { beforeAll, describe, expect, it, vi } from 'vitest'

let resolveZoomAccessState: typeof import('./CleanMiniAppZoomCalendar').resolveZoomAccessState
let hasConfirmedFocusAccess: typeof import('./CleanMiniAppZoomCalendar').hasConfirmedFocusAccess
let readDirectZoomBookingParams: typeof import('./CleanMiniAppZoomCalendar').readDirectZoomBookingParams
let isDirectZoomBookingRequest: typeof import('./CleanMiniAppZoomCalendar').isDirectZoomBookingRequest
let shouldPrimeDirectBooking: typeof import('./CleanMiniAppZoomCalendar').shouldPrimeDirectBooking
let pickNextZoomSession: typeof import('./CleanMiniAppZoomCalendar').pickNextZoomSession
let resolveZoomHubPrimaryAction: typeof import('./CleanMiniAppZoomCalendar').resolveZoomHubPrimaryAction

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
