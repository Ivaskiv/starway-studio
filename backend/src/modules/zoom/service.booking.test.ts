import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockZoomSessionAttendeeUpsert = vi.fn()
const mockZoomSessionAttendeeFindUnique = vi.fn()
const mockZoomSessionAttendeeFindMany = vi.fn()
const mockZoomSessionAttendeeFindFirst = vi.fn()
const mockZoomSessionAttendeeCount = vi.fn()
const mockZoomSessionFindFirst = vi.fn()
const mockZoomSessionFindUnique = vi.fn()
const mockZoomSessionFindMany = vi.fn()
const mockEventCreate = vi.fn()
const mockEventFindMany = vi.fn()
const mockGetCachedLatestWeeklyReport = vi.fn()
const mockUserFindUnique = vi.fn()

vi.mock('../../db/client.js', () => ({
  prisma: {
    zoomSession: {
      findFirst: (...args: unknown[]) => mockZoomSessionFindFirst(...args),
      findUnique: (...args: unknown[]) => mockZoomSessionFindUnique(...args),
      findMany: (...args: unknown[]) => mockZoomSessionFindMany(...args),
    },
    zoomSessionAttendee: {
      upsert: (...args: unknown[]) => mockZoomSessionAttendeeUpsert(...args),
      findUnique: (...args: unknown[]) => mockZoomSessionAttendeeFindUnique(...args),
      findMany: (...args: unknown[]) => mockZoomSessionAttendeeFindMany(...args),
      findFirst: (...args: unknown[]) => mockZoomSessionAttendeeFindFirst(...args),
      count: (...args: unknown[]) => mockZoomSessionAttendeeCount(...args),
    },
    event: {
      create: (...args: unknown[]) => mockEventCreate(...args),
      findMany: (...args: unknown[]) => mockEventFindMany(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}))

vi.mock('../../lib/telegram.js', () => ({
  bot: {},
  getBotLink: vi.fn(),
  sendDedupedTelegramMessage: vi.fn(),
  sendOpsTelegramMessage: vi.fn(),
}))

vi.mock('../../lib/db/weeklyReportCache.js', () => ({
  getCachedLatestWeeklyReport: (...args: unknown[]) => mockGetCachedLatestWeeklyReport(...args),
}))

import {
  assertCanBookGroupPracticeSession,
  getCalendarSessions,
  getCurrentWeekZoomOverview,
  getUserLatestWeeklyReportSummary,
  getUserPreviousZoomSessionRecap,
  getZoomBookingNotificationContext,
  registerAttendee,
  saveBookingQuestionForAttendee,
  selectTrialZoomEligibleSession,
} from './service.js'
import * as focusAccessModule from '../subscriptions/payments/focus.access.js'

describe('zoom booking service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registerAttendee uses idempotent upsert for repeated booking clicks', async () => {
    mockZoomSessionAttendeeUpsert.mockResolvedValue({
      id: 'att-1',
      sessionId: 'session-1',
      userId: 'user-1',
      attended: false,
      createdAt: new Date('2026-07-27T10:00:00.000Z'),
    })

    const attendee = await registerAttendee('user-1', 'session-1')

    expect(attendee).toMatchObject({
      id: 'att-1',
      sessionId: 'session-1',
      userId: 'user-1',
    })
    expect(mockZoomSessionAttendeeUpsert).toHaveBeenCalledWith({
      where: { sessionId_userId: { sessionId: 'session-1', userId: 'user-1' } },
      create: { userId: 'user-1', sessionId: 'session-1' },
      update: {},
    })
  })

  it('saveBookingQuestionForAttendee stores questionText for an existing booking', async () => {
    const createdAt = new Date('2026-07-27T10:05:00.000Z')

    mockZoomSessionAttendeeFindUnique.mockResolvedValue({ id: 'att-1' })
    mockEventCreate.mockResolvedValue({
      id: 'event-1',
      createdAt,
    })

    const event = await saveBookingQuestionForAttendee(
      'user-1',
      'session-1',
      '  Як підготуватися до практики?  ',
    )

    expect(event).toEqual({
      id: 'event-1',
      createdAt,
    })
    expect(mockZoomSessionAttendeeFindUnique).toHaveBeenCalledWith({
      where: {
        sessionId_userId: {
          sessionId: 'session-1',
          userId: 'user-1',
        },
      },
      select: {
        id: true,
      },
    })
    expect(mockEventCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'ZOOM_BOOKING_QUESTION',
        source: 'web',
        payload: {
          sessionId: 'session-1',
          questionText: 'Як підготуватися до практики?',
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    })
  })

  it('keeps the original queue position when a participant edits the booking question', async () => {
    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      topic: 'Focus Zoom',
      scheduledAt: new Date('2026-08-17T16:00:00.000Z'),
    })
    mockUserFindUnique.mockResolvedValue({
      firstName: 'Vira',
      lastName: null,
      telegramUserName: 'vira',
    })
    mockZoomSessionAttendeeCount.mockResolvedValue(2)
    mockEventFindMany.mockResolvedValue([
      {
        userId: 'user-1',
        payload: {
          sessionId: 'session-1',
          questionText: 'Початкове питання',
        },
        createdAt: new Date('2026-08-01T08:00:00.000Z'),
      },
      {
        userId: 'user-2',
        payload: {
          sessionId: 'session-1',
          questionText: 'Інше питання',
        },
        createdAt: new Date('2026-08-01T08:05:00.000Z'),
      },
      {
        userId: 'user-1',
        payload: {
          sessionId: 'session-1',
          questionText: 'Оновлене питання',
        },
        createdAt: new Date('2026-08-01T08:10:00.000Z'),
      },
    ])

    const context = await getZoomBookingNotificationContext('user-1', 'session-1')

    expect(context?.myQuestion).toEqual({
      text: 'Оновлене питання',
      position: 1,
    })
  })

  it('selectTrialZoomEligibleSession returns exactly the first Monday group practice for the paid trial', () => {
    const selected = selectTrialZoomEligibleSession(
      [
        {
          id: 'session-late',
          scheduledAt: new Date('2026-08-03T18:00:00.000Z'),
          requests: { type: 'group_practice' },
        },
        {
          id: 'session-early',
          scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
          requests: { type: 'group_practice' },
        },
        {
          id: 'session-wrong-day',
          scheduledAt: new Date('2026-08-10T15:00:00.000Z'),
          requests: { type: 'group_practice' },
        },
      ],
      new Date('2026-08-03T20:59:59.999Z'),
    )

    expect(selected?.id).toBe('session-early')
  })

  it('allows booking when only trial_zoom entitlement is active', async () => {
      vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
            state: 'PREMIUM',
      isActive: false,
      hasFocus: false,
      expiresAt: new Date('2026-08-03T20:59:59.999Z'),
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-early',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      capacity: 50,
      requests: { type: 'group_practice' },
      _count: { attendees: 3 },
    })
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-early',
        expertId: 'expert-1',
        scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
        status: 'SCHEDULED',
        type: 'GROUP',
        requests: { type: 'group_practice' },
      },
    ])
    mockZoomSessionAttendeeFindUnique.mockResolvedValue(null)

