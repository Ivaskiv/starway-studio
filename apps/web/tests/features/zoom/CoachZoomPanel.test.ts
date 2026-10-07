import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
})

type CalendarQueryArgs = {
  from: string
  to: string
  role: 'coach' | 'user'
  userId: string
  expertId?: string
}

type CalendarQueryOptions = {
  pollingInterval?: number
  refetchOnMountOrArgChange?: boolean
}

let calendarQueryCalls: Array<{
  args: CalendarQueryArgs
  options: CalendarQueryOptions
}> = []
let calendarSessions: Array<{
  id: string
  scheduledAt: string
  topic: string
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  type: string
  zoomLink: string
  attendeesCount?: number
  remainingSlots?: number
  participantNames?: string[]
  challengerName?: string | null
  opponentName?: string | null
  goalText?: string | null
  goalA?: string | null
  goalB?: string | null
  questionPreviews?: string[]
  battleProgress?: Array<{ day: number; text: string; createdAt: string }>
  progressA?: number
  progressB?: number
  battleStatus?: 'pending' | 'active' | 'completed' | 'cancelled' | null
  canEdit: boolean
  priceCents?: number
  actualAttendeeCount?: number
  outcomeTopic?: string | null
  summary?: string | null
  recordingUrl?: string | null
  recordingAvailable?: boolean
  canViewRecording?: boolean
  commerceStatus?: 'REQUESTED' | 'APPROVED_PENDING_PAYMENT' | 'PAID' | 'REJECTED' | 'EXPIRED' | 'CANCELLED'
  commerceLabel?: string | null
}> = []
let availabilityWeek: Array<{
  date: string
  source: 'recurring' | 'override'
  hasOverride: boolean
  windows: Array<{ id: string; dayOfWeek: number; hour: number; minute: number; endHour: number; endMinute: number; timezone: string; sessionType: string; maxSlots: number; priceCents: number; durationMinutes: number; active: boolean }>
}> = []
let attendeesBySessionId: Record<string, Array<{
  id: string
  sessionId: string
  userId: string
  attended: boolean
  createdAt: string
  user?: {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
  }
}>> = {}

vi.mock('../../../src/features/zoom/zoom.api', () => ({
  useGetCalendarSessionsQuery: (args: CalendarQueryArgs, options: CalendarQueryOptions) => {
    calendarQueryCalls.push({ args, options })
    return { data: calendarSessions }
  },
  useGetAvailabilityWeekQuery: () => ({ data: availabilityWeek }),
  useGetCoachParticipantsQuery: () => ({ data: { summary: { activeFocusCount: 0, newThisWeekCount: 0 }, participants: [] }, isLoading: false, isError: false }),
  useFinalizeBattleMutation: () => [vi.fn()],
  useApproveZoomCommerceRequestMutation: () => [vi.fn(), { isLoading: false }],
  useCancelZoomSessionMutation: () => [vi.fn(() => ({ unwrap: vi.fn() })), { isLoading: false }],
  useRejectZoomCommerceRequestMutation: () => [vi.fn(), { isLoading: false }],
  useCreateZoomSessionMutation: () => [vi.fn(() => ({ unwrap: vi.fn() })), { isLoading: false }],
  useUpdateZoomSessionMutation: () => [vi.fn(() => ({ unwrap: vi.fn() })), { isLoading: false }],
  useBookSlotMutation: () => [vi.fn(), { isLoading: false }],
  useUnbookSlotMutation: () => [vi.fn(), { isLoading: false }],
  useBookPrivateSlotMutation: () => [vi.fn(), { isLoading: false }],
  useCancelPrivateBookingMutation: () => [vi.fn(), { isLoading: false }],
  useCreateSwapRequestMutation: () => [vi.fn(), { isLoading: false }],
}))

vi.mock('../../../src/features/zoom/services/zoom.api', () => ({
  useGetAttendeesQuery: (sessionId: string) => ({
    data: attendeesBySessionId[sessionId] ?? [],
    isFetching: false,
    refetch: vi.fn(),
  }),
  useMarkAttendedMutation: () => [vi.fn(), { isLoading: false }],
}))

vi.mock('../../../src/features/admin/services/ownership.api', () => ({
  useGetUsersQuery: () => ({ data: [] }),
}))

