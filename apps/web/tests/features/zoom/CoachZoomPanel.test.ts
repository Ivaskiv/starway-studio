import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getCoachSessionCardTone } from '../../../src/features/zoom/utils/coachCalendarPresentation'

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
  previousScheduledAt?: string
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
  commerceRequestId?: string | null
  isDisposableIndividualSlot?: boolean
  durationMinutes?: number
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
let coachProfile: { profile: { displayName: string } | null } = {
  profile: { displayName: 'Nadya' },
}

vi.mock('../../../src/features/zoom/zoom.api', () => ({
  useGetCalendarSessionsQuery: (args: CalendarQueryArgs, options: CalendarQueryOptions) => {
    calendarQueryCalls.push({ args, options })
    return { data: calendarSessions }
  },
  useGetCoachProfileQuery: () => ({ data: coachProfile }),
  useGetAvailabilityWeekQuery: () => ({ data: availabilityWeek }),
  useGetCoachParticipantsQuery: () => ({ data: { summary: { activeFocusCount: 0, newThisWeekCount: 0 }, participants: [] }, isLoading: false, isError: false }),
  useFinalizeBattleMutation: () => [vi.fn()],
  useApproveZoomCommerceRequestMutation: () => [vi.fn(), { isLoading: false }],
  useCancelZoomSessionMutation: () => [vi.fn(() => ({ unwrap: vi.fn() })), { isLoading: false }],
  useDeleteFreeIndividualSlotMutation: () => [vi.fn(() => ({ unwrap: vi.fn() })), { isLoading: false }],
  useRejectZoomCommerceRequestMutation: () => [vi.fn(), { isLoading: false }],
  useCreateZoomSessionMutation: () => [vi.fn(() => ({ unwrap: vi.fn() })), { isLoading: false }],
  useRescheduleCoachSessionMutation: () => [vi.fn(() => ({ unwrap: vi.fn() })), { isLoading: false }],
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
let resolveCoachHeaderName: typeof import('../../../src/features/zoom/CoachZoomPanel').resolveCoachHeaderName
let findPendingCoachRequestSession: typeof import('../../../src/features/zoom/CoachZoomPanel').findPendingCoachRequestSession

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
    coachProfile = { profile: { displayName: 'Nadya' } }
    const module = await loadPanel()
    CoachZoomPanel = module.CoachZoomPanel
    getCoachSessionInitialValues = module.getCoachSessionInitialValues
    resolveCoachHeaderName = module.resolveCoachHeaderName
    findPendingCoachRequestSession = module.findPendingCoachRequestSession
  })

  it('maps canonical coach session facts to the approved calendar card colours', () => {
    const base = {
      id: 'session-1', scheduledAt: '2026-10-26T16:00:00.000Z', topic: 'Сесія',
      status: 'SCHEDULED' as const, zoomLink: '', canEdit: true,
    }

    expect(getCoachSessionCardTone({ ...base, type: 'group_practice' })).toContain('emerald')
    expect(getCoachSessionCardTone({ ...base, type: 'individual' })).toContain('sky')
    expect(getCoachSessionCardTone({ ...base, type: 'individual', commerceStatus: 'APPROVED_PENDING_PAYMENT' })).toContain('amber')
    expect(getCoachSessionCardTone({ ...base, type: 'individual', commerceStatus: 'EXPIRED' })).toContain('rose')
    expect(getCoachSessionCardTone({ ...base, type: 'battle_review' })).toContain('violet')
    expect(getCoachSessionCardTone({ ...base, type: 'individual', status: 'CANCELLED' })).toContain('rose')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('selects only an authorized pending request for a Coach deep link', () => {
    const pending = {
      id: 'pending-session', scheduledAt: '2026-09-08T16:00:00.000Z', topic: 'Стратегія',
      status: 'SCHEDULED' as const, type: 'individual', zoomLink: '', canEdit: true,
      commerceRequestId: 'request-42', commerceStatus: 'REQUESTED' as const,
    }
    const paid = {
      ...pending,
      id: 'paid-session',
      commerceRequestId: 'request-paid',
      commerceStatus: 'PAID' as const,
    }

    expect(findPendingCoachRequestSession([pending, paid], 'request-42')).toEqual(pending)
    expect(findPendingCoachRequestSession([pending, paid], 'request-paid')).toBeNull()
    expect(findPendingCoachRequestSession([pending, paid], 'foreign-request')).toBeNull()
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
    expect(markup).toContain('Nadya · Starway Studio')
    expect(markup).not.toContain('Vira · Starway Studio')
    expect(markup).not.toContain('Starway System · Starway Studio')
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

  it('uses the canonical Expert display name when the coach calendar is empty', () => {
    calendarSessions = []
    const markup = renderPanel()

    expect(markup).toContain('Nadya · Starway Studio')
    expect(markup).not.toContain('Vira · Starway Studio')
    expect(markup).not.toContain('Starway System · Starway Studio')
  })

  it('shows a neutral label when the canonical Expert profile is unavailable', () => {
    expect(resolveCoachHeaderName(null)).toBe('Профіль коуча недоступний')
  })

  it('renders Mon-Sun order with today marker and keeps unexpanded empty days compact', () => {
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
    expect(markup).not.toContain('На цей день немає запланованих зустрічей')
    expect(markup).toContain('aria-label="Додати сесію 2026-09-08"')
  })

  it('opens only canonical actions for a future session and protects pending or terminal commitments', async () => {
    const { CoachSessionActions } = await loadPanel()
    const futureScheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const pastScheduledAt = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const session = {
      id: 'future', scheduledAt: futureScheduledAt, topic: 'Аналіз',
      status: 'SCHEDULED' as const, type: 'individual', zoomLink: '', participantNames: ['Анна'], canEdit: true,
    }
    const renderActions = (patch: Partial<import('../../../src/features/zoom/zoom.types').ZoomCalendarSession> = {}, canManage = true) => renderToStaticMarkup(createElement(CoachSessionActions, {
      session: { ...session, ...patch }, canManage, busy: false, error: null,
      onDetails: vi.fn(), onEdit: vi.fn(), onCancel: vi.fn(), onDeleteSlot: vi.fn(), onComplete: vi.fn(), onApprove: vi.fn(), onReject: vi.fn(),
    }))
    const available = renderActions()
    expect(available).toContain('ВІДКРИТИ ДЕТАЛІ')
    expect(available).not.toContain('ПЕРЕНЕСТИ СЕСІЮ')
    expect(available).toContain('СКАСУВАТИ СЕСІЮ')
    expect(available).not.toContain('ВИДАЛИТИ')
    expect(available).not.toContain('НАГАДАТИ ПРО ОПЛАТУ')
    const groupPractice = renderActions({ type: 'group_practice', participantNames: undefined })
    expect(groupPractice).toContain('ВІДКРИТИ ДЕТАЛІ')
    expect(groupPractice).toContain('РЕДАГУВАТИ НАЛАШТУВАННЯ')
    expect(groupPractice).toContain('ПЕРЕНЕСТИ ПРАКТИКУ')
    expect(groupPractice).toContain('СКАСУВАТИ ПРАКТИКУ')
    expect(groupPractice).not.toContain('ВИДАЛИТИ СЛОТ')
    expect(groupPractice).not.toContain('КЕРУВАТИ УЧАСНИКАМИ')
    const availableSlot = renderActions({ participantNames: undefined, isDisposableIndividualSlot: true })
    expect(availableSlot).toContain('Індивідуальний слот')
    expect(availableSlot).toContain('ДОСТУПНИЙ')
    expect(availableSlot).toContain('РЕДАГУВАТИ СЛОТ')
    expect(availableSlot).toContain('ПЕРЕНЕСТИ СЛОТ')
    expect(availableSlot).toContain('ВИДАЛИТИ СЛОТ')
    expect(availableSlot).not.toContain('СКАСУВАТИ СЕСІЮ')
    const requested = renderActions({ commerceRequestId: 'request-1', commerceStatus: 'REQUESTED' })
    expect(requested).toContain('ПІДТВЕРДИТИ ЗАПИТ')
    expect(requested).toContain('ВІДХИЛИТИ ЗАПИТ')
    expect(requested).not.toContain('ПЕРЕНЕСТИ СЕСІЮ')
    expect(requested).not.toContain('ВИДАЛИТИ СЛОТ')
    const pending = renderActions({ commerceRequestId: 'request-1', commerceStatus: 'APPROVED_PENDING_PAYMENT' })
    expect(pending).not.toContain('РЕДАГУВАТИ ТЕМУ')
    expect(pending).not.toContain('ПЕРЕНЕСТИ СЕСІЮ')
    expect(pending).not.toContain('ВИДАЛИТИ СЛОТ')
    for (const protectedMarkup of [renderActions({ status: 'CANCELLED' }), renderActions({ status: 'COMPLETED' }), renderActions({}, false)]) {
      expect(protectedMarkup).toContain('ВІДКРИТИ ДЕТАЛІ')
      expect(protectedMarkup).not.toContain('СКАСУВАТИ СЕСІЮ')
      expect(protectedMarkup).not.toContain('ПЕРЕНЕСТИ СЕСІЮ')
      expect(protectedMarkup).not.toContain('ВИДАЛИТИ СЛОТ')
    }

    const pastSlot = renderActions({
      scheduledAt: pastScheduledAt,
      participantNames: undefined,
      isDisposableIndividualSlot: true,
    })
    expect(pastSlot).toContain('Індивідуальний слот')
    expect(pastSlot).toContain('МИНУВ')
    expect(pastSlot).not.toContain('ПЕРЕНЕСТИ СЕСІЮ')
    expect(pastSlot).not.toContain('ПЕРЕНЕСТИ СЛОТ')
    expect(pastSlot).not.toContain('ЗАВЕРШИТИ СЕСІЮ')
    expect(pastSlot).toContain('ВИДАЛИТИ СЛОТ')

    const pastSession = renderActions({ scheduledAt: pastScheduledAt })
    expect(pastSession).toContain('Індивідуальна сесія')
    expect(pastSession).not.toContain('ПРОЙШЛА')
    expect(pastSession).not.toContain('ЗАВЕРШИТИ СЕСІЮ')

    const cancelledSlot = renderActions({ status: 'CANCELLED', participantNames: undefined, isDisposableIndividualSlot: true })
    expect(cancelledSlot).toContain('ВИДАЛИТИ СЛОТ')
    const cancelledCommitment = renderActions({ status: 'CANCELLED', participantNames: undefined, commerceRequestId: 'cancelled-request', commerceStatus: 'CANCELLED' })
    expect(cancelledCommitment).not.toContain('ВИДАЛИТИ СЛОТ')
  })

  it('marks only the rescheduled group card and keeps both distinct practices', () => {
    calendarSessions = [
      { id: 'ordinary', scheduledAt: '2026-09-07T15:00:00.000Z', topic: 'Практика', status: 'SCHEDULED', type: 'group_practice', zoomLink: '', canEdit: true, attendeesCount: 1, remainingSlots: 49 },
      { id: 'moved', scheduledAt: '2026-09-08T16:00:00.000Z', previousScheduledAt: '2026-09-14T16:00:00.000Z', topic: 'Практика', status: 'SCHEDULED', type: 'group_practice', zoomLink: '', canEdit: true, attendeesCount: 1, remainingSlots: 49 },
    ]
    const markup = renderPanel()
    expect(markup).toContain('data-coach-session-id="ordinary"')
    expect(markup).toContain('data-coach-session-id="moved"')
    expect(markup.match(/ПЕРЕНЕСЕНО/g)).toHaveLength(1)
    expect(markup).toContain('Було:')
  })

  it('maps canonical reschedule failures to actionable rollback messages', async () => {
    const { getCoachRescheduleErrorMessage } = await loadPanel()

    expect(getCoachRescheduleErrorMessage('RESCHEDULE_TARGET_UNAVAILABLE')).toContain('недоступний')
    expect(getCoachRescheduleErrorMessage('RESCHEDULE_COMMERCE_LOCKED')).toContain('бронювання')
    expect(getCoachRescheduleErrorMessage('RESCHEDULE_FORBIDDEN')).toContain('прав')
    expect(getCoachRescheduleErrorMessage(null)).toContain('Не вдалося')
  })

  it('renders the coach week as compact effective-availability day cards without inline session actions', () => {
    calendarSessions = [
      {
        id: 'off-day-commitment', scheduledAt: '2026-09-10T08:00:00.000Z', topic: 'Аналіз · Катерина',
        status: 'SCHEDULED', type: 'individual', zoomLink: '', participantNames: ['Катерина'],
        commerceRequestId: 'off-day-request', commerceStatus: 'APPROVED_PENDING_PAYMENT', canEdit: true,
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
    expect(markup).not.toContain('На цей день немає запланованих зустрічей')
    expect(markup).toContain('aria-label="Додати сесію 2026-09-08"')
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
        commerceRequestId: 'requested-commerce',
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
        commerceRequestId: 'pending-commerce',
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
        commerceRequestId: 'paid-commerce',
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
        commerceRequestId: 'expired-commerce',
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
        commerceRequestId: 'cancelled-commerce',
        commerceStatus: 'REQUESTED',
        canEdit: true,
      },
    ]

    const markup = renderPanel()

    expect(markup).toContain('ОЧІКУЄ КОУЧА')
    expect(markup).toContain('ОЧІКУЄ ОПЛАТИ')
    expect(markup).toContain('СКАСОВАНО')
    expect(markup).toContain('Індивідуальний слот')
    expect(markup).toContain('ДОСТУПНИЙ')
    expect(markup.match(/ОЧІКУЄ КОУЧА/g)).toHaveLength(1)
    expect(markup).not.toContain('Учасник не призначений')
    expect(markup).toContain('ОПЛАЧЕНО')
    expect(markup).not.toContain('ПОТРЕБУЄ ДІЇ')
    expect(markup).not.toContain('Оплату не підтверджено')
    expect(markup).not.toContain('🟠 Очікує оплати')
    expect(markup).not.toContain('ЗАПЛАНОВАНО')
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

  it('keeps future free individual inventory visible and draggable while preserving protected commitments', () => {
    calendarSessions = [
      {
        id: 'expired-empty-slot', scheduledAt: '2026-09-08T08:00:00.000Z', topic: 'Індивідуальна сесія',
        status: 'SCHEDULED', type: 'individual', zoomLink: '', attendeesCount: 0, remainingSlots: 1,
        durationMinutes: 60, isDisposableIndividualSlot: true, canEdit: true,
      },
      {
        id: 'future-empty-slot', scheduledAt: '2026-09-10T08:00:00.000Z', topic: 'Індивідуальна сесія',
        status: 'SCHEDULED', type: 'individual', zoomLink: '', attendeesCount: 0, remainingSlots: 1,
        durationMinutes: 60, isDisposableIndividualSlot: true, canEdit: true,
      },
      {
        id: 'cancelled-empty-slot', scheduledAt: '2026-09-08T11:00:00.000Z', topic: 'Індивідуальна сесія',
        status: 'CANCELLED', type: 'individual', zoomLink: '', attendeesCount: 0, remainingSlots: 1,
        durationMinutes: 60, isDisposableIndividualSlot: true, canEdit: true,
      },
      {
        id: 'completed-commitment', scheduledAt: '2026-09-08T09:00:00.000Z', topic: 'Розбір цілей',
        status: 'COMPLETED', type: 'individual', zoomLink: '', attendeesCount: 1, remainingSlots: 0,
        commerceRequestId: 'paid-1', isDisposableIndividualSlot: false, canEdit: true,
      },
      {
        id: 'pending-commitment', scheduledAt: '2026-09-08T13:00:00.000Z', topic: 'Стратегічна сесія',
        status: 'SCHEDULED', type: 'individual', zoomLink: '', attendeesCount: 0, remainingSlots: 0,
        participantNames: ['Vira'], commerceRequestId: 'request-1', commerceStatus: 'REQUESTED', isDisposableIndividualSlot: false, canEdit: true,
      },
      {
        id: 'cancelled-commitment', scheduledAt: '2026-09-08T10:00:00.000Z', topic: 'Скасована сесія',
        status: 'CANCELLED', type: 'individual', zoomLink: '', attendeesCount: 0, remainingSlots: 0,
        commerceRequestId: 'cancelled-1', commerceStatus: 'CANCELLED', isDisposableIndividualSlot: false, canEdit: true,
      },
      {
        id: 'group-stays-visible', scheduledAt: '2026-09-08T14:00:00.000Z', topic: 'ФОКУС · Zoom-практика',
        status: 'SCHEDULED', type: 'group_practice', zoomLink: '', attendeesCount: 4, remainingSlots: 46,
        canEdit: true,
      },
    ]

    const markup = renderPanel()

    expect(markup).toContain('data-coach-session-id="expired-empty-slot"')
    expect(markup).toContain('data-coach-session-id="future-empty-slot"')
    expect(markup).toContain('data-reschedule-draggable="true"')
    expect(markup).toContain('data-coach-session-id="cancelled-empty-slot"')
    expect(markup).toContain('aria-label="Видалити слот: Індивідуальна сесія"')
    expect(markup).not.toContain('АРХІВНІ ВІЛЬНІ СЛОТИ')
    expect(markup).toContain('data-coach-session-id="completed-commitment"')
    expect(markup).toContain('data-coach-session-id="pending-commitment"')
    expect(markup).toContain('data-coach-session-id="cancelled-commitment"')
    expect(markup).toContain('data-coach-session-id="group-stays-visible"')
    expect(markup).toContain('Vira')
    expect(markup).toContain('ОЧІКУЄ КОУЧА')
    expect(markup).not.toContain('ПРОЙШЛА')
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
    const headerSource = readFileSync(new URL('../../../src/features/zoom/components/coach/CoachPanelHeader.tsx', import.meta.url), 'utf8')
    const diarySource = readFileSync(new URL('../../../src/features/zoom/components/calendar/CoachWeeklyDiary.tsx', import.meta.url), 'utf8')

    expect(headerSource).toContain('onClick={() => onCreateSession(new Date())}')
    expect(source).toContain('onCreateSession={handleCreateForDate}')
    expect(diarySource).toContain('onClick={() => onCreateSession(day.date)}')
    expect(diarySource).toContain('onClick={() => onSelect(session)}')
    expect(diarySource).toContain('onDragStart={handleDragStart}')
    expect(diarySource).toContain('onTouchEnd={handleTouchEnd}')
    expect(diarySource).toContain('data-coach-week-date={day.key}')
    expect(diarySource).toContain('canDropOnDay')
    expect(diarySource).toContain('aria-label={`Видалити слот: ${session.topic}`}')
    expect(source).toContain('onDeleteSlot={(session) => requestFreeSlotDeletion(session.id)}')
    expect(source).toContain('useRescheduleCoachSessionMutation()')
    expect(source).toContain('await rescheduleCoachSession({ id: rescheduleDraft.session.id, scheduledAt: rescheduleDraft.scheduledAt }).unwrap()')
    expect(source).toContain('ПІДТВЕРДИТИ ПЕРЕНЕСЕННЯ')
    expect(diarySource).toContain('data-coach-session-id={session.id}')
    expect(source).not.toContain('flex items-start justify-between gap-2">\n              <p className="min-w-0 text-[13px] font-semibold leading-snug text-white">')
  })


  it('hosts coach create/edit/details/completion actions in one centered modal owner instead of inline week-row actions', () => {
    const source = readFileSync(new URL('../../../src/features/zoom/CoachZoomPanel.tsx', import.meta.url), 'utf8')
    const modalSource = readFileSync(new URL('../../../src/features/zoom/components/coach/CoachActionModal.tsx', import.meta.url), 'utf8')
    const baseModalSource = readFileSync(new URL('../../../src/features/modals/BaseModal.tsx', import.meta.url), 'utf8')
    const actionsSource = readFileSync(new URL('../../../src/features/zoom/components/coach/CoachSessionActions.tsx', import.meta.url), 'utf8')
    const sessionCardSource = readFileSync(new URL('../../../src/features/zoom/components/calendar/SessionCard.tsx', import.meta.url), 'utf8')
    const zoomApiSource = readFileSync(new URL('../../../src/features/zoom/zoom.api.ts', import.meta.url), 'utf8')

    expect(modalSource).toContain('<BaseModal')
    expect(modalSource).toContain('role="dialog"')
    expect(modalSource).toContain('aria-modal="true"')
    expect(modalSource).toContain("event.key === 'Escape'")
    expect(modalSource).toContain('overlayClassName="bg-black/70 backdrop-blur-sm"')
    expect(modalSource).toContain('items-center justify-center')
    expect(modalSource).toContain('fitVisualViewport')
    expect(modalSource).toContain('max-h-[calc(100dvh-1.5rem)]')
    expect(baseModalSource).toContain("cn('fixed inset-0 bg-black/80', overlayClassName)")
    expect(modalSource).not.toContain('items-end')
    expect(source).not.toContain('id="coach-create-form"')
    expect(source).not.toContain('id="coach-edit-form"')
    expect(source).toContain('<CoachActionModal title="Нова ZOOM-практика" onClose={closeCoachActionModal}>')
    expect(source).toContain("editingFocus === 'schedule' ? 'Перенести сесію' : 'Редагування сесії'")
    expect(source).toContain("useCancelZoomSessionMutation()")
    expect(source).toContain('await cancelZoomSession(cancellingSessionId).unwrap()')
    expect(source).toContain('Скасувати цю Zoom-сесію?')
    expect(source).toContain('СКАСУВАТИ СЕСІЮ')
    expect(source).toContain("'ДЕТАЛІ СЛОТА'")
    expect(source).toContain("'ДЕТАЛІ СЕСІЇ'")
    expect(actionsSource).toContain("'РЕДАГУВАТИ СЛОТ'")
    expect(actionsSource).toContain("'ПЕРЕНЕСТИ ПРАКТИКУ' : 'ПЕРЕНЕСТИ СЛОТ'")
    expect(actionsSource).toContain('ВИДАЛИТИ СЛОТ</button>')
    expect(source).toContain("'ВИДАЛИТИ СЛОТ?'")
    expect(source).toContain('Слот буде видалено з календаря.')
    expect(source).toContain('Цю дію не можна скасувати.')
    expect(source).toContain("isDeletingSlot ? 'ВИДАЛЯЄМО…' : 'ВИДАЛИТИ'")
    expect(source).toContain('СКАСУВАТИ')
    expect(source).toContain('requestFreeSlotDeletion = (sessionId: string) => {')
    expect(source).toContain('setDeletingSlotId(sessionId)')
    expect(source).toContain('onClick={closeCoachActionModal}')
    expect(source).toContain('await deleteFreeIndividualSlot(deletingSlotId).unwrap()')
    expect(source).toContain('setDeletedSlotSuccess(true)')
    expect(source).toContain("? 'Слот видалено'")
    expect(source).toContain('Користувачі більше не можуть на нього записатися.')
    expect(source).toContain('ЗРОЗУМІЛО</button>')
    expect(source).toContain('onDeleteSlot={() => requestFreeSlotDeletion(selectedSessionData.id)}')
    expect(source).toContain('onDeleteSlot={requestFreeSlotDeletion}')
    expect(zoomApiSource).toContain('deleteFreeIndividualSlot: build.mutation')
    expect(zoomApiSource).toContain('url: `/zoom/sessions/${id}/free-slot`, method: \'DELETE\'')
    expect(zoomApiSource).toContain("invalidatesTags: ['ZoomSession']")
    expect(source).toContain('НАЗАД')
    expect(source).toContain("cancellingSessionId === selectedSessionData.id")
    expect(source).toContain('initialCompletionOpen={completionSessionId === selectedSessionData.id}')
    expect(source).toContain('showCloseControl={false}')
    expect(source).toContain('onEdit={(id) => {')
    expect(source).toContain("const [editingReturnView, setEditingReturnView] = useState<'actions' | 'details'>('actions')")
    expect(source).toContain('const openSessionEditor = (sessionId: string, reschedule: boolean) => {')
    expect(source).toContain('setEditingReturnView(selectedSessionView)')
    expect(source).toContain('const returnFromSessionEditor = () => {')
    expect(source).toContain('setSelectedSessionView(editingReturnView)')
    expect(source).toContain('selectedSessionData && !editingSessionData')
    expect(source).toContain('onBack={returnFromSessionEditor}')
    expect(modalSource).toContain('onBack?: () => void')
    expect(modalSource).toContain('aria-label="Назад"')
    expect(modalSource).toContain('<ChevronLeft')
    expect(source).not.toContain('onCompleteSession=')
    expect(source).not.toContain('onApproveRequest=')
    expect(source).not.toContain('onRejectRequest=')
    expect(sessionCardSource).toContain("session.status === 'CANCELLED'")
    expect(sessionCardSource).toContain("'СКАСОВАНО'")
    expect(sessionCardSource).toContain("session.status === 'COMPLETED'")
    expect(sessionCardSource).toContain("'ЗАВЕРШЕНО'")
    expect(sessionCardSource).toContain('getIndividualPresentation(session)')
    expect(sessionCardSource).not.toContain('Учасник не призначений')
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
    const headerSource = readFileSync(new URL('../../../src/features/zoom/components/coach/CoachPanelHeader.tsx', import.meta.url), 'utf8')

    expect(source).toContain("useState<'calendar' | 'availability'>('calendar')")
    expect(headerSource).toContain("onChangeCalendarMode('availability')")
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
