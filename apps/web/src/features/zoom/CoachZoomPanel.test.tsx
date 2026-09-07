import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

let calendarSessions: Array<{
  id: string
  scheduledAt: string
  topic: string
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  type: string
  zoomLink: string
  attendeesCount?: number
  remainingSlots?: number
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

vi.mock('./zoom.api', () => ({
  useGetCalendarSessionsQuery: () => ({ data: calendarSessions }),
  useGetLeaderboardQuery: () => ({ data: [] }),
  useFinalizeBattleMutation: () => [vi.fn()],
  useCreateZoomSessionMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateZoomSessionMutation: () => [vi.fn(), { isLoading: false }],
}))

vi.mock('./services/zoom.api', () => ({
  useGetAttendeesQuery: (sessionId: string) => ({
    data: attendeesBySessionId[sessionId] ?? [],
    isFetching: false,
    refetch: vi.fn(),
  }),
  useMarkAttendedMutation: () => [vi.fn(), { isLoading: false }],
}))

vi.mock('@/features/admin/services/ownership.api', () => ({
  useGetUsersQuery: () => ({ data: [] }),
}))

vi.mock('./components/calendar/Calendar', () => ({
  default: ({ mode }: { mode: string }) => createElement('div', undefined, `CALENDAR:${mode}`),
}))

vi.mock('@/app/hooks', () => ({
  useAppSelector: (selector: (state: { auth: { user: { role: string } } }) => unknown) =>
    selector({ auth: { user: { role: 'EXPERT' } } }),
}))

describe('CoachZoomPanel', () => {
  it('uses the existing empty states instead of mock sessions when calendar data is empty', async () => {
    calendarSessions = []
    attendeesBySessionId = {}
    const { CoachZoomPanel } = await import('./CoachZoomPanel')
    const markup = renderToStaticMarkup(createElement(CoachZoomPanel, { expertId: 'expert-1' }))

    expect(markup).toContain('CALENDAR:coach')
    expect(markup).toContain('Правила')
    expect(markup).not.toContain('7-денний формат 1v1')
    expect(markup).not.toContain('ФОКУС · Zoom-практика')
    expect(markup).not.toContain('демо')
    expect(markup).not.toContain('ШАБЛОН РОЗКЛАДУ')
    expect(markup).not.toContain('AVAILABILITY_EDITOR')
    expect(markup).not.toContain('ІНДИВІДУАЛЬНІ СЛОТИ')
    expect(markup).not.toContain('НАЙБЛИЖЧІ СЕСІЇ')
    expect(markup).not.toContain('Battles ще не розпочато')
    expect(markup).not.toContain('Поки що немає battle перемог')
  })

  it('keeps upcoming session status out of the coach panel duplicate list', async () => {
    attendeesBySessionId = {}
    calendarSessions = [
      {
        id: 'session-1',
        scheduledAt: '2026-09-07T16:00:00.000Z',
        topic: 'Фокус · групова практика',
        status: 'SCHEDULED',
        type: 'group_practice',
        zoomLink: '',
        attendeesCount: 12,
        remainingSlots: 38,
      },
    ]

    const { CoachZoomPanel } = await import('./CoachZoomPanel')
    const markup = renderToStaticMarkup(createElement(CoachZoomPanel, { expertId: 'expert-1' }))

    expect(markup).toContain('CALENDAR:coach')
    expect(markup).not.toContain('НАЙБЛИЖЧІ СЕСІЇ')
    expect(markup).not.toContain('Потрібна дія')
    expect(markup).not.toContain('Посилання Zoom ще не додано')
    expect(markup).not.toContain('Додати посилання')
    expect(markup).not.toContain('12 / 50 учасників')
    expect(markup).not.toContain('Учасники')
    expect(markup).not.toContain('✓ -24h')
  })

  it('removes the separate individual slot presentation from the coach panel', async () => {
    calendarSessions = []
    attendeesBySessionId = {}
    const { CoachZoomPanel } = await import('./CoachZoomPanel')
    const markup = renderToStaticMarkup(createElement(CoachZoomPanel, { expertId: 'expert-1' }))

    expect(markup).not.toContain('ІНДИВІДУАЛЬНІ СЛОТИ')
    expect(markup).not.toContain('+ Додати індивідуальний слот')
    expect(markup).not.toContain('PRIVATE слот рекомендується створювати з місткістю 1.')
  })

  it('does not render upcoming individual session cards outside the calendar owner', async () => {
    calendarSessions = [
      {
        id: 'individual-session-1',
        scheduledAt: '2026-09-09T08:00:00.000Z',
        topic: 'Індивідуальна сесія',
        status: 'SCHEDULED',
        type: 'individual',
        zoomLink: 'https://zoom.us/j/individual',
        attendeesCount: 1,
        remainingSlots: 0,
      },
    ]
    attendeesBySessionId = {
      'individual-session-1': [{
        id: 'attendee-1',
        sessionId: 'individual-session-1',
        userId: 'user-1',
        attended: false,
        createdAt: '2026-09-01T00:00:00.000Z',
        user: {
          firstName: 'Марія',
          lastName: 'Коваль',
          email: 'maria@example.com',
        },
      }],
    }

    const { CoachZoomPanel } = await import('./CoachZoomPanel')
    const markup = renderToStaticMarkup(createElement(CoachZoomPanel, { expertId: 'expert-1' }))

    expect(markup).not.toContain('Індивідуальна сесія')
    expect(markup).not.toContain('Марія Коваль')
    expect(markup).not.toContain('user-1')
  })

  it('builds edit initial values from the persisted session without replacing an explicit link', async () => {
    const { getCoachSessionInitialValues } = await import('./CoachZoomPanel')

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
