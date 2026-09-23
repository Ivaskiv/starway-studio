import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type {
  ZoomCalendarSession,
} from '@/features/zoom/zoom.types'
import type {
  ZoomMySessionsResponse,
  ZoomSessionWithAttendance,
} from '@/features/zoom/types/zoom.types'

const mockUseGetCalendarSessionsQuery = vi.fn()
const mockUseGetIndividualAvailabilityQuery = vi.fn()
const mockUseGetIndividualAvailabilitySummaryQuery = vi.fn()
const mockZoomCalendarProps = vi.fn()
let calendarSessionsResult: { data: ZoomCalendarSession[] } = { data: [] }
let mySessionsResult: { data: ZoomMySessionsResponse } = {
  data: {
    sessions: [],
    previousSessionRecap: null,
    latestWeeklyReport: null,
  },
}

vi.mock('@/features/zoom/zoom.api', () => ({
  useGetCalendarSessionsQuery: (...args: unknown[]) => {
    mockUseGetCalendarSessionsQuery(...args)
    return calendarSessionsResult
  },
  useGetLeaderboardQuery: () => ({ data: [] }),
  useInitiateBattleMutation: () => [vi.fn(), { isLoading: false }],
  useAcceptBattleMutation: () => [vi.fn()],
  useDeclineBattleMutation: () => [vi.fn()],
  useLogBattleProgressMutation: () => [vi.fn()],
  useGetEligibleOpponentsQuery: () => ({ data: [] }),
  useGetPendingSwapsQuery: () => ({ data: [] }),
  useAcceptSwapMutation: () => [vi.fn()],
  useDeclineSwapMutation: () => [vi.fn()],
  useCreateUserIndividualRequestMutation: () => [vi.fn(), { isLoading: false }],
  useGetIndividualAvailabilityQuery: (...args: unknown[]) => {
    mockUseGetIndividualAvailabilityQuery(...args)
    return { data: [], isFetching: false, isError: false, refetch: vi.fn() }
  },
  useGetIndividualAvailabilitySummaryQuery: (...args: unknown[]) => {
    mockUseGetIndividualAvailabilitySummaryQuery(...args)
    return { data: [] }
  },
}))

vi.mock('@/features/zoom/services/zoom.api', () => ({
  useGetMySessionsQuery: () => mySessionsResult,
}))

vi.mock('@/app/hooks', () => ({
  useAppSelector: (selector: (state: { auth: { user: unknown } }) => unknown) =>
    selector({ auth: { user: { id: 'user-1', firstName: 'User', email: 'user@example.com' } } }),
}))

vi.mock('@/features/auth/hooks/useSystemState', () => ({
  useSystemState: () => ({
    getModuleAccess: () => ({ isLocked: true }),
    isLoading: false,
    state: { products: { owned: [], subscribed: [] } },
    zoomAccess: { hasFocus: false },
  }),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: unknown }) => createElement('a', undefined, children),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}))

vi.mock('@/features/zoom/components/calendar/Calendar', () => ({
  default: (props: { mode: string; sessionSource?: { sessions: ZoomCalendarSession[] } }) => {
    mockZoomCalendarProps(props)
    return createElement('div', undefined, `CALENDAR:${props.mode}`)
  },
}))

