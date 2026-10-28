import { readFileSync } from 'node:fs'
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ZoomCalendarSession,
} from '@/features/zoom/zoom.types'
import type {
  ZoomMySessionsResponse,
  ZoomSessionWithAttendance,
} from '@/features/zoom/types/zoom.types'
import { getSessionDateLabel } from '@/features/zoom/zoom.utils'
import { fmtDateTime } from '@/features/zoom/utils/userPanelPresentation'

const mockUseGetCalendarSessionsQuery = vi.fn()
const mockUseGetIndividualAvailabilityQuery = vi.fn()
const mockUseGetIndividualAvailabilitySummaryQuery = vi.fn()
const mockZoomCalendarProps = vi.fn()
let calendarSessionsResult: {
  data?: ZoomCalendarSession[]
  currentData?: ZoomCalendarSession[]
  isUninitialized?: boolean
  isLoading?: boolean
  isSuccess?: boolean
  isError?: boolean
  error?: { status?: number | string }
} = { data: [] }
let mySessionsResult: { data: ZoomMySessionsResponse } = {
  data: {
    sessions: [],
    previousSessionRecap: null,
    latestWeeklyReport: null,
  },
}
let zoomAccessResult: {
  hasFocus: boolean
  state?: 'NO_ACCESS' | 'FOCUS_ACTIVE' | 'FREE_WEEK1' | 'PREMIUM'
} = { hasFocus: false }
const mockOpenPayment = vi.fn()