await expect(
  assertCanBookGroupPracticeSession({
    userId: 'user-1',
    sessionId: 'session-early',
  }),
).resolves.toBeUndefined()
  })

it('allows booking another session for trial entitlement', async () => {
      vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'PREMIUM',
      isActive: false,
      hasFocus: false,
      expiresAt: new Date('2026-08-03T20:59:59.999Z'),
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-late',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-03T18:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      capacity: 50,
      requests: { type: 'group_practice' },
      _count: { attendees: 3 },
    })
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-early',
        expertId: 'expert-1',
        scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
        status: 'SCHEDULED',
        type: 'GROUP',
        requests: { type: 'group_practice' },
      },
      {
        id: 'session-late',
        expertId: 'expert-1',
        scheduledAt: new Date('2026-08-03T18:00:00.000Z'),
        status: 'SCHEDULED',
        type: 'GROUP',
        requests: { type: 'group_practice' },
      },
    ])

await expect(
  assertCanBookGroupPracticeSession({
    userId: 'user-1',
    sessionId: 'session-late',
  }),
).resolves.toBeUndefined()

})

it('allows booking without entitlement', async () => {
      vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'NO_ACCESS',
      isActive: false,
      hasFocus: false,
      expiresAt: null,
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      capacity: 50,
      requests: { type: 'group_practice' },
      _count: { attendees: 3 },
    })

