import { beforeAll, describe, expect, it, vi } from 'vitest'

let resolveZoomAccessState: typeof import('./CleanMiniAppZoomCalendar').resolveZoomAccessState
let hasConfirmedFocusAccess: typeof import('./CleanMiniAppZoomCalendar').hasConfirmedFocusAccess
let readDirectZoomBookingParams: typeof import('./CleanMiniAppZoomCalendar').readDirectZoomBookingParams
let isDirectZoomBookingRequest: typeof import('./CleanMiniAppZoomCalendar').isDirectZoomBookingRequest
let shouldPrimeDirectBooking: typeof import('./CleanMiniAppZoomCalendar').shouldPrimeDirectBooking

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
