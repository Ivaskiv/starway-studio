import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { ZoomWeekOverview } from '@/features/zoom/types/zoom.types'

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
let resolveWeekEmptyMessage: typeof import('./CleanMiniAppZoomCalendar').resolveWeekEmptyMessage
let resolveZoomSessionTitle: typeof import('./CleanMiniAppZoomCalendar').resolveZoomSessionTitle
let MINIAPP_ACCENT_BUTTON_CLASSNAME: typeof import('./CleanMiniAppZoomCalendar').MINIAPP_ACCENT_BUTTON_CLASSNAME
let resolveUpcomingZoomSessions: typeof import('./CleanMiniAppZoomCalendar').resolveUpcomingZoomSessions
let resolveNextZoomBoundaryAt: typeof import('./CleanMiniAppZoomCalendar').resolveNextZoomBoundaryAt

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
    resolveWeekEmptyMessage,
    resolveZoomSessionTitle,
    MINIAPP_ACCENT_BUTTON_CLASSNAME,
    resolveUpcomingZoomSessions,
    resolveNextZoomBoundaryAt,
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
      resolveWeekEmptyMessage({
        hasZoomHubAccess: true,
        shouldShowDirectSessionOnly: false,
        nextSession: resolved.nextSession,
      }),
    ).toBe('На цей момент доступних Zoom-практик немає.')
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
      label: 'ЗАПИСАТИСЯ',
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
      resolveWeekEmptyMessage({
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
      }),
    ).toBeNull()
  })

  it('shows the canonical empty copy when no upcoming session exists', () => {
    expect(
      resolveWeekEmptyMessage({
        hasZoomHubAccess: true,
        shouldShowDirectSessionOnly: false,
        nextSession: null,
      }),
    ).toBe('На цей момент доступних Zoom-практик немає.')
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