await expect(
  assertCanBookGroupPracticeSession({
    userId: 'user-1',
    sessionId: 'session-1',
  }),
).resolves.toBeUndefined()
  })

it('allows booking for FREE_WEEK1 without paid focus entitlement', async () => {
      vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'FREE_WEEK1',
      isActive: true,
      hasFocus: false,
      expiresAt: new Date('2026-08-08T10:00:00.000Z'),
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      capacity: 50,
      requests: { type: 'group_practice' },
      _count: { attendees: 3 },
    })
    mockZoomSessionAttendeeFindUnique.mockResolvedValue(null)

    await expect(
  assertCanBookGroupPracticeSession({
    userId: 'user-1',
    sessionId: 'session-1',
  }),
).resolves.toBeUndefined()
  })

  it('keeps active focus booking logic working', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-08-31T20:59:59.999Z'),
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-05T15:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      capacity: 50,
      requests: { type: 'group_practice' },
      _count: { attendees: 3 },
    })
    mockZoomSessionAttendeeFindUnique.mockResolvedValue(null)

    await expect(
      assertCanBookGroupPracticeSession({
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    ).resolves.toBeUndefined()
  })

  it('allows booking when an active absystem entitlement includes Focus access', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-08-31T20:59:59.999Z'),
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-05T15:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      capacity: 50,
      requests: { type: 'group_practice' },
      _count: { attendees: 3 },
    })
    mockZoomSessionAttendeeFindUnique.mockResolvedValue(null)

    await expect(
      assertCanBookGroupPracticeSession({
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    ).resolves.toBeUndefined()
  })

  it('keeps repeated requests idempotent for an existing booking with active focus access', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-08-31T20:59:59.999Z'),
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-early',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      capacity: 1,
      requests: { type: 'group_practice' },
      _count: { attendees: 1 },
    })
    mockZoomSessionAttendeeFindUnique.mockResolvedValue({ id: 'att-1' })

    await expect(
      assertCanBookGroupPracticeSession({
        userId: 'user-1',
        sessionId: 'session-early',
      }),
    ).resolves.toBeUndefined()
  })

  it('forbids cancelled sessions', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-08-31T20:59:59.999Z'),
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-05T15:00:00.000Z'),
      status: 'CANCELLED',
      type: 'GROUP',
      capacity: 50,
      requests: { type: 'group_practice' },
      _count: { attendees: 3 },
    })

    await expect(
      assertCanBookGroupPracticeSession({
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    ).rejects.toThrow('session_unavailable')
  })

  it('forbids full sessions before creating a new booking', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-08-31T20:59:59.999Z'),
    })

    mockZoomSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      expertId: 'expert-1',
      scheduledAt: new Date('2026-08-05T15:00:00.000Z'),
      status: 'SCHEDULED',
      type: 'GROUP',
      capacity: 3,
      requests: { type: 'group_practice' },
      _count: { attendees: 3 },
    })
    mockZoomSessionAttendeeFindUnique.mockResolvedValue(null)

    await expect(
      assertCanBookGroupPracticeSession({
        userId: 'user-1',
        sessionId: 'session-1',
      }),
    ).rejects.toThrow('slot_full')
  })

  it('returns global group practices when the user has access but no expertId binding', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-08-31T20:59:59.999Z'),
    })

    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-1',
        expertId: 'expert-1',
        scheduledAt: new Date('2026-08-03T16:00:00.000Z'),
        status: 'SCHEDULED',
        type: 'GROUP',
        topic: 'ФОКУС · Zoom-практика',
        requests: { type: 'group_practice' },
        _count: { attendees: 3 },
      },
    ])
    mockZoomSessionAttendeeFindMany.mockResolvedValue([])

    const sessions = await getCalendarSessions({
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-14T00:00:00.000Z'),
      role: 'user',
      userId: 'user-1',
      expertId: undefined,
    })

    expect(mockZoomSessionFindMany).toHaveBeenCalledWith({
      where: {
        scheduledAt: {
          gte: new Date('2026-08-01T00:00:00.000Z'),
          lte: new Date('2026-08-14T00:00:00.000Z'),
        },
        status: { not: 'CANCELLED' },
        OR: [
          { requests: { path: ['type'], equals: 'group_practice' } },
          { type: 'GROUP' },
        ],
      },
      include: { _count: { select: { attendees: true } } },
      orderBy: { scheduledAt: 'asc' },
    })
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({
      id: 'session-1',
      isMyBooking: false,
    })
  })

  it('returns the latest completed group session recap from canonical session report without requiring attendee row', async () => {
    const now = new Date('2026-08-04T09:00:00.000Z')

    mockZoomSessionFindFirst.mockResolvedValue({
      id: 'session-completed',
      topic: 'Рух без перевантаження',
      scheduledAt: new Date('2026-08-03T15:00:00.000Z'),
      type: 'GROUP',
      requests: { type: 'group_practice' },
      postSessionReport: {
        summary: 'Повернули один конкретний фокус і прибрали зайві задачі.',
        actionItems: ['Зафіксувати один конкретний крок.'],
        audioUrl: 'https://cdn.example.com/audio/session-completed.mp3',
      },
      _count: {
        attendees: 7,
      },
      attendees: [],
    })

    const recap = await getUserPreviousZoomSessionRecap('user-1', now)

    expect(mockZoomSessionFindFirst).toHaveBeenCalledWith({
      where: {
        status: 'COMPLETED',
        scheduledAt: { lte: now },
        OR: [
          { requests: { path: ['type'], equals: 'group_practice' } },
          { type: 'GROUP' },
        ],
      },
      include: {
        _count: {
          select: {
            attendees: true,
          },
        },
        attendees: {
          where: {
            userId: 'user-1',
          },
          select: {
            attended: true,
          },
          take: 1,
        },
      },
      orderBy: {
        scheduledAt: 'desc',
      },
    })
    expect(recap).toEqual({
      id: 'session-completed',
      title: 'Рух без перевантаження',
      startsAt: '2026-08-03T15:00:00.000Z',
      endsAt: null,
      summary: 'Повернули один конкретний фокус і прибрали зайві задачі.',
      recordingUrl: 'https://cdn.example.com/audio/session-completed.mp3',
      materialsUrl: null,
      attendanceStatus: null,
      attendanceCount: 7,
      nextStep: 'Зафіксувати один конкретний крок.',
    })
  })

  it('keeps question counts for users without exposing other participants texts in the current week overview', async () => {
    vi.spyOn(focusAccessModule, 'getUserAccessState').mockResolvedValue({
      state: 'FOCUS_ACTIVE',
      isActive: true,
      hasFocus: true,
      expiresAt: new Date('2026-08-31T20:59:59.999Z'),
    })
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-next',
        expertId: 'expert-1',
        scheduledAt: new Date('2026-08-10T16:00:00.000Z'),
        status: 'SCHEDULED',
        type: 'GROUP',
        topic: 'ФОКУС · Zoom-практика',
        requests: { type: 'group_practice', durationMinutes: 60, zoomLink: 'https://zoom.example/next' },
        postSessionReport: null,
        _count: { attendees: 4 },
      },
    ])
    mockZoomSessionAttendeeFindMany.mockResolvedValue([])
    mockEventFindMany.mockResolvedValue([
      {
        userId: 'user-2',
        createdAt: new Date('2026-08-04T09:00:00.000Z'),
        payload: {
          sessionId: 'session-next',
          questionText: 'Хочу зрозуміти, як не випадати з ритму.',
        },
      },
      {
        userId: 'user-3',
        createdAt: new Date('2026-08-04T09:05:00.000Z'),
        payload: {
          sessionId: 'session-next',
          questionText: 'Як обрати один наступний крок?',
        },
      },
      {
        userId: 'user-3',
        createdAt: new Date('2026-08-04T09:10:00.000Z'),
        payload: {
          sessionId: 'session-next',
          questionText: 'Як обрати один наступний крок?',
        },
      },
    ])

    const overview = await getCurrentWeekZoomOverview({
      userId: 'user-1',
      role: 'user',
      expertId: 'expert-1',
      now: new Date('2026-08-04T09:00:00.000Z'),
    })

    expect(overview.sessions[0]).toMatchObject({
      id: 'session-next',
      attendeesCount: 4,
      questionPreviews: [],
      questionsCount: 2,
      remainingQuestionsCount: 0,
    })
  })

  it('keeps question previews for coach overview ordered by the canonical queue', async () => {
    mockZoomSessionFindMany.mockResolvedValue([
      {
        id: 'session-next',
        expertId: 'expert-1',
        scheduledAt: new Date('2026-08-10T16:00:00.000Z'),
        status: 'SCHEDULED',
        type: 'GROUP',
        topic: 'ФОКУС · Zoom-практика',
        requests: { type: 'group_practice', durationMinutes: 60, zoomLink: 'https://zoom.example/next' },
        postSessionReport: null,
        _count: { attendees: 4 },
      },
    ])
    mockEventFindMany.mockResolvedValue([
      {
        userId: 'user-2',
        createdAt: new Date('2026-08-04T09:00:00.000Z'),
        payload: {
          sessionId: 'session-next',
          questionText: 'Хочу зрозуміти, як не випадати з ритму.',
        },
      },
      {
        userId: 'user-3',
        createdAt: new Date('2026-08-04T09:05:00.000Z'),
        payload: {
          sessionId: 'session-next',
          questionText: 'Як обрати один наступний крок?',
        },
      },
    ])

    const overview = await getCurrentWeekZoomOverview({
      userId: 'coach-1',
      role: 'coach',
      expertId: 'expert-1',
      now: new Date('2026-08-04T09:00:00.000Z'),
    })

    expect(overview.sessions[0]).toMatchObject({
      id: 'session-next',
      questionPreviews: [
        'Хочу зрозуміти, як не випадати з ритму.',
        'Як обрати один наступний крок?',
      ],
      questionsCount: 2,
    })
  })

  it('returns the latest persisted weekly report summary without raw analysis payload', async () => {
    mockGetCachedLatestWeeklyReport.mockResolvedValue({
      id: 'report-1',
      weekStart: new Date('2026-07-27T00:00:00.000Z'),
      weekEnd: new Date('2026-08-03T23:59:59.000Z'),
      createdAt: new Date('2026-08-04T06:30:00.000Z'),
      summaryText: 'Тиждень показав, де ти тримаєш ритм, а де розпорошуєшся.',
      topInsights: ['Є рух, але не все доводиться до кінця.'],
      struggleAreas: ['перевантаження'],
      nextWeekFocus: 'Тримати один ясний крок на день.',
      nextWeekTasks: ['Повернути ранкову сесію в ритм'],
      metrics: { tasksDone: 3, tasksTotal: 5, reflections: 4, sessions: 2 },
      analysis: {
        mainPainThisWeek: 'хаотичний фокус',
        provider: 'hidden',
      },
    })

    const report = await getUserLatestWeeklyReportSummary('user-1')

    expect(mockGetCachedLatestWeeklyReport).toHaveBeenCalledWith('user-1')
    expect(report).toEqual({
      id: 'report-1',
      weekStart: '2026-07-27T00:00:00.000Z',
      weekEnd: '2026-08-03T23:59:59.000Z',
      generatedAt: '2026-08-04T06:30:00.000Z',
      summary: 'Тиждень показав, де ти тримаєш ритм, а де розпорошуєшся.',
      progress: 'Виконано 3/5 задач',
      achievement: 'Є рух, але не все доводиться до кінця.',
      blocker: 'перевантаження',
      nextStep: 'Тримати один ясний крок на день.',
      detailsAvailable: true,
    })
  })
})
