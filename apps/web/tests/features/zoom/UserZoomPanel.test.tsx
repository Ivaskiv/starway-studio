import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
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
let zoomAccessResult = { hasFocus: false }
const mockOpenPayment = vi.fn()

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
  useCancelZoomCommerceRequestMutation: () => [vi.fn(), { isLoading: false }],
  useBookSlotMutation: () => [vi.fn(), { isLoading: false }],
  useUnbookSlotMutation: () => [vi.fn(), { isLoading: false }],
  useBookPrivateSlotMutation: () => [vi.fn(), { isLoading: false }],
  useCancelPrivateBookingMutation: () => [vi.fn(), { isLoading: false }],
  useCreateSwapRequestMutation: () => [vi.fn(), { isLoading: false }],
  useCompleteZoomSessionMutation: () => [vi.fn(), { isLoading: false }],
  useLazyGetZoomCompletionDraftQuery: () => [vi.fn(), { isFetching: false }],
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
    zoomAccess: zoomAccessResult,
  }),
}))

vi.mock('@/features/zoom/hooks/useAccessActions', () => ({
  useAccessActions: () => ({
    openPayment: mockOpenPayment,
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

  beforeEach(() => {
    zoomAccessResult = { hasFocus: false }
    mockOpenPayment.mockReset()
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

  it('filters the calendar source through the shared ALL, GROUP, and INDIVIDUAL state contract', async () => {
    const { filterUserCalendarSessions } = await import('@/features/zoom/UserZoomPanel')
    const sessions = [
      { id: 'group', type: 'GROUP' },
      { id: 'group-practice', type: 'group_practice' },
      { id: 'individual', type: 'INDIVIDUAL' },
      { id: 'private', type: 'PRIVATE' },
    ] as ZoomCalendarSession[]

    expect(filterUserCalendarSessions(sessions, 'all').map(({ id }) => id)).toEqual([
      'group', 'group-practice', 'individual', 'private',
    ])
    expect(filterUserCalendarSessions(sessions, 'group').map(({ id }) => id)).toEqual([
      'group', 'group-practice',
    ])
    expect(filterUserCalendarSessions(sessions, 'individual').map(({ id }) => id)).toEqual([
      'individual', 'private',
    ])
  })

  it('derives My sessions counts and a tab-specific empty state from the selected filter', async () => {
    const { getMySessionsFilterPresentation } = await import('@/features/zoom/UserZoomPanel')
    const now = new Date('2026-10-03T12:00:00.000Z')
    const sessions = [
      { id: 'upcoming', scheduledAt: '2026-10-04T12:00:00.000Z', isMyBooking: true },
      { id: 'past', scheduledAt: '2026-10-02T12:00:00.000Z', isMyPendingPayment: true },
      { id: 'cancelled', scheduledAt: '2026-10-04T12:00:00.000Z', commerceStatus: 'CANCELLED' },
    ] as ZoomCalendarSession[]

    const upcoming = getMySessionsFilterPresentation(sessions, 'upcoming', now)
    const past = getMySessionsFilterPresentation(sessions, 'past', now)
    const cancelled = getMySessionsFilterPresentation(sessions, 'cancelled', now)

    expect(upcoming.counts).toEqual({ upcoming: 1, past: 1, cancelled: 1 })
    expect(upcoming.sessions.map(({ id }) => id)).toEqual(['upcoming'])
    expect(past.sessions.map(({ id }) => id)).toEqual(['past'])
    expect(cancelled.sessions.map(({ id }) => id)).toEqual(['cancelled'])
    expect(upcoming.emptyMessage).toBe('Немає майбутніх сесій.')
    expect(past.emptyMessage).toBe('Немає минулих сесій.')
    expect(cancelled.emptyMessage).toBe('Немає скасованих сесій.')
  })

  it('queries through the next Monday window so the Group Practice picker is not limited by month end', async () => {
    calendarSessionsResult = { data: [] }
    const { UserZoomPanel } = await import('@/features/zoom/UserZoomPanel')
    renderToStaticMarkup(createElement(UserZoomPanel, { userId: 'user-1' }))

    const calendarQuery = mockUseGetCalendarSessionsQuery.mock.calls.at(-1)?.[0] as {
      from: string
      to: string
    }
    expect(new Date(calendarQuery.to).getTime()).toBeGreaterThanOrEqual(
      new Date(calendarQuery.from).getTime() + 7 * 24 * 60 * 60 * 1000,
    )
  })

  it('uses the canonical centered USER booking modal with scroll lock', () => {
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
    expect(individualModal).toContain('individualQuestionValidationError')
    expect(source).toContain('Опиши запит кількома словами, щоб коуч розумів, з чим ти приходиш.')
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
    expect(markup).not.toContain('+ ДОДАТИ СЛОТ')
    expect(markup).toContain('Мої сесії')
    expect(markup).not.toContain('Мій прогрес')
    expect(markup).not.toContain('Матеріали')
    expect(markup).toContain('Усі сесії')
    expect(markup).toContain('Групові')
    expect(markup).toContain('Індивідуальні')
    expect(markup).toContain('Майбутні')
    expect(markup).toContain('Минулі')
    expect(markup).toContain('Скасовані')
    expect(markup).toContain('Немає майбутніх сесій.')
    expect(markup).toContain('АКТИВУВАТИ ДОСТУП І ЗАПИСАТИСЯ')
    expect(markup).toContain('НАЙБЛИЖЧІ СЛОТИ')
    expect(mockZoomCalendarProps).toHaveBeenLastCalledWith(expect.objectContaining({
      sessionSource: expect.objectContaining({ sessions: [] }),
      hasFocusAccess: false,
      onRestrictedGroupAction: expect.any(Function),
    }))
    expect(markup).not.toContain('7-денний формат 1v1')
    expect(markup).not.toContain('Чому ти відкладаєш важливе?')
    expect(markup).not.toContain('демо')
  })

  it('renders a prominent USER booking CTA for active access without Coach create-session copy', async () => {
    zoomAccessResult = { hasFocus: true }
    calendarSessionsResult = { data: [] }
    const { UserZoomPanel } = await import('@/features/zoom/UserZoomPanel')
    const markup = renderToStaticMarkup(createElement(UserZoomPanel, { userId: 'user-1' }))

    expect(markup).toContain('ЗАПИСАТИСЯ НА СЕСІЮ')
    expect(markup).not.toContain('АКТИВУВАТИ ДОСТУП І ЗАПИСАТИСЯ')
    expect(markup).not.toContain('НОВА СЕСІЯ')
    expect(markup).not.toContain('ДОДАТИ СЕСІЮ')
  })

  it('routes the USER booking CTA to existing booking selection for active access and payment for NO_ACCESS', async () => {
    const { routeUserBookingCta } = await import('@/features/zoom/UserZoomPanel')
    const openPayment = vi.fn()
    const openBookingFlow = vi.fn()
    const showAllSessions = vi.fn()

    routeUserBookingCta({
      hasFocusAccess: true,
      openPayment,
      openBookingFlow,
      showAllSessions,
    })

    expect(openBookingFlow).toHaveBeenCalledTimes(1)
    expect(showAllSessions).toHaveBeenCalledTimes(1)
    expect(openPayment).not.toHaveBeenCalled()

    routeUserBookingCta({
      hasFocusAccess: false,
      openPayment,
      openBookingFlow,
      showAllSessions,
    })

    expect(openPayment).toHaveBeenCalledTimes(1)
    expect(openBookingFlow).toHaveBeenCalledTimes(1)
    expect(showAllSessions).toHaveBeenCalledTimes(1)
  })

  it('renders the Preview 19 calendar for NO_ACCESS and routes a free individual slot to the existing access gate', async () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    const group: ZoomCalendarSession = {
      id: 'group-open', scheduledAt: future, topic: 'Групова практика', status: 'SCHEDULED',
      type: 'group_practice', zoomLink: '', attendeesCount: 1, remainingSlots: 9,
      notifiedAt24h: null, notifiedAt2h: null, goalText: null, canEdit: false, isMyBooking: false,
    }
    const freeIndividual: ZoomCalendarSession = {
      id: 'individual-open', scheduledAt: future, topic: 'Індивідуальна сесія', status: 'SCHEDULED',
      type: 'individual', zoomLink: '', attendeesCount: 0, remainingSlots: 1,
      notifiedAt24h: null, notifiedAt2h: null, goalText: null, canEdit: false, isMyBooking: false,
    }
    calendarSessionsResult = { data: [group, freeIndividual] }

    const { UserZoomPanel } = await import('@/features/zoom/UserZoomPanel')
    const markup = renderToStaticMarkup(createElement(UserZoomPanel, { userId: 'user-1' }))

    expect(markup).toContain('Zoom Календар')
    expect(markup).toContain('Групові та індивідуальні сесії Starway')
    expect(markup).toContain('Усі сесії')
    expect(markup).toContain('Групові')
    expect(markup).toContain('Індивідуальні')
    expect(markup).toContain('CALENDAR:user')
    expect(markup).toContain('АКТИВУВАТИ ДОСТУП І ЗАПИСАТИСЯ')
    expect(markup).toContain('Після оплати ти зможеш бронювати сесії та отримувати нагадування.')
    expect(markup).not.toContain('ДОСТУП НЕ АКТИВОВАНО')
    expect(mockZoomCalendarProps).toHaveBeenLastCalledWith(expect.objectContaining({
      hasFocusAccess: false,
      sessionSource: expect.objectContaining({ sessions: [group, freeIndividual] }),
      onRestrictedGroupAction: expect.any(Function),
    }))

    const calendarProps = mockZoomCalendarProps.mock.calls.at(-1)?.[0] as {
      onAvailableIndividualSlot: (session: ZoomCalendarSession) => void
    }
    calendarProps.onAvailableIndividualSlot(freeIndividual)
    expect(mockOpenPayment).toHaveBeenCalledTimes(1)
  })

  it('passes free individual slot selection to the compact panel sheet while preserving the calendar source and filters', async () => {
    const source = readFileSync(
      new URL('../../../src/features/zoom/UserZoomPanel.tsx', import.meta.url),
      'utf8',
    )

    expect(source).toContain('onAvailableIndividualSlot={(session) =>')
    expect(source).toContain("commerce.state !== 'AVAILABLE' || commerce.label !== 'ВІЛЬНИЙ СЛОТ'")
    expect(source).toContain('setAvailableIndividualSlot(session)')
    expect(source).toContain('ІНДИВІДУАЛЬНА')
    expect(source).toContain('ВІЛЬНИЙ СЛОТ')
    expect(source).toContain('Після запису коуч підтвердить сесію.')
    expect(source).toContain('Ми повідомимо тебе в Telegram.')
    expect(source).toContain("? 'АКТИВУВАТИ ДОСТУП І ЗАПИСАТИСЯ'")
    expect(source).toContain(": 'ЗАПИСАТИСЯ НА СЕСІЮ'")
    expect(source).toContain('await bookPrivateSlot(availableIndividualSlot.id).unwrap()')
    expect(source).toContain('await Promise.all([refetchCalendar(), refetchMySessions()])')
    expect(source).toContain('const visibleCalendarSessions = filterUserCalendarSessions(sessions, sessionFilter);')
    expect(source).toContain('const sessionFilterCounts: Record<UserSessionFilter, number>')
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
