import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type {
  ZoomCalendarSession,
} from './zoom.types'
import type {
  ZoomMySessionsResponse,
  ZoomSessionWithAttendance,
} from './types/zoom.types'

let calendarSessionsResult: { data: ZoomCalendarSession[] } = { data: [] }
let mySessionsResult: { data: ZoomMySessionsResponse } = {
  data: {
    sessions: [],
    previousSessionRecap: null,
    latestWeeklyReport: null,
  },
}

vi.mock('./zoom.api', () => ({
  useGetCalendarSessionsQuery: () => calendarSessionsResult,
  useGetLeaderboardQuery: () => ({ data: [] }),
  useInitiateBattleMutation: () => [vi.fn(), { isLoading: false }],
  useAcceptBattleMutation: () => [vi.fn()],
  useDeclineBattleMutation: () => [vi.fn()],
  useLogBattleProgressMutation: () => [vi.fn()],
  useGetEligibleOpponentsQuery: () => ({ data: [] }),
  useGetPendingSwapsQuery: () => ({ data: [] }),
  useAcceptSwapMutation: () => [vi.fn()],
  useDeclineSwapMutation: () => [vi.fn()],
}))

vi.mock('./services/zoom.api', () => ({
  useGetMySessionsQuery: () => mySessionsResult,
}))

vi.mock('./components/calendar/Calendar', () => ({
  default: ({ mode }: { mode: string }) => createElement('div', undefined, `CALENDAR:${mode}`),
}))

describe('UserZoomPanel', () => {
  beforeAll(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
  })

  it('uses the existing empty states instead of mock sessions when user calendar data is empty', async () => {
    calendarSessionsResult = { data: [] }
    mySessionsResult = {
      data: {
        sessions: [],
        previousSessionRecap: null,
        latestWeeklyReport: null,
      },
    }
    const { UserZoomPanel } = await import('./UserZoomPanel')
    const markup = renderToStaticMarkup(createElement(UserZoomPanel, { userId: 'user-1' }))

    expect(markup).toContain('CALENDAR:user')
    expect(markup).toContain('ДОСТУПНІ СЕСІЇ')
    expect(markup).toContain('МІЙ ZOOM')
    expect(markup).toContain('Правила')
    expect(markup).toContain('Ти ще не зареєструвалась на жодну сесію')
    expect(markup).not.toContain('7-денний формат 1v1')
    expect(markup).not.toContain('Чому ти відкладаєш важливе?')
    expect(markup).not.toContain('демо')
  })

  it('renders available sessions separately from booked sessions and excludes past or booked duplicates', async () => {
    const now = Date.now()
    const availableSession: ZoomCalendarSession = {
      id: 'available-1',
      scheduledAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
      topic: 'Future open session',
      status: 'SCHEDULED',
      type: 'group_practice',
      zoomLink: '',
      attendeesCount: 0,
      notifiedAt24h: null,
      notifiedAt2h: null,
      goalText: null,
      canEdit: false,
      isMyBooking: false,
    }
    const bookedSession: ZoomCalendarSession = {
      id: 'booked-1',
      scheduledAt: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
      topic: 'Booked session',
      status: 'SCHEDULED',
      type: 'group_practice',
      zoomLink: 'https://zoom.example/booked',
      attendeesCount: 12,
      notifiedAt24h: new Date(now - 60 * 60 * 1000).toISOString(),
      notifiedAt2h: null,
      goalText: null,
      canEdit: false,
      isMyBooking: true,
    }
    const pastSession: ZoomCalendarSession = {
      id: 'past-1',
      scheduledAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      topic: 'Past session',
      status: 'COMPLETED',
      type: 'group_practice',
      zoomLink: '',
      attendeesCount: 5,
      notifiedAt24h: null,
      notifiedAt2h: null,
      goalText: null,
      canEdit: false,
      isMyBooking: false,
    }

    calendarSessionsResult = {
      data: [availableSession, bookedSession, pastSession],
    }
    mySessionsResult = {
      data: {
        sessions: [
          {
            ...bookedSession,
            isRegistered: true,
            attendeeId: 'attendee-1',
          } as unknown as ZoomSessionWithAttendance,
        ],
        previousSessionRecap: null,
        latestWeeklyReport: null,
      },
    }

    const { UserZoomPanel } = await import('./UserZoomPanel')
    const markup = renderToStaticMarkup(createElement(UserZoomPanel, { userId: 'user-1' }))
    const availableSection = markup.split('ДОСТУПНІ СЕСІЇ')[1]?.split('МІЙ ZOOM')[0] ?? ''

    expect(markup).toContain('ДОСТУПНІ СЕСІЇ')
    expect(markup).toContain('Future open session')
    expect(markup).toContain('МІЙ ZOOM')
    expect(markup).toContain('Booked session')
    expect(markup).not.toContain('Past session')
    expect(availableSection).not.toContain('Booked session')
  })

  it('renders pending battle invitation actions for the opponent from canonical session data', async () => {
    const now = Date.now()
    calendarSessionsResult = {
      data: [
        {
          id: 'battle-session-1',
          scheduledAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
          topic: 'Battle: user-1 vs user-2',
          status: 'SCHEDULED',
          type: 'battle_review',
          zoomLink: '',
          attendeesCount: 2,
          notifiedAt24h: null,
          notifiedAt2h: null,
          goalText: null,
          battleStatus: 'pending',
          challengerId: 'user-1',
          opponentId: 'user-2',
          canEdit: false,
          isMyBooking: true,
        },
      ],
    }
    mySessionsResult = {
      data: {
        sessions: [],
        previousSessionRecap: null,
        latestWeeklyReport: null,
      },
    }

    const { UserZoomPanel } = await import('./UserZoomPanel')
    const markup = renderToStaticMarkup(createElement(UserZoomPanel, { userId: 'user-2' }))

    expect(markup).toContain('Battle очікує твого рішення.')
    expect(markup).toContain('Прийняти')
    expect(markup).toContain('Відхилити')
  })
})
