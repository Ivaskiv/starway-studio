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
  useFinalizeBattleMutation: () => [vi.fn()],
  useApproveZoomCommerceRequestMutation: () => [vi.fn(), { isLoading: false }],
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

function renderPanel() {
  return renderToStaticMarkup(createElement(CoachZoomPanel, { expertId: 'expert-1' }))
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
    expect(markup).toContain('+ Нова сесія')
    expect(markup).toContain('7–13 вересня')
    expect(markup).toContain('Сесій')
    expect(markup).toContain('Учасників')
    expect(markup).toContain('Активних')
    expect(markup).toContain('Оплат')
    expect(markup).not.toContain('CALENDAR:coach')
    expect(markup).not.toContain('КАЛЕНДАР СЕСІЙ')
    expect(markup).not.toContain('СЕСІЙ / МІСЯЦЬ')
    expect(markup).not.toContain('TOP XP')
    expect(markup).not.toContain('Zoom-посилання')
    expect(markup.match(/Індивідуальна сесія/g)).toHaveLength(1)
    expect(markup).toContain('КАЛЕНДАР')
    expect(markup).toContain('МОЯ ДОСТУПНІСТЬ')
    expect(markup).not.toContain('ЗВИЧНИЙ ГРАФІК')
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
    expect(markup).toContain('Завершено')
    expect(markup).toContain('Щотижнева сесія балансу')
    expect(markup).toContain('Немає запланованих сесій')
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

    const markup = renderPanel()

    expect(markup).toContain('V3')
    expect(markup).toContain('Я готова до змін!')
    expect(markup).toContain('Vira vs V3')
    expect(markup).toContain('Перші конвертації')
    expect(markup).toContain('День 7/7')
    expect(markup).toContain('АКТИВНІ BATTLES · 1')
    expect(markup.match(/data-coach-session-id="battle-1"/g)).toHaveLength(1)
  })


  it('shows completion CTA for a past scheduled group session and keeps it single in the weekly card', () => {
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

    expect(markup).toContain('Потребує завершення')
    expect(markup.match(/Завершити сесію/g)).toHaveLength(1)
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

    expect(markup).toContain('✅ Завершено')
    expect(markup).toContain('12 були присутні')
    expect(markup).toContain('12 фактично · 15 зареєстровано')
    expect(markup).toContain('Тема: «Воронка перед запуском»')
    expect(markup).toContain('Підсумок: «Підібрали AI-агенти для контенту.»')
    expect(markup).toContain('Відкрити запис')
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

    expect(markup).toContain('60 €')
    expect(markup).toContain('За результатом: переможець 0 € · програвша 25 €')
    expect(markup).toContain('Входить у підписку')
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
    expect(battleMarkup).toContain('День 1/7')
  })


  it('keeps weekly status chips outside the constrained title row and empty-day creation on the same owner', () => {
    const source = readFileSync(new URL('../../../src/features/zoom/CoachZoomPanel.tsx', import.meta.url), 'utf8')

    expect(source).toContain('onClick={() => handleCreateForDate(new Date())}')
    expect(source).toContain('onCreateSession={handleCreateForDate}')
    expect(source).toContain('onClick={() => onCreateSession(day.date)}')
    expect(source).toContain('<div className="mt-2 flex flex-wrap items-center gap-1.5">')
    expect(source).not.toContain('flex items-start justify-between gap-2">\n              <p className="min-w-0 text-[13px] font-semibold leading-snug text-white">')
  })


  it('hosts coach create/edit/details/completion actions in one modal owner instead of inline page sections', () => {
    const source = readFileSync(new URL('../../../src/features/zoom/CoachZoomPanel.tsx', import.meta.url), 'utf8')

    expect(source).toContain('function CoachActionModal')
    expect(source).toContain('<BaseModal')
    expect(source).toContain('role="dialog"')
    expect(source).toContain('aria-modal="true"')
    expect(source).toContain("event.key === 'Escape'")
    expect(source).toContain('overlayClassName="bg-black/70 backdrop-blur-sm"')
    expect(source).toContain('max-h-[calc(100vh-1.5rem)]')
    expect(source).not.toContain('id="coach-create-form"')
    expect(source).not.toContain('id="coach-edit-form"')
    expect(source).toContain('<CoachActionModal title="Нова ZOOM-практика" onClose={closeCoachActionModal}>')
    expect(source).toContain('<CoachActionModal title="Редагування сесії" onClose={closeCoachActionModal}>')
    expect(source).toContain("title={completionSessionId === selectedSessionData.id ? 'Завершити сесію' : 'Сесія'}")
    expect(source).toContain('initialCompletionOpen={completionSessionId === selectedSessionData.id}')
    expect(source).toContain('onEdit={(id) => {')
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