function createSessionsViewModel({
  activeSessionsTab,
  sessions = [],
  sessionHistoryLoadFailed = false,
}: {
  activeSessionsTab: 'all' | 'group' | 'individual' | 'mine'
  sessions?: ZoomCalendarSession[]
  sessionHistoryLoadFailed?: boolean
}) {
  const setActiveSessionsTab = vi.fn()
  const setMySessionsFilter = vi.fn()
  const setRequestedUserSession = vi.fn()
  const setCreateAction = vi.fn()
  const model = {
    userId: 'user-1',
    zoomAccess: { hasFocus: true },
    activeTab: 'sessions',
    activeSessionsTab,
    setActiveSessionsTab,
    mySessionsFilter: 'upcoming',
    setMySessionsFilter,
    monthStart: '2026-10-01T00:00:00.000Z',
    monthEnd: '2026-10-31T23:59:59.000Z',
    requestedUserSession: null,
    setRequestedUserSession,
    openPayment: vi.fn(),
    visibleCalendarSessions: sessions,
    mySessionsPresentation: {
      sessions,
      counts: { upcoming: sessions.length, past: 0, cancelled: 0 },
      emptyMessage: 'Немає майбутніх сесій.',
    },
    myCalendarSessions: sessions,
    sessionHistoryLoadFailed,
    handleBookingCta: vi.fn(),
    createAction: null,
    setCreateAction,
  }
  return { model, setActiveSessionsTab, setMySessionsFilter, setRequestedUserSession, setCreateAction }
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
  it('formats the individual-session description in Kyiv time, independent of the browser timezone', () => {
    expect(fmtDateTime('2026-10-24T12:15:00.000Z')).toBe('24.10 · 15:15 (час за Києвом)')
  })

  it('formats the USER session header in Kyiv time to match its description', () => {
    const dateSpy = vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation((_, options) => {
      if (options?.timeZone !== 'Europe/Kyiv') return 'пʼятниця'
      return options.weekday === 'long' ? 'субота' : 'жовтня'
    })
    const timeSpy = vi.spyOn(Date.prototype, 'toLocaleTimeString').mockImplementation((_, options) =>
      options?.timeZone === 'Europe/Kyiv' ? '15:15' : '14:15'
    )

    try {
      expect(getSessionDateLabel('2026-10-24T12:15:00.000Z')).toBe('Субота, 24 жовтня · 15:15 (час за Києвом)')
    } finally {
      dateSpy.mockRestore()
      timeSpy.mockRestore()
    }
  })

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

  it('keeps the USER calendar query window stable across pending rerenders on the same local day', async () => {
    const { retainUserCalendarQueryWindow } = await import('@/features/zoom/UserZoomPanel')
    const first = retainUserCalendarQueryWindow(
      null,
      new Date('2026-10-26T14:58:12.806Z'),
    )
    const duringPendingRerender = retainUserCalendarQueryWindow(
      first,
      new Date('2026-10-26T14:58:12.884Z'),
    )
    const nextLocalDay = retainUserCalendarQueryWindow(
      first,
      new Date('2026-10-27T00:00:00.000Z'),
    )

    expect(duringPendingRerender).toBe(first)
    expect(duringPendingRerender.monthEnd).toBe(first.monthEnd)
    expect(nextLocalDay).not.toBe(first)
  })

  it('filters the calendar source through the shared ALL, GROUP, and INDIVIDUAL state contract', async () => {
    const { filterUserCalendarSessions } = await import('@/features/zoom/UserZoomPanel')
    const sessions = [
      { id: 'group', type: 'GROUP' },
      { id: 'group-practice', type: 'group_practice' },
      { id: 'individual', type: 'INDIVIDUAL', isMyBooking: true },
      { id: 'private', type: 'PRIVATE', commerceRequestId: 'my-request', commerceStatus: 'REQUESTED' },
      { id: 'free-future', type: 'individual', scheduledAt: '2099-10-10T10:00:00Z' },
      { id: 'free-past', type: 'private', scheduledAt: '2020-10-10T10:00:00Z' },
      { id: 'someone-elses-session', type: 'individual', attendeesCount: 1, remainingSlots: 0 },
      { id: 'cancelled-commitment', type: 'individual', commerceRequestId: 'cancelled-request', commerceStatus: 'CANCELLED' },
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

  it('keeps My sessions directly above the calendar without a competing format navigation group', async () => {
    const { UserSessionsView } = await import('@/features/zoom/components/user/UserSessionsView')
    const personalSession = {
      id: 'my-requested-session',
      scheduledAt: '2099-10-19T17:00:00.000Z',
      topic: 'Моя індивідуальна сесія',
      status: 'SCHEDULED',
      type: 'individual',
      zoomLink: '',
      attendeesCount: 1,
      isMyBooking: true,
      canEdit: false,
    } as ZoomCalendarSession
    const calendar = createSessionsViewModel({ activeSessionsTab: 'all', sessions: [personalSession] })
    const calendarMarkup = renderToStaticMarkup(createElement(UserSessionsView, { model: calendar.model as never }))

    expect(calendarMarkup).toContain('CALENDAR:user')
    expect(calendarMarkup).toContain('data-user-my-session-row="compact"')
    expect(calendarMarkup).toContain('Мої сесії')
    expect(calendarMarkup).toContain('Майбутні')
    expect(calendarMarkup).toContain('Минулі')
    expect(calendarMarkup).toContain('Скасовані')
    expect(calendarMarkup).not.toContain('УСІ СЕСІЇ')
    expect(calendarMarkup).not.toContain('ГРУПОВІ')
    expect(calendarMarkup).not.toContain('ІНДИВІДУАЛЬНІ')
    expect(calendarMarkup.indexOf('Мої сесії')).toBeLessThan(calendarMarkup.indexOf('CALENDAR:user'))
  })

  it('uses the existing primary booking CTA in the My sessions header', async () => {
    const { UserSessionsView } = await import('@/features/zoom/components/user/UserSessionsView')
    const calendar = createSessionsViewModel({ activeSessionsTab: 'all' })
    const calendarMarkup = renderToStaticMarkup(createElement(UserSessionsView, { model: calendar.model as never }))
    const tree = UserSessionsView({ model: calendar.model as never }) as ReactElement<{ children: ReactElement[] }>
    const historyCard = tree.props.children[0] as ReactElement<{ children: ReactElement[] }>
    const header = historyCard.props.children[0] as ReactElement<{ children: ReactElement[] }>
    const bookingButton = header.props.children[1] as ReactElement<Record<string, unknown>>

    expect(calendarMarkup).toContain('data-user-booking-cta="primary"')
    expect(calendarMarkup).toContain('ЗАПИСАТИСЯ НА СЕСІЮ')
    expect(calendarMarkup).not.toContain('data-user-booking-cta="plus"')

    ;(bookingButton.props.onClick as () => void)()
    expect(calendar.model.handleBookingCta).toHaveBeenCalledTimes(1)
  })

  it('keeps the USER calendar above the fixed Mini App navigation', () => {
    const routeSource = readFileSync(
      new URL('../../../src/features/zoom/routes/MiniAppCalendarRoute.tsx', import.meta.url),
      'utf8',
    )

    expect(routeSource).toContain('mx-auto w-full max-w-6xl px-4 py-4 pb-28')
  })

  it('opens individual availability, not the generic format menu, for an unavailable expired request', async () => {
    const { UserSessionsView } = await import('@/features/zoom/components/user/UserSessionsView')
    const calendar = createSessionsViewModel({ activeSessionsTab: 'all' })
    renderToStaticMarkup(createElement(UserSessionsView, { model: calendar.model as never }))

    const calendarProps = mockZoomCalendarProps.mock.calls.at(-1)?.[0] as {
      onFindAvailableSlots: () => void
    }
    calendarProps.onFindAvailableSlots()

    expect(calendar.setActiveSessionsTab).toHaveBeenCalledWith('all')
    expect(calendar.setCreateAction).toHaveBeenCalledWith('individual')
    expect(calendar.model.handleBookingCta).not.toHaveBeenCalled()
  })

  it('derives My sessions counts and a tab-specific empty state from the selected filter', async () => {
    const { getMySessionsFilterPresentation } = await import('@/features/zoom/UserZoomPanel')
    const now = new Date('2026-10-03T12:00:00.000Z')
    const sessions = [
      { id: 'upcoming', scheduledAt: '2026-10-04T12:00:00.000Z', isMyBooking: true },
      { id: 'past', scheduledAt: '2026-10-02T12:00:00.000Z', isMyPendingPayment: true },
      { id: 'cancelled', scheduledAt: '2026-10-04T12:00:00.000Z', commerceRequestId: 'cancelled-request', commerceStatus: 'CANCELLED' },
      { id: 'expired-slot-cancelled-later', scheduledAt: '2026-10-02T12:00:00.000Z', status: 'CANCELLED', commerceRequestId: 'expired-request', commerceStatus: 'EXPIRED' },
      { id: 'free-future', type: 'individual', scheduledAt: '2026-10-04T12:00:00.000Z' },
      { id: 'free-past', type: 'individual', scheduledAt: '2026-10-02T12:00:00.000Z' },
    ] as ZoomCalendarSession[]

    const upcoming = getMySessionsFilterPresentation(sessions, 'upcoming', now)
    const past = getMySessionsFilterPresentation(sessions, 'past', now)
    const cancelled = getMySessionsFilterPresentation(sessions, 'cancelled', now)

    expect(upcoming.counts).toEqual({ upcoming: 1, past: 2, cancelled: 1 })
    expect(upcoming.sessions.map(({ id }) => id)).toEqual(['upcoming'])
    expect(past.sessions.map(({ id }) => id)).toEqual(['past', 'expired-slot-cancelled-later'])
    expect(cancelled.sessions.map(({ id }) => id)).toEqual(['cancelled'])
    expect(upcoming.emptyMessage).toBe('Немає майбутніх сесій.')
    expect(past.emptyMessage).toBe('Немає минулих сесій.')
    expect(cancelled.emptyMessage).toBe('Немає скасованих сесій.')
  })

  it('renders an enrolled future rescheduled Group Practice in Upcoming with its current and prior time', async () => {
    const { UserSessionsView } = await import('@/features/zoom/components/user/UserSessionsView')
    const { buildGoogleCalendarTemplateUrl } = await import('@/features/zoom/utils/calendar-event')
    const session = {
      id: 'rescheduled-group',
      scheduledAt: '2099-11-09T18:00:00.000Z',
      previousScheduledAt: '2099-11-02T18:00:00.000Z',
      topic: 'ФОКУС · Zoom-практика',
      status: 'SCHEDULED' as const,
      type: 'group_practice' as const,
      zoomLink: '',
      isMyBooking: true,
      canEdit: false,
    }
    const calendar = createSessionsViewModel({ activeSessionsTab: 'mine', sessions: [session] })
    const markup = renderToStaticMarkup(createElement(UserSessionsView, { model: calendar.model as never }))
    const upcoming = (await import('@/features/zoom/utils/userPanelPresentation')).getMySessionsFilterPresentation(
      [session], 'upcoming', new Date('2099-11-01T00:00:00.000Z'),
    )
    const cancelled = (await import('@/features/zoom/utils/userPanelPresentation')).getMySessionsFilterPresentation(
      [session], 'cancelled', new Date('2099-11-01T00:00:00.000Z'),
    )
    const calendarUrl = buildGoogleCalendarTemplateUrl(session, new Date('2099-11-01T00:00:00.000Z'))

    expect(markup).toContain('ПЕРЕНЕСЕНО')
    expect(markup).toContain(`Було: ${fmtDateTime(session.previousScheduledAt)}`)
    expect(markup).toContain(fmtDateTime(session.scheduledAt))
    expect(markup).toContain('ВИ ЗАПИСАНІ')
    expect(upcoming.sessions.map(({ id }) => id)).toEqual(['rescheduled-group'])
    expect(cancelled.sessions).toEqual([])
    expect(new URL(calendarUrl ?? '').searchParams.get('dates')).toContain('20991109T180000Z')
    expect(new URL(calendarUrl ?? '').searchParams.get('dates')).not.toContain('20991102T180000Z')
  })

  it('keeps every owned cancelled commerce DTO in USER history regardless of session status', async () => {
    const {
      getMySessionsFilterPresentation,
      mergeUserSessionHistoryEntries,
    } = await import('@/features/zoom/utils/userPanelPresentation')
    const calendarResponse = [
      {
        id: 'session-cancelled', scheduledAt: '2026-10-07T08:00:00.000Z', topic: 'Запит 1',
        status: 'CANCELLED', type: 'individual', zoomLink: '', canEdit: false,
        commerceRequestId: '468b9f94-owned', commerceStatus: 'CANCELLED',
      },
      {
        id: 'session-scheduled-a', scheduledAt: '2026-10-17T14:00:00.000Z', topic: 'Запит 2',
        status: 'SCHEDULED', type: 'individual', zoomLink: '', canEdit: false,
        commerceRequestId: 'ded5b039-owned', commerceStatus: 'CANCELLED',
      },
      {
        id: 'session-scheduled-b', scheduledAt: '2026-10-24T12:15:00.000Z', topic: 'Запит 3',
        status: 'SCHEDULED', type: 'individual', zoomLink: '', canEdit: false,
        commerceRequestId: '6ee1c946-owned', commerceStatus: 'CANCELLED',
      },
      {
        id: 'foreign-cancelled-session', scheduledAt: '2026-10-25T12:15:00.000Z', topic: 'Чужий запис',
        status: 'CANCELLED', type: 'individual', zoomLink: '', canEdit: false,
        commerceRequestId: null, commerceStatus: 'CANCELLED',
      },
    ] satisfies ZoomCalendarSession[]

    const merged = mergeUserSessionHistoryEntries([], calendarResponse)
    const cancelled = getMySessionsFilterPresentation(
      merged,
      'cancelled',
      new Date('2026-10-01T00:00:00.000Z'),
    )

    expect(merged.map(({ commerceRequestId }) => commerceRequestId)).toEqual([
      '468b9f94-owned',
      'ded5b039-owned',
      '6ee1c946-owned',
    ])
    expect(cancelled.counts.cancelled).toBe(3)
    expect(cancelled.sessions.map(({ commerceRequestId }) => commerceRequestId)).toEqual([
      '468b9f94-owned',
      'ded5b039-owned',
      '6ee1c946-owned',
    ])
  })

  it('keeps registered history when the calendar DTO only supplies commerce commitments', async () => {
    calendarSessionsResult = {
      data: [{
        id: 'cancelled-request',
        scheduledAt: '2026-10-02T12:00:00.000Z',
        topic: 'Скасований запит',
        status: 'SCHEDULED',
        type: 'individual',
        commerceRequestId: 'request-1',
        commerceStatus: 'CANCELLED',
        zoomLink: '',
      }],
    }
    mySessionsResult = {
      data: {
        sessions: [
          {
            id: 'past-practice',
            scheduledAt: '2026-10-12T16:00:00.000Z',
            topic: 'Минула практика',
            status: 'SCHEDULED',
            type: 'GROUP',
            requests: [],
            postSessionReport: null,
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-01T00:00:00.000Z',
            isRegistered: true,
          },
          {
            id: 'future-practice',
            scheduledAt: '2099-10-26T17:00:00.000Z',
            topic: 'Зареєстрована практика',
            status: 'SCHEDULED',
            type: 'GROUP',
            requests: [],
            postSessionReport: null,
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-01T00:00:00.000Z',
            isRegistered: true,
          },
          {
            id: 'zoom-booking-cancelled:attendee-1',
            scheduledAt: '2026-10-05T16:00:00.000Z',
            topic: 'Скасована групова практика',
            status: 'CANCELLED',
            type: 'GROUP',
            requests: [],
            postSessionReport: null,
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-01T00:00:00.000Z',
            isRegistered: true,
            attendeeId: 'attendee-1',
          },
        ],
        previousSessionRecap: null,
        latestWeeklyReport: null,
      },
    }
    zoomAccessResult = { hasFocus: true, state: 'FOCUS_ACTIVE' }

    const { UserZoomPanel } = await import('@/features/zoom/UserZoomPanel')
    const markup = renderToStaticMarkup(createElement(UserZoomPanel, { userId: 'user-1' }))

    expect(markup).toContain('Зареєстрована практика')
    expect(markup).toContain('Групова практика')
    expect(markup).toMatch(/Майбутні<\/span><span[^>]*>1<\/span>/)
    expect(markup).toMatch(/Минулі<\/span><span[^>]*>1<\/span>/)
    expect(markup).toMatch(/Скасовані<\/span><span[^>]*>2<\/span>/)
  })

  it('merges attendee-owned history fields with calendar-owned commerce for the same session id', async () => {
    const { mergeUserSessionHistoryEntries } = await import('@/features/zoom/utils/userPanelPresentation')
    const mySession = {
      id: 'same-session',
      scheduledAt: '2026-10-12T17:00:00.000Z',
      topic: 'Групова практика',
      status: 'SCHEDULED' as const,
      type: 'GROUP' as const,
      requests: [],
      postSessionReport: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      isRegistered: true,
      myQuestion: { text: 'Моє запитання', position: 1 },
    }
    const calendarCommitment: ZoomCalendarSession = {
      id: 'same-session',
      scheduledAt: '2026-10-12T17:00:00.000Z',
      topic: 'Групова практика',
      status: 'SCHEDULED',
      type: 'group_practice',
      zoomLink: '',
      attendeesCount: 1,
      canEdit: false,
      commerceRequestId: 'request-1',
      commerceStatus: 'EXPIRED',
    }

    const [merged] = mergeUserSessionHistoryEntries([mySession], [calendarCommitment])
    expect(merged.isMyBooking).toBe(true)
    expect(merged.myQuestion).toEqual({ text: 'Моє запитання', position: 1 })
    expect(merged.commerceStatus).toBe('EXPIRED')
  })

  it('does not represent a dual history-read failure as an empty calendar', async () => {
    const { UserSessionsView } = await import('@/features/zoom/components/user/UserSessionsView')
    const { model } = createSessionsViewModel({ activeSessionsTab: 'all', sessionHistoryLoadFailed: true })

    const markup = renderToStaticMarkup(createElement(UserSessionsView, { model: model as never }))

    expect(markup).toContain('Не вдалося завантажити історію сесій. Спробуйте ще раз.')
    expect(markup).not.toContain('Немає майбутніх сесій.')
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

  it('uses the canonical centered USER booking modal above navigation with a visual-viewport scroll area', () => {
    const source = readFileSync(
      new URL('../../../src/features/zoom/components/user/UserCreateModal.tsx', import.meta.url),
      'utf8',
    )

    expect(source).toContain("import { BaseModal } from '@/features/modals/BaseModal'")
    expect(source).toContain('<BaseModal')
    expect(source).toContain('isOpen')
    expect(source).toContain('fitVisualViewport')
    expect(source).toContain('containerClassName="z-[1000] px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"')
    expect(source).toContain('max-h-full w-full max-w-lg flex-col overflow-hidden')
    expect(source).toContain('min-h-0 flex-1 overflow-y-auto overscroll-contain')
    expect(source).toContain('btn-liquid-primary sticky bottom-0 z-10 w-full')
    expect(source).not.toContain('flex items-end justify-center')
  })

  it('renders a progressive individual booking calendar with canonical availability slots', () => {
    const modelSource = readFileSync(
      new URL('../../../src/features/zoom/UserZoomPanel.tsx', import.meta.url),
      'utf8',
    )
    const individualModal = readFileSync(
      new URL('../../../src/features/zoom/components/user/UserCreateModal.tsx', import.meta.url),
      'utf8',
    )
    const presentationSource = readFileSync(
      new URL('../../../src/features/zoom/utils/userPanelPresentation.ts', import.meta.url),
      'utf8',
    )

    expect(modelSource).toContain('useGetIndividualAvailabilityQuery(individualDate')
    expect(modelSource).toContain('useGetIndividualAvailabilitySummaryQuery')
    expect(modelSource).toContain("from: toLocalDateKey(individualCalendarStart)")
    expect(modelSource).toContain("setIndividualTime('');")
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
    expect(modelSource).toContain('hasOnlyBusyIndividualSlots')
    expect(modelSource).toContain('individualAvailability.length > 0')
    expect(modelSource).toContain('individualAvailability.every((slot) => !slot.available)')
    expect(individualModal).toContain('Коуч ще не відкрив доступні години на цю дату.')
    expect(individualModal).toContain('На цю дату всі індивідуальні слоти зайняті.')
    expect(individualModal).toContain('Не вдалося завантажити доступний час.')
    expect(individualModal).toContain('Повторити')
    expect(individualModal).toContain('aria-label="Доступний час"')
    expect(individualModal).toContain('ЗАПИС НА ІНДИВІДУАЛЬНУ СЕСІЮ')
    expect(individualModal).toContain('60 хв')
    expect(individualModal).toContain('selectedIndividualSlot?.available &&')
    expect(individualModal).toContain('Продовжити')
    expect(individualModal).toContain('individualQuestionValidationError')
    expect(presentationSource).toContain('Опиши запит кількома словами, щоб коуч розумів, з чим ти приходиш.')
    expect(individualModal).toContain('Групова практика')
    expect(individualModal).toContain('✓ ВАШ ЗАПИС')
    expect(individualModal).not.toContain('violet')
    expect(modelSource).toContain("if (backendCode === 'COMMERCE_SLOT_UNAVAILABLE')")
    expect(modelSource).toContain('void refetchIndividualAvailability()')
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
    expect(markup).not.toContain('УСІ СЕСІЇ')
    expect(markup).not.toContain('ГРУПОВІ')
    expect(markup).not.toContain('ІНДИВІДУАЛЬНІ')
    expect(markup).not.toContain('МОЇ СЕСІЇ')
    expect(markup).toContain('Майбутні')
    expect(markup).toContain('Немає майбутніх сесій.')
    expect(markup).toContain('АКТИВУВАТИ ДОСТУП І ЗАПИСАТИСЯ')
    const historyIndex = markup.indexOf('Мої сесії')
    const calendarIndex = markup.indexOf('CALENDAR:user')
    expect(calendarIndex).toBeGreaterThan(historyIndex)
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

  it('keeps the server-filtered trial practice bookable without presenting PREMIUM as full FOCUS', async () => {
    zoomAccessResult = { hasFocus: false, state: 'PREMIUM' }
    const trialPractice: ZoomCalendarSession = {
      id: 'trial-monday-practice',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      topic: 'Групова практика',
      status: 'SCHEDULED',
      type: 'group_practice',
      zoomLink: '',
      attendeesCount: 0,
      remainingSlots: 10,
      notifiedAt24h: null,
      notifiedAt2h: null,
      goalText: null,
      canEdit: false,
      isMyBooking: false,
    }
    calendarSessionsResult = { data: [trialPractice] }
    const { UserZoomPanel } = await import('@/features/zoom/UserZoomPanel')
    const markup = renderToStaticMarkup(createElement(UserZoomPanel, { userId: 'user-1' }))

    expect(markup).not.toContain('АКТИВУВАТИ ДОСТУП І ЗАПИСАТИСЯ')
    expect(mockZoomCalendarProps).toHaveBeenLastCalledWith(expect.objectContaining({
      hasFocusAccess: true,
      sessionSource: expect.objectContaining({ sessions: [trialPractice] }),
    }))
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
    expect(markup).not.toContain('УСІ СЕСІЇ')
    expect(markup).not.toContain('ГРУПОВІ')
    expect(markup).not.toContain('ІНДИВІДУАЛЬНІ')
    expect(markup).toContain('CALENDAR:user')
    expect(markup).toContain('АКТИВУВАТИ ДОСТУП І ЗАПИСАТИСЯ')
    expect(markup).toContain('Після оплати ти зможеш бронювати сесії та отримувати нагадування.')
    expect(markup).not.toContain('ДОСТУП НЕ АКТИВОВАНО')
    expect(mockZoomCalendarProps).toHaveBeenLastCalledWith(expect.objectContaining({
      hasFocusAccess: false,
      sessionSource: expect.objectContaining({ sessions: [group] }),
      onRestrictedGroupAction: expect.any(Function),
    }))

    const calendarProps = mockZoomCalendarProps.mock.calls.at(-1)?.[0] as {
      onFindAvailableSlots: () => void
    }
    calendarProps.onFindAvailableSlots()
    expect(mockOpenPayment).toHaveBeenCalledTimes(1)
  })

  it('keeps free inventory exclusively in the existing date/time booking flow', () => {
    const modelSource = readFileSync(new URL('../../../src/features/zoom/UserZoomPanel.tsx', import.meta.url), 'utf8')
    const modalSource = readFileSync(new URL('../../../src/features/zoom/components/user/UserCreateModal.tsx', import.meta.url), 'utf8')
    expect(modelSource).not.toContain('setAvailableIndividualSlot(session)')
    expect(modelSource).not.toContain('bookPrivateSlot(availableIndividualSlot.id)')
    expect(modalSource).toContain('individualAvailability.map((slot)')
    expect(modalSource).toContain('setIndividualTime(slot.scheduledAt)')
    expect(modalSource).toContain('selectedIndividualSlot?.available')
    expect(modalSource).toContain('handleIndividualRequest()')
    expect(modelSource).toContain("const [activeSessionsTab, setActiveSessionsTab] = useState<UserSessionsTab>('all');")
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
      sessionSource: expect.objectContaining({ sessions: calendarSessionsResult.data ?? [] }),
    }))
  })
})
