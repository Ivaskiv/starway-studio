import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { ZoomCalendarSession } from '../../zoom.types'

const state = vi.hoisted(() => ({
  view: 'week' as 'week' | 'month',
  sessions: [] as ZoomCalendarSession[],
  weekDays: [
    new Date('2026-08-31T00:00:00.000Z'),
    new Date('2026-09-01T00:00:00.000Z'),
    new Date('2026-09-02T00:00:00.000Z'),
    new Date('2026-09-03T00:00:00.000Z'),
    new Date('2026-09-04T00:00:00.000Z'),
    new Date('2026-09-05T00:00:00.000Z'),
    new Date('2026-09-06T00:00:00.000Z'),
  ],
}))

vi.mock('../../hooks/useCalendar', () => ({
  useCalendar: () => ({
    mode: 'coach',
    userId: 'expert-1',
    view: state.view,
    setView: vi.fn(),
    sessions: state.sessions,
    monthGrid: state.weekDays,
    weekDays: state.weekDays,
    periodLabel: '31 – 6 Вересень',
    todaySession: null,
    selectedSession: null,
    setSelectedSession: vi.fn(),
    selectedDate: null,
    setSelectedDate: vi.fn(),
    selectedSessions: [],
    setSelectedSessions: vi.fn(),
    isDaySheetOpen: false,
    setIsDaySheetOpen: vi.fn(),
    bookingQuestionSession: null,
    bookingQuestionText: '',
    setBookingQuestionText: vi.fn(),
    bookingQuestionError: null,
    bookingConfirmation: null,
    bookingPreparationSessionId: null,
    bookingPreparationAnswer: '',
    setBookingPreparationAnswer: vi.fn(),
    bookingPreparationError: null,
    bookingPreparationSuccess: null,
    createDate: null,
    setCreateDate: vi.fn(),
    editingSession: null,
    setEditingSession: vi.fn(),
    editingParticipantUserId: null,
    creating: false,
    coachUsers: [],
    isSubmittingBookingQuestion: false,
    isSubmittingBookingPreparation: false,
    updateSession: vi.fn(),
    prevPeriod: vi.fn(),
    nextPeriod: vi.fn(),
    sessionsOnDay: (day: Date | null) =>
      day && day.getUTCDate() === 1 ? state.sessions : [],
    handleDayClick: vi.fn(),
    handleCreate: vi.fn(),
    handleCancel: vi.fn(),
    handleAddToCalendar: vi.fn(),
    openBookingQuestion: vi.fn(),
    closeBookingQuestion: vi.fn(),
    handleBookingConfirm: vi.fn(),
    openBookingPreparation: vi.fn(),
    closeBookingPreparation: vi.fn(),
    handleBookingPreparationConfirm: vi.fn(),
  }),
}))

vi.mock('./SessionCard', () => ({
  SessionCard: () => createElement('div', undefined, 'SESSION_CARD'),
}))

vi.mock('./SessionForm', () => ({
  SessionForm: () => createElement('form', undefined, 'SESSION_FORM'),
}))

vi.mock('./DaySessionsSheet', () => ({
  DaySessionsSheet: () => createElement('div', undefined, 'DAY_SESSIONS_SHEET'),
}))

vi.mock('./QuestionModal', () => ({
  QuestionModal: () => createElement('div', undefined, 'QUESTION_MODAL'),
}))

vi.mock('./PreparationModal', () => ({
  PreparationModal: () => createElement('div', undefined, 'PREPARATION_MODAL'),
}))

describe('Zoom Calendar coach presentation', () => {
  it('renders coach week mode as a vertical day list with one session under its day', async () => {
    state.view = 'week'
    state.sessions = [{
      id: 'session-1',
      scheduledAt: '2026-09-01T16:00:00.000Z',
      topic: 'ФОКУС · Zoom-практика',
      status: 'SCHEDULED',
      type: 'group_practice',
      zoomLink: 'https://zoom.us/j/123',
      attendeesCount: 4,
      remainingSlots: 46,
      canEdit: true,
    }]
    const { default: Calendar } = await import('./Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, { mode: 'coach', userId: 'expert-1' }))

    expect(markup).toContain('data-zoom-week-view="coach-vertical"')
    expect(markup).toContain('data-zoom-week-day="Пн"')
    expect(markup).toContain('data-zoom-week-day="Нд"')
    expect(markup.indexOf('Пн')).toBeLessThan(markup.indexOf('Вт'))
    expect(markup.indexOf('Вт')).toBeLessThan(markup.indexOf('ФОКУС · Zoom-практика'))
    expect(markup.match(/ФОКУС · Zoom-практика/g)).toHaveLength(1)
  })

  it('keeps the existing month grid renderer', async () => {
    state.view = 'month'
    state.sessions = []
    const { default: Calendar } = await import('./Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, { mode: 'coach', userId: 'expert-1' }))

    expect(markup).toContain('grid grid-cols-7')
    expect(markup).not.toContain('data-zoom-week-view="coach-vertical"')
  })
})