vi.mock('../../../src/app/hooks', () => ({
  useAppSelector: (selector: (state: { auth: { user: { role: string; activeRole?: string } } }) => unknown) =>
    selector({ auth: { user: { role: 'EXPERT', activeRole: 'EXPERT' } } }),
}))

function renderPanel(activeScreen: 'calendar' | 'battle' = 'calendar') {
  return renderToStaticMarkup(createElement(CoachZoomPanel, { expertId: 'expert-1', activeScreen }))
}

async function loadPanel() {
  return import('../../../src/features/zoom/CoachZoomPanel')
}

let CoachZoomPanel: typeof import('../../../src/features/zoom/CoachZoomPanel').CoachZoomPanel
let getCoachSessionInitialValues: typeof import('../../../src/features/zoom/CoachZoomPanel').getCoachSessionInitialValues

describe('CoachZoomPanel', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-08T12:00:00.000Z'))
    calendarQueryCalls = []
    calendarSessions = []
    availabilityWeek = [
      { date: '2026-09-07', source: 'recurring', hasOverride: false, windows: [
        { id: 'mon-day', dayOfWeek: 1, hour: 9, minute: 0, endHour: 16, endMinute: 0, timezone: 'Europe/Kyiv', sessionType: 'individual', maxSlots: 1, priceCents: 0, durationMinutes: 60, active: true },
        { id: 'mon-evening', dayOfWeek: 1, hour: 19, minute: 0, endHour: 20, endMinute: 0, timezone: 'Europe/Kyiv', sessionType: 'individual', maxSlots: 1, priceCents: 0, durationMinutes: 60, active: true },
      ] },
      { date: '2026-09-08', source: 'recurring', hasOverride: false, windows: [{ id: 'tue', dayOfWeek: 2, hour: 9, minute: 0, endHour: 16, endMinute: 0, timezone: 'Europe/Kyiv', sessionType: 'individual', maxSlots: 1, priceCents: 0, durationMinutes: 60, active: true }] },
      { date: '2026-09-09', source: 'recurring', hasOverride: false, windows: [] },
      { date: '2026-09-10', source: 'override', hasOverride: true, windows: [] },
      { date: '2026-09-11', source: 'recurring', hasOverride: false, windows: [] },
      { date: '2026-09-12', source: 'recurring', hasOverride: false, windows: [] },
      { date: '2026-09-13', source: 'recurring', hasOverride: false, windows: [] },
    ]
    attendeesBySessionId = {}
    const module = await loadPanel()
    CoachZoomPanel = module.CoachZoomPanel
    getCoachSessionInitialValues = module.getCoachSessionInitialValues
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the approved compact weekly diary shell without a duplicated Today card', () => {
    calendarSessions = [
      {
        id: 'group-1',
        scheduledAt: '2026-09-07T15:00:00.000Z',
        topic: 'Фокус',
        status: 'COMPLETED',
        type: 'group_practice',
        zoomLink: '',
        attendeesCount: 12,
        remainingSlots: 38,
        canEdit: true,
      },
      {
        id: 'individual-1',
        scheduledAt: '2026-09-08T16:00:00.000Z',
        topic: 'Індивідуальна сесія',
        status: 'SCHEDULED',
        type: 'individual',
        zoomLink: 'https://zoom.us/j/individual',
        participantNames: ['V3'],
        questionPreviews: ['Я готова до змін!'],
        attendeesCount: 1,
        remainingSlots: 0,
        canEdit: true,
        priceCents: 9900,
      },
      {
        id: 'battle-1',
        scheduledAt: '2026-09-08T17:00:00.000Z',
        topic: 'Zoom Battle',
        status: 'ACTIVE',
        type: 'battle_review',
        zoomLink: 'https://zoom.us/j/battle',
        challengerName: 'Vira',
        opponentName: 'V3',
        goalA: 'Перші конвертації',
        battleStatus: 'active',
        progressA: 7,
        progressB: 7,
        canEdit: true,
      },
      {
        id: 'done-1',
        scheduledAt: '2026-09-10T14:00:00.000Z',
        topic: 'Щотижнева сесія балансу',
        status: 'COMPLETED',
        type: 'group_practice',
        zoomLink: '',
        attendeesCount: 2,
        remainingSlots: 48,
        participantNames: ['Vira', 'V3'],
        canEdit: true,
      },
    ]

    const markup = renderPanel()

    expect(markup).toContain('Панель коуча')
    expect(markup).toContain('Vira · Starway Studio')
    expect(markup).toContain('+ НОВА СЕСІЯ')
    expect(markup).toContain('7 – 13 вересня')
    expect(markup).not.toContain('на тиждень')
    expect(markup).not.toContain('немає даних')
    expect(markup).not.toContain('CALENDAR:coach')
    expect(markup).not.toContain('КАЛЕНДАР СЕСІЙ')
    expect(markup).not.toContain('СЕСІЙ / МІСЯЦЬ')
    expect(markup).not.toContain('TOP XP')
    expect(markup).not.toContain('Zoom-посилання')
    expect(markup.match(/>Індивідуальна сесія</g)).toHaveLength(1)
    expect(markup).toContain('КАЛЕНДАР')
    expect(markup).toContain('МОЯ ДОСТУПНІСТЬ')
    expect(markup).not.toContain('ЗВИЧНИЙ ГРАФІК')
    expect(markup).not.toContain('id="participants"')
    expect(markup).not.toContain('id="analytics"')
    expect(markup).not.toContain('id="more"')
  })

  it('renders Mon-Sun order with today marker, past completed sessions, and compact empty days', () => {
    calendarSessions = [
      {
        id: 'monday-completed',
        scheduledAt: '2026-09-07T15:00:00.000Z',
        topic: 'Фокус',
        status: 'COMPLETED',
        type: 'group_practice',
        zoomLink: '',
        attendeesCount: 12,
        remainingSlots: 38,
        canEdit: true,
      },
      {
        id: 'thursday-completed',
        scheduledAt: '2026-09-10T14:00:00.000Z',
        topic: 'Щотижнева сесія балансу',
        status: 'COMPLETED',
        type: 'group_practice',
        zoomLink: '',
        attendeesCount: 2,
        remainingSlots: 48,
        canEdit: true,
      },
    ]

    const markup = renderPanel()
    const monday = markup.indexOf('Пн')
    const tuesday = markup.indexOf('Вт')
    const sunday = markup.indexOf('Нд')

    expect(monday).toBeGreaterThan(-1)
    expect(tuesday).toBeGreaterThan(monday)
    expect(sunday).toBeGreaterThan(tuesday)
    expect(markup).toContain('Сьогодні')
    expect(markup).toContain('Фокус')
    expect(markup).toContain('Щотижнева сесія балансу')
    expect(markup).toContain('На цей день немає запланованих зустрічей')
    expect(markup).toContain('+ НОВА СЕСІЯ')
  })

  it('opens only canonical actions for a future session and protects pending or terminal commitments', async () => {
    const { CoachSessionActions } = await loadPanel()
    const session = {
      id: 'future', scheduledAt: '2026-09-10T08:00:00.000Z', topic: 'Аналіз',
      status: 'SCHEDULED' as const, type: 'individual', zoomLink: '', canEdit: true,
    }
    const renderActions = (patch: Partial<import('../../../src/features/zoom/zoom.types').ZoomCalendarSession> = {}, canManage = true) => renderToStaticMarkup(createElement(CoachSessionActions, {
      session: { ...session, ...patch }, canManage, busy: false, error: null,
      onDetails: vi.fn(), onEdit: vi.fn(), onCancel: vi.fn(), onComplete: vi.fn(), onApprove: vi.fn(), onReject: vi.fn(),
    }))
    const available = renderActions()
    expect(available).toContain('ВІДКРИТИ ДЕТАЛІ')
    expect(available).toContain('ПЕРЕНЕСТИ СЕСІЮ')
    expect(available).toContain('СКАСУВАТИ СЕСІЮ')
    expect(available).not.toContain('ВИДАЛИТИ')
    expect(available).not.toContain('НАГАДАТИ ПРО ОПЛАТУ')
    const requested = renderActions({ commerceRequestId: 'request-1', commerceStatus: 'REQUESTED' })
    expect(requested).toContain('ПІДТВЕРДИТИ ЗАПИТ')
    expect(requested).toContain('ВІДХИЛИТИ ЗАПИТ')
    expect(requested).not.toContain('ПЕРЕНЕСТИ СЕСІЮ')
    const pending = renderActions({ commerceRequestId: 'request-1', commerceStatus: 'APPROVED_PENDING_PAYMENT' })
    expect(pending).not.toContain('РЕДАГУВАТИ ТЕМУ')
    expect(pending).not.toContain('ПЕРЕНЕСТИ СЕСІЮ')
    for (const protectedMarkup of [renderActions({ status: 'CANCELLED' }), renderActions({ status: 'COMPLETED' }), renderActions({}, false)]) {
      expect(protectedMarkup).toContain('ВІДКРИТИ ДЕТАЛІ')
      expect(protectedMarkup).not.toContain('СКАСУВАТИ СЕСІЮ')
      expect(protectedMarkup).not.toContain('ПЕРЕНЕСТИ СЕСІЮ')
    }
  })

  it('renders the coach week as compact effective-availability day cards without inline session actions', () => {
    calendarSessions = [
      {
        id: 'off-day-commitment', scheduledAt: '2026-09-10T08:00:00.000Z', topic: 'Аналіз · Катерина',
        status: 'SCHEDULED', type: 'individual', zoomLink: '', participantNames: ['Катерина'],
        commerceStatus: 'APPROVED_PENDING_PAYMENT', canEdit: true,
      },
    ]

    const markup = renderPanel()

    expect(markup.match(/data-coach-week-day=/g)).toHaveLength(7)
    expect(markup).toContain('09:00–16:00')
    expect(markup).toContain('19:00–20:00')
    expect(markup).toContain('ON')
    expect(markup).toContain('OFF')
    expect(markup).toContain('ВИХІДНИЙ')
    expect(markup).toContain('Аналіз · Катерина')
    expect(markup).toContain('ОЧІКУЄ ОПЛАТИ')
    expect(markup).toContain('На цей день немає запланованих зустрічей')
    expect(markup).toContain('+ НОВА СЕСІЯ')
    expect(markup).not.toContain('Завершити сесію')
    expect(markup).not.toContain('ВІЛЬНИЙ СЛОТ')
  })

  it('renders only meaningful compact status badges', () => {
    calendarSessions = [
      {
        id: 'requested-session',
        scheduledAt: '2026-09-08T15:00:00.000Z',
        topic: 'Індивідуальна сесія',
        status: 'SCHEDULED',
        type: 'individual',
        zoomLink: '',
        participantNames: ['Anna'],
        remainingSlots: 0,
        commerceStatus: 'REQUESTED',
        canEdit: true,
      },
      {
        id: 'free-individual',
        scheduledAt: '2026-09-08T16:00:00.000Z',
        topic: 'Індивідуальна сесія',
        status: 'SCHEDULED',
        type: 'individual',
        zoomLink: '',
        remainingSlots: 1,
        canEdit: true,
      },
      {
        id: 'waiting-payment',
        scheduledAt: '2026-09-08T17:00:00.000Z',
        topic: 'Індивідуальна сесія',
        status: 'SCHEDULED',
        type: 'individual',
        zoomLink: '',
        participantNames: ['Vira'],
        remainingSlots: 0,
        commerceStatus: 'APPROVED_PENDING_PAYMENT',
        commerceLabel: '🟠 Очікує оплати',
        canEdit: true,
      },
      {
        id: 'paid-session',
        scheduledAt: '2026-09-08T18:00:00.000Z',
        topic: 'Індивідуальна сесія',
        status: 'SCHEDULED',
        type: 'individual',
        zoomLink: '',
        participantNames: ['Oksana'],
        remainingSlots: 0,
        commerceStatus: 'PAID',
        canEdit: true,
      },
      {
        id: 'expired-payment',
        scheduledAt: '2026-09-08T19:00:00.000Z',
        topic: 'Індивідуальна сесія',
        status: 'SCHEDULED',
        type: 'individual',
        zoomLink: '',
        participantNames: ['Marta'],
        remainingSlots: 0,
        commerceStatus: 'EXPIRED',
        canEdit: true,
      },
      {
        id: 'cancelled-session',
        scheduledAt: '2026-09-08T20:00:00.000Z',
        topic: 'Індивідуальна сесія',
        status: 'CANCELLED',
        type: 'individual',
        zoomLink: '',
        participantNames: ['Sofia'],
        remainingSlots: 0,
        commerceStatus: 'REQUESTED',
        canEdit: true,
      },
    ]

    const markup = renderPanel()

    expect(markup).toContain('ОЧІКУЄ РІШЕННЯ')
    expect(markup).toContain('ОЧІКУЄ ОПЛАТИ')
    expect(markup).toContain('СКАСОВАНО')
    expect(markup.match(/ОЧІКУЄ РІШЕННЯ/g)).toHaveLength(1)
    expect(markup).not.toContain('ВІЛЬНИЙ СЛОТ')
    expect(markup).not.toContain('ОПЛАЧЕНО')
    expect(markup).not.toContain('ПОТРЕБУЄ ДІЇ')
    expect(markup).not.toContain('Оплату не підтверджено')
    expect(markup).not.toContain('🟠 Очікує оплати')
  })

  it('shows individual participant/topic and battle pair/progress from the same canonical session DTO', () => {
    calendarSessions = [
      {
        id: 'individual-1',
        scheduledAt: '2026-09-08T16:00:00.000Z',
        topic: 'Індивідуальна сесія',
        status: 'SCHEDULED',
        type: 'individual',
        zoomLink: 'https://zoom.us/j/individual',
        participantNames: ['V3'],
        questionPreviews: ['Я готова до змін!'],
        canEdit: true,
      },
      {
        id: 'battle-1',
        scheduledAt: '2026-09-08T17:00:00.000Z',
        topic: 'Zoom Battle',
        status: 'ACTIVE',
        type: 'battle_review',
        zoomLink: 'https://zoom.us/j/battle',
        challengerName: 'Vira',
        opponentName: 'V3',
        goalA: 'Перші конвертації',
        battleStatus: 'active',
        progressA: 7,
        progressB: 7,
        canEdit: true,
      },
    ]

    const markup = renderPanel('battle')

    expect(markup).toContain('V3')
    expect(markup).toContain('Vira vs V3')
    expect(markup).toContain('Перші конвертації')
    expect(markup).toContain('День 7/7')
    expect(markup).toContain('АКТИВНІ BATTLES · 1')
  })


  it('does not derive a completion warning from a past scheduled time in the compact row', () => {
    calendarSessions = [
      {
        id: 'past-group-1',
        scheduledAt: '2026-09-07T16:00:00.000Z',
        topic: 'ФОКУС · Zoom-практика',
        status: 'SCHEDULED',
        type: 'group_practice',
        zoomLink: 'https://zoom.us/j/group',
        attendeesCount: 0,
        remainingSlots: 50,
        canEdit: true,
        priceCents: 0,
        progressA: 1,
      },
    ]

    const markup = renderPanel()

    expect(markup).not.toContain('Потребує завершення')
    expect(markup).not.toContain('Завершити сесію')
    expect(markup.match(/data-coach-session-id="past-group-1"/g)).toHaveLength(1)
  })

  it('does not show completion CTA for a future scheduled session', () => {
    calendarSessions = [
      {
        id: 'future-group-1',
        scheduledAt: '2026-09-08T16:00:00.000Z',
        topic: 'ФОКУС · Zoom-практика',
        status: 'SCHEDULED',
        type: 'group_practice',
        zoomLink: 'https://zoom.us/j/group',
        attendeesCount: 4,
        remainingSlots: 46,
        canEdit: true,
      },
    ]

    const markup = renderPanel()

    expect(markup).not.toContain('Потребує завершення')
    expect(markup).not.toContain('Завершити сесію')
  })

  it('renders completed weekly card outcome from canonical DTO fields without stale scheduled state', () => {
    calendarSessions = [
      {
        id: 'completed-group-1',
        scheduledAt: '2026-09-07T16:00:00.000Z',
        topic: 'ФОКУС · Zoom-практика',
        status: 'COMPLETED',
        type: 'group_practice',
        zoomLink: 'https://zoom.us/j/group',
        attendeesCount: 15,
        remainingSlots: 35,
        actualAttendeeCount: 12,
        outcomeTopic: 'Воронка перед запуском',
        summary: 'Підібрали AI-агенти для контенту.',
        recordingUrl: 'https://zoom.us/rec/group',
        recordingAvailable: true,
        canViewRecording: true,
        canEdit: true,
        priceCents: 0,
      },
    ]

    const markup = renderPanel()

    expect(markup).toContain('Групова практика')
    expect(markup).toContain('ФОКУС · Zoom-практика')
    expect(markup).not.toContain('✅ Завершено')
    expect(markup).not.toContain('Заплановано')
    expect(markup).not.toContain('0/50 учасників')
    expect(markup).not.toContain('День 1/7')
    expect(markup).not.toContain('Без оплати')
  })

  it('renders pricing labels from the shared payment model instead of generic free copy', () => {
    calendarSessions = [
      {
        id: 'individual-paid',
        scheduledAt: '2026-09-08T16:00:00.000Z',
        topic: 'Індивідуальна сесія',
        status: 'SCHEDULED',
        type: 'individual',
        zoomLink: 'https://zoom.us/j/individual',
        participantNames: ['V3'],
        canEdit: true,
        priceCents: 0,
      },
      {
        id: 'battle-winner',
        scheduledAt: '2026-09-08T17:00:00.000Z',
        topic: 'Zoom Battle',
        status: 'COMPLETED',
        type: 'battle_review',
        zoomLink: 'https://zoom.us/j/battle',
        challengerName: 'Vira',
        opponentName: 'V3',
        battleStatus: 'completed',
        winnerId: 'winner-1',
        canEdit: true,
        priceCents: 0,
      },
      {
        id: 'focus-included',
        scheduledAt: '2026-09-10T14:00:00.000Z',
        topic: 'ФОКУС · Zoom-практика',
        status: 'SCHEDULED',
        type: 'group_practice',
        zoomLink: 'https://zoom.us/j/focus',
        attendeesCount: 12,
        remainingSlots: 38,
        canEdit: true,
        priceCents: 0,
      },
    ]

    const markup = renderPanel()

    expect(markup).toContain('Індивідуальна')
    expect(markup).toContain('Zoom Battle')
    expect(markup).toContain('Групова практика')
    expect(markup).not.toContain('Без оплати')
  })

  it('does not show battle progress for an ordinary group session unless the DTO marks it as battle', () => {
    calendarSessions = [
      {
        id: 'ordinary-group-1',
        scheduledAt: '2026-09-08T16:00:00.000Z',
        topic: 'ФОКУС · Zoom-практика',
        status: 'SCHEDULED',
        type: 'group_practice',
        zoomLink: 'https://zoom.us/j/group',
        attendeesCount: 12,
        remainingSlots: 38,
        canEdit: true,
        progressA: 1,
      },
      {
        id: 'battle-1',
        scheduledAt: '2026-09-08T17:00:00.000Z',
        topic: 'Zoom Battle',
        status: 'ACTIVE',
        type: 'battle_review',
        zoomLink: 'https://zoom.us/j/battle',
        challengerName: 'Vira',
        opponentName: 'V3',
        goalA: 'Перші конвертації',
        battleStatus: 'active',
        progressA: 1,
        progressB: 1,
        canEdit: true,
      },
    ]

    const markup = renderPanel()
    const groupStart = markup.indexOf('data-coach-session-id="ordinary-group-1"')
    const battleStart = markup.indexOf('data-coach-session-id="battle-1"')
    const groupMarkup = markup.slice(groupStart, battleStart)
    const battleMarkup = markup.slice(battleStart)

    expect(groupMarkup).not.toContain('День 1/7')
    expect(battleMarkup).not.toContain('День 1/7')
  })


  it('keeps compact row selection and empty-day creation on the same owner', () => {
    const source = readFileSync(new URL('../../../src/features/zoom/CoachZoomPanel.tsx', import.meta.url), 'utf8')

    expect(source).toContain('onClick={() => handleCreateForDate(new Date())}')
    expect(source).toContain('onCreateSession={handleCreateForDate}')
    expect(source).toContain('onClick={() => onCreateSession(day.date)}')
    expect(source).toContain('onClick={() => onSelect(session)}')
    expect(source).toContain('data-coach-session-id={session.id}')
    expect(source).not.toContain('flex items-start justify-between gap-2">\n              <p className="min-w-0 text-[13px] font-semibold leading-snug text-white">')
  })


  it('hosts coach create/edit/details/completion actions in one centered modal owner instead of inline week-row actions', () => {
    const source = readFileSync(new URL('../../../src/features/zoom/CoachZoomPanel.tsx', import.meta.url), 'utf8')
    const sessionCardSource = readFileSync(new URL('../../../src/features/zoom/components/calendar/SessionCard.tsx', import.meta.url), 'utf8')

    expect(source).toContain('function CoachActionModal')
    expect(source).toContain('<BaseModal')
    expect(source).toContain('role="dialog"')
    expect(source).toContain('aria-modal="true"')
    expect(source).toContain("event.key === 'Escape'")
    expect(source).toContain('overlayClassName="bg-black/70 backdrop-blur-sm"')
    expect(source).toContain('items-center justify-center')
    expect(source).toContain('max-h-[calc(100dvh-1.5rem)]')
    expect(source).not.toContain('items-end')
    expect(source).not.toContain('id="coach-create-form"')
    expect(source).not.toContain('id="coach-edit-form"')
    expect(source).toContain('<CoachActionModal title="Нова ZOOM-практика" onClose={closeCoachActionModal}>')
    expect(source).toContain("editingFocus === 'schedule' ? 'Перенести сесію' : 'Редагування сесії'")
    expect(source).toContain("useCancelZoomSessionMutation()")
    expect(source).toContain('await cancelZoomSession(cancellingSessionId).unwrap()')
    expect(source).toContain('Скасувати цю Zoom-сесію?')
    expect(source).toContain('СКАСУВАТИ СЕСІЮ')
    expect(source).toContain('НАЗАД')
    expect(source).toContain("cancellingSessionId === selectedSessionData.id")
    expect(source).toContain('initialCompletionOpen={completionSessionId === selectedSessionData.id}')
    expect(source).toContain('onEdit={(id) => {')
    expect(source).not.toContain('onCompleteSession=')
    expect(source).not.toContain('onApproveRequest=')
    expect(source).not.toContain('onRejectRequest=')
    expect(sessionCardSource).toContain("session.status === 'CANCELLED'")
    expect(sessionCardSource).toContain("'СКАСОВАНО'")
    expect(sessionCardSource).toContain("session.status === 'COMPLETED'")
    expect(sessionCardSource).toContain("'ЗАВЕРШЕНО'")
    expect(sessionCardSource).toContain('Учасник не призначений')
    expect(sessionCardSource).toContain('showsGroupCapacity')
  })

  it('keeps one calendar query owner without nested calendar polling', () => {
    calendarSessions = []

    renderPanel()

    expect(calendarQueryCalls).toHaveLength(1)
    expect(calendarQueryCalls[0].args).toMatchObject({
      role: 'coach',
      userId: 'expert-1',
      expertId: 'expert-1',
    })
    expect(calendarQueryCalls[0].args.from).toBe('2026-09-06T21:00:00.000Z')
    expect(calendarQueryCalls[0].args.to).toBe('2026-09-13T20:59:59.999Z')
    expect(calendarQueryCalls[0].options.pollingInterval).toBeUndefined()
  })

  it('keeps availability as an explicit secondary mode while calendar stays the default', () => {
    const source = readFileSync(new URL('../../../src/features/zoom/CoachZoomPanel.tsx', import.meta.url), 'utf8')

    expect(source).toContain("useState<'calendar' | 'availability'>('calendar')")
    expect(source).toContain("setCalendarMode('availability')")
    expect(source).toContain('<ZoomAvailabilityEditor')
  })

  it('builds edit initial values from the persisted session without replacing an explicit link', () => {
    expect(getCoachSessionInitialValues({
      id: 'session-1',
      scheduledAt: '2026-09-09T08:00:00.000Z',
      topic: 'Фокус',
      status: 'SCHEDULED',
      type: 'group_practice',
      zoomLink: 'https://zoom.us/j/existing',
      attendeesCount: 4,
      remainingSlots: 46,
      canEdit: true,
    })).toEqual({
      scheduledAt: '2026-09-09T08:00:00.000Z',
      topic: 'Фокус',
      type: 'group_practice',
      zoomLink: 'https://zoom.us/j/existing',
      maxAttendees: 50,
      participantUserId: undefined,
      participantUserIds: undefined,
    })
  })
})