describe('UserZoomPanel', () => {
  beforeAll(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    })
  })

  it('revalidates the calendar source that owns payment CTA actionability', async () => {
    calendarSessionsResult = { data: [] }
    const { UserZoomPanel } = await import('@/features/zoom/UserZoomPanel')
    renderToStaticMarkup(createElement(UserZoomPanel, { userId: 'user-1' }))

    expect(mockUseGetCalendarSessionsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'user', userId: 'user-1' }),
      {
        pollingInterval: 30_000,
        refetchOnFocus: true,
        refetchOnMountOrArgChange: true,
      },
    )
    expect(mockUseGetIndividualAvailabilitySummaryQuery).toHaveBeenCalledTimes(1)
  })

  it('uses the canonical centered modal with scroll lock for + ДОДАТИ СЛОТ', () => {
    const source = readFileSync(
      new URL('../../../src/features/zoom/UserZoomPanel.tsx', import.meta.url),
      'utf8',
    )

    expect(source).toContain("import { BaseModal } from '@/features/modals/BaseModal'")
    expect(source).toContain('<BaseModal')
    expect(source).toContain('isOpen')
    expect(source).toContain('containerClassName="z-[100] px-3 py-4"')
    expect(source).not.toContain('flex items-end justify-center')
  })

  it('renders a progressive individual booking calendar with canonical availability slots', () => {
    const source = readFileSync(
      new URL('../../../src/features/zoom/UserZoomPanel.tsx', import.meta.url),
      'utf8',
    )
    const individualModal = source.slice(
      source.indexOf("{createAction === 'individual'"),
      source.indexOf("{createAction === 'battle'"),
    )

    expect(source).toContain('useGetIndividualAvailabilityQuery(individualDate')
    expect(source).toContain('useGetIndividualAvailabilitySummaryQuery')
    expect(source).toContain("from: toLocalDateKey(individualCalendarStart)")
    expect(source).toContain("setIndividualTime('');")
    expect(individualModal).not.toContain('type="time"')
    expect(individualModal).not.toContain('type="date"')
    expect(individualModal).toContain('Календар індивідуальних сесій')
    expect(individualModal).toContain('Попередній місяць')
    expect(individualModal).toContain('Наступний місяць')
    expect(individualModal).toContain('moveIndividualCalendarMonth')
    expect(individualModal).toContain('disabled={isPast}')
    expect(individualModal).toContain('selectIndividualDate(dateKey)')
    expect(individualModal).toContain('individualAvailability.map((slot)')
    expect(individualModal).toContain('disabled={!slot.available}')
    expect(individualModal).toContain("slot.available ? 'Вільно' : 'Зайнято'")
    expect(source).toContain('hasOnlyBusyIndividualSlots')
    expect(source).toContain('individualAvailability.length > 0')
    expect(source).toContain('individualAvailability.every((slot) => !slot.available)')
    expect(individualModal).toContain('Коуч ще не відкрив доступні години на цю дату.')
    expect(individualModal).toContain('На цю дату всі індивідуальні слоти зайняті.')
    expect(individualModal).toContain('Не вдалося завантажити доступний час.')
    expect(individualModal).toContain('Повторити')
    expect(individualModal).toContain('aria-label="Доступний час"')
    expect(individualModal).toContain('Обраний час')
    expect(individualModal).toContain('60 хв')
    expect(individualModal).toContain('selectedIndividualSlot?.available &&')
    expect(individualModal).toContain('Продовжити')
    expect(individualModal).toContain('Групова практика')
    expect(individualModal).toContain('✓ ВАШ ЗАПИС')
    expect(individualModal).not.toContain('violet')
    expect(source).toContain("if (backendCode === 'COMMERCE_SLOT_UNAVAILABLE')")
    expect(source).toContain('void refetchIndividualAvailability()')
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
    const { UserZoomPanel } = await import('@/features/zoom/UserZoomPanel')
    const markup = renderToStaticMarkup(createElement(UserZoomPanel, { userId: 'user-1' }))

    expect(markup).toContain('CALENDAR:user')
    expect(markup).toContain('+ ДОДАТИ СЛОТ')
    expect(mockZoomCalendarProps).toHaveBeenLastCalledWith(expect.objectContaining({
      sessionSource: expect.objectContaining({ sessions: [] }),
    }))
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
      priceCents: 0,
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
      priceCents: 0,
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

    const { UserZoomPanel } = await import('@/features/zoom/UserZoomPanel')
    const markup = renderToStaticMarkup(createElement(UserZoomPanel, { userId: 'user-1' }))
    expect(markup).toContain('CALENDAR:user')
    expect(mockZoomCalendarProps).toHaveBeenLastCalledWith(expect.objectContaining({
      sessionSource: expect.objectContaining({
        sessions: [availableSession, bookedSession, pastSession],
      }),
    }))
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
          priceCents: 0,
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

    const { UserZoomPanel } = await import('@/features/zoom/UserZoomPanel')
    const markup = renderToStaticMarkup(createElement(UserZoomPanel, { userId: 'user-2' }))

    expect(markup).toContain('CALENDAR:user')
    expect(mockZoomCalendarProps).toHaveBeenLastCalledWith(expect.objectContaining({
      sessionSource: expect.objectContaining({ sessions: calendarSessionsResult.data }),
    }))
  })
})
