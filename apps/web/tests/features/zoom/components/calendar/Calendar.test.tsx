import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { ZoomCalendarSession } from '@/features/zoom/zoom.types'

const state = vi.hoisted(() => ({
  view: 'week' as 'week' | 'month',
  currentDate: new Date('2026-09-01T00:00:00.000Z'),
  bookingConfirmation: {
    sessionId: 'booked-session',
    text: 'Ти записана на Zoom.\n\n👉 Я передам твоє питання коучу',
  },
  bookingPreparationSuccess: 'Добре. Я врахую це перед Zoom.',
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

vi.mock('@/features/zoom/hooks/useCalendar', () => ({
  useCalendar: (props: { mode: 'coach' | 'user'; userId: string }) => ({
    mode: props.mode,
    userId: props.userId,
    view: state.view,
    setView: vi.fn(),
    currentDate: state.currentDate,
    setCurrentDate: vi.fn(),
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
    bookingConfirmation: state.bookingConfirmation,
    bookingPreparationSessionId: null,
    bookingPreparationAnswer: '',
    setBookingPreparationAnswer: vi.fn(),
    bookingPreparationError: null,
    bookingPreparationSuccess: state.bookingPreparationSuccess,
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
      day
        ? state.sessions.filter(session => new Date(session.scheduledAt).getUTCDate() === day.getUTCDate())
        : [],
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

vi.mock('@/features/zoom/components/calendar/SessionCard', () => ({
  SessionCard: () => createElement('div', undefined, 'SESSION_CARD'),
}))

vi.mock('@/features/zoom/components/calendar/SessionForm', () => ({
  SessionForm: () => createElement('form', undefined, 'SESSION_FORM'),
}))

vi.mock('@/features/zoom/components/calendar/DaySessionsSheet', () => ({
  DaySessionsSheet: () => createElement('div', undefined, 'DAY_SESSIONS_SHEET'),
}))

vi.mock('@/features/zoom/components/calendar/QuestionModal', () => ({
  QuestionModal: () => createElement('div', undefined, 'QUESTION_MODAL'),
}))

describe('Zoom Calendar coach presentation', () => {
  it('finds the nearest eligible USER slot without treating booked, expired, or past items as availability', async () => {
    const { findNearestBookableUserSession } = await import('@/features/zoom/components/calendar/Calendar')
    const now = new Date('2026-10-23T10:00:00.000Z')
    const session = (id: string, scheduledAt: string, extra: Partial<ZoomCalendarSession> = {}): ZoomCalendarSession => ({
      id,
      scheduledAt,
      topic: id,
      status: 'SCHEDULED',
      type: 'group_practice',
      zoomLink: '',
      attendeesCount: 0,
      remainingSlots: 10,
      canEdit: false,
      ...extra,
    })

    const nearest = findNearestBookableUserSession([
      session('past', '2026-10-23T09:00:00.000Z'),
      session('cancelled', '2026-10-23T11:00:00.000Z', { status: 'CANCELLED' }),
      session('expired', '2026-10-23T11:30:00.000Z', { commerceStatus: 'EXPIRED' }),
      session('booked', '2026-10-23T12:00:00.000Z', { slotStatus: 'booked' }),
      session('nearest', '2026-10-23T13:00:00.000Z'),
      session('later', '2026-10-24T13:00:00.000Z'),
    ], now, true)

    expect(nearest?.id).toBe('nearest')
    expect(findNearestBookableUserSession([session('group', '2026-10-23T13:00:00.000Z')], now, false)).toBeNull()

    const source = readFileSync(new URL('../../../../../src/features/zoom/components/calendar/Calendar.tsx', import.meta.url), 'utf8')
    expect(source).toContain('onClick={findNearestAvailableSlots}')
    expect(source).not.toContain('onClick={props.onFindAvailableSlots}')
  })

  it('does not render the redundant post-booking coaching block in the USER calendar', async () => {
    const { default: Calendar } = await import('@/features/zoom/components/calendar/Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, { mode: 'user', userId: 'user-1' }))

    expect(markup).not.toContain('Ти записана на Zoom')
    expect(markup).not.toContain('Я передам твоє питання коучу')
    expect(markup).not.toContain('Зробити крок')
    expect(markup).not.toContain('Добре. Я врахую це перед Zoom')
    expect(readFileSync(new URL('../../../../../src/features/zoom/hooks/useCalendar.ts', import.meta.url), 'utf8'))
      .not.toContain('setBookingConfirmation')
  })

  it('renders a selectable seven-day USER week and limits session cards to the active date', async () => {
    state.view = 'week'
    state.currentDate = new Date('2026-09-01T00:00:00.000Z')
    state.sessions = [
      {
        id: 'selected-tuesday', scheduledAt: '2026-09-01T16:00:00.000Z', topic: 'Обрана дата',
        status: 'SCHEDULED', type: 'group_practice', zoomLink: '', attendeesCount: 1,
        canEdit: false, isMyBooking: false,
      },
      {
        id: 'other-wednesday', scheduledAt: '2026-09-02T16:00:00.000Z', topic: 'Інша дата',
        status: 'SCHEDULED', type: 'group_practice', zoomLink: '', attendeesCount: 1,
        canEdit: false, isMyBooking: false,
      },
    ]

    const { default: Calendar } = await import('@/features/zoom/components/calendar/Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, { mode: 'user', userId: 'user-1' }))
    const source = readFileSync(new URL('../../../../../src/features/zoom/components/calendar/Calendar.tsx', import.meta.url), 'utf8')

    expect(markup.match(/data-user-weekday-selector=/g)).toHaveLength(7)
    expect(markup).toContain('aria-label="Вибір дня тижня"')
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain('Обрана дата')
    expect(markup).not.toContain('Інша дата')
    expect(markup).toContain('СЬОГОДНІ')
    expect(markup).toContain('aria-label="Календар дат"')
    expect(markup).toContain('type="date"')
    expect(source).toContain('onClick={() => setCurrentDate(day)}')
    expect(source).toContain('onClick={() => setCurrentDate(new Date())}')
    expect(source).toContain('parseCalendarDateValue(event.currentTarget.value)')
    expect(source).toContain('onClick={prevPeriod}')
    expect(source).toContain('onClick={nextPeriod}')
  })

  it('collapses empty USER week days while retaining populated day cards', async () => {
    state.view = 'week'
    state.sessions = [{
      id: 'only-tuesday', scheduledAt: '2026-09-01T16:00:00.000Z', topic: 'Єдина сесія',
      status: 'SCHEDULED', type: 'group_practice', zoomLink: '', attendeesCount: 1,
      canEdit: false, isMyBooking: false,
    }]

    const { default: Calendar } = await import('@/features/zoom/components/calendar/Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, { mode: 'user', userId: 'user-1' }))

    expect(markup).toContain('data-zoom-week-day="Вт"')
    expect(markup).not.toContain('data-zoom-week-day="Пн"')
    expect(markup).not.toContain('data-zoom-week-day="Ср"')
    expect(markup).toContain('Єдина сесія')
    expect(markup).not.toContain('Немає запланованих сесій')
  })

  it('renders USER week session ranges in Europe/Kyiv regardless of browser timezone', async () => {
    state.view = 'week'
    state.currentDate = new Date('2026-09-01T00:00:00.000Z')
    state.sessions = [{
      id: 'kyiv-time', scheduledAt: '2026-09-01T13:15:00.000Z', durationMinutes: 60,
      topic: 'Індивідуальна сесія', status: 'SCHEDULED', type: 'individual', zoomLink: '',
      attendeesCount: 1, canEdit: false, isMyBooking: true,
    }]

    const { default: Calendar } = await import('@/features/zoom/components/calendar/Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, { mode: 'user', userId: 'user-1' }))

    expect(markup).toContain('16:15 – 17:15')
  })

  it('renders one compact empty USER week state with booking and next-week actions', async () => {
    state.view = 'week'
    state.sessions = []

    const { default: Calendar } = await import('@/features/zoom/components/calendar/Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, {
      mode: 'user', userId: 'user-1', onFindAvailableSlots: vi.fn(),
    }))

    expect(markup).toContain('data-zoom-week-empty="user"')
    expect(markup).toContain('data-zoom-week-empty-compact="true"')
    expect(markup).toContain('На вибраний день сесій немає.')
    expect(markup).toContain('НАЙБЛИЖЧІ СЛОТИ')
    expect(markup).toContain('НАСТУПНИЙ ТИЖДЕНЬ')
    expect(markup).not.toContain('Немає запланованих сесій')
    const source = readFileSync(new URL('../../../../../src/features/zoom/components/calendar/Calendar.tsx', import.meta.url), 'utf8')
    expect(source).toContain('data-zoom-week-empty-compact="true"')
    expect(source).toContain('flex flex-wrap items-center justify-between')
    expect(source).not.toContain('bg-white/[0.025] px-4 py-4 text-center')
  })

  it('sends a NO_ACCESS individual booking attempt to the supplied access gate without opening the booking flow', async () => {
    const { routeUserBookingAttempt } = await import('@/features/zoom/components/calendar/Calendar')
    const accessGate = vi.fn()
    const openBookingQuestion = vi.fn()

    routeUserBookingAttempt({
      session: {
        id: 'individual-open', scheduledAt: '2026-09-01T17:00:00.000Z', topic: 'Індивідуальна сесія',
        status: 'SCHEDULED', type: 'individual', zoomLink: '', attendeesCount: 0,
        remainingSlots: 1, canEdit: false, isMyBooking: false,
      },
      hasFocusAccess: false,
      onAccessRequired: accessGate,
      onBookingAllowed: openBookingQuestion,
    })

    expect(accessGate).toHaveBeenCalledTimes(1)
    expect(openBookingQuestion).not.toHaveBeenCalled()
  })

  it('recognizes only a genuinely free future individual slot for the panel booking sheet', async () => {
    const { isAvailableIndividualSlot } = await import('@/features/zoom/components/calendar/Calendar')
    const freeSlot = {
      id: 'individual-free', scheduledAt: '2026-12-01T17:00:00.000Z', topic: 'Індивідуальна сесія',
      status: 'SCHEDULED', type: 'individual', zoomLink: '', attendeesCount: 0,
      remainingSlots: 1, canEdit: false, isMyBooking: false,
    } as ZoomCalendarSession

    expect(isAvailableIndividualSlot(freeSlot)).toBe(true)
    expect(isAvailableIndividualSlot({ ...freeSlot, remainingSlots: 0 })).toBe(false)
    expect(isAvailableIndividualSlot({ ...freeSlot, slotStatus: 'booked' })).toBe(false)
    expect(isAvailableIndividualSlot({ ...freeSlot, commerceStatus: 'REQUESTED' })).toBe(false)
  })

  it('renders NO_ACCESS Group enrollment with its canonical label', async () => {
    state.view = 'week'
    const originalCurrentDate = state.currentDate
    const originalWeekDays = state.weekDays
    const futureDate = new Date('2026-12-01T00:00:00.000Z')
    state.currentDate = futureDate
    state.weekDays = [
      new Date('2026-11-30T00:00:00.000Z'),
      futureDate,
      new Date('2026-12-02T00:00:00.000Z'),
      new Date('2026-12-03T00:00:00.000Z'),
      new Date('2026-12-04T00:00:00.000Z'),
      new Date('2026-12-05T00:00:00.000Z'),
      new Date('2026-12-06T00:00:00.000Z'),
    ]
    state.sessions = [
      {
        id: 'group-no-access', scheduledAt: '2026-12-01T16:00:00.000Z', topic: 'Групова практика',
        status: 'SCHEDULED', type: 'group_practice', zoomLink: '', attendeesCount: 1,
        remainingSlots: 9, canEdit: false, isMyBooking: false,
      },
    ]

    const { default: Calendar } = await import('@/features/zoom/components/calendar/Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, {
      mode: 'user', userId: 'user-1', hasFocusAccess: false, onRestrictedGroupAction: vi.fn(),
    }))
    state.currentDate = originalCurrentDate
    state.weekDays = originalWeekDays

    expect(markup).toContain('Групова практика')
    expect(markup).toContain('НАБІР ВІДКРИТО')
    expect(markup).not.toContain('Оплату не підтверджено')
  })

  it('uses the canonical USER status mapping without compound payment labels', async () => {
    state.view = 'week'
    state.sessions = [
      {
        id: 'requested', scheduledAt: '2026-09-01T10:00:00.000Z', topic: 'Індивідуальна сесія',
        status: 'SCHEDULED', type: 'individual', zoomLink: '', attendeesCount: 0,
        commerceStatus: 'REQUESTED', commerceLabel: 'legacy', canEdit: false,
      },
      {
        id: 'pending-payment', scheduledAt: '2026-09-01T11:00:00.000Z', topic: 'Індивідуальна сесія',
        status: 'SCHEDULED', type: 'individual', zoomLink: '', attendeesCount: 0,
        commerceStatus: 'APPROVED_PENDING_PAYMENT', commerceLabel: 'legacy', canEdit: false,
      },
      {
        id: 'paid', scheduledAt: '2026-09-01T12:00:00.000Z', topic: 'Індивідуальна сесія',
        status: 'SCHEDULED', type: 'individual', zoomLink: '', attendeesCount: 1,
        commerceStatus: 'PAID', commerceLabel: 'Оплачено · Заплановано', canEdit: false,
      },
      {
        id: 'free', scheduledAt: '2026-09-01T13:00:00.000Z', topic: 'Індивідуальна сесія',
        status: 'SCHEDULED', type: 'individual', zoomLink: '', attendeesCount: 0,
        remainingSlots: 1, canEdit: false, isMyBooking: false,
      },
    ]

    const { default: Calendar } = await import('@/features/zoom/components/calendar/Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, { mode: 'user', userId: 'user-1' }))

    expect(markup).toContain('ОЧІКУЄ ДІЇ КОУЧА')
    expect(markup).toContain('ОЧІКУЄ ОПЛАТИ')
    expect(markup).toContain('ОПЛАЧЕНО')
    expect(markup).toContain('ВІЛЬНИЙ СЛОТ')
    expect(markup).not.toContain('Оплачено · Заплановано')
  })

  it('renders an expired Individual reservation muted and disabled without a detail affordance', async () => {
    state.view = 'week'
    state.sessions = [{
      id: 'expired-individual',
      scheduledAt: '2026-09-01T10:00:00.000Z',
      topic: 'Індивідуальна сесія',
      status: 'SCHEDULED',
      type: 'private',
      commerceStatus: 'EXPIRED',
      commerceLabel: 'Час оплати вичерпано',
      isMyPendingPayment: false,
      checkoutUrl: null,
      paymentDeadline: null,
      zoomLink: '',
      attendeesCount: 0,
      canEdit: false,
    }]

    const { default: Calendar } = await import('@/features/zoom/components/calendar/Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, { mode: 'user', userId: 'user-1' }))

    expect(markup).toContain('ЧАС ОПЛАТИ ВИЧЕРПАНО')
    expect(markup).toContain('disabled=""')
    expect(markup).toContain('cursor-not-allowed')
    expect(markup).toContain('opacity-55')
    expect(markup).not.toContain('hover:brightness-110')
    expect(markup).not.toContain('›')
    expect(markup).not.toContain('ОПЛАТИТИ')
  })

  it('keeps an actionable pending Individual reservation openable', async () => {
    state.view = 'week'
    state.sessions = [{
      id: 'pending-individual',
      scheduledAt: '2026-09-01T10:00:00.000Z',
      topic: 'Індивідуальна сесія',
      status: 'SCHEDULED',
      type: 'private',
      commerceStatus: 'APPROVED_PENDING_PAYMENT',
      commerceLabel: 'Очікує оплати',
      isMyPendingPayment: true,
      checkoutUrl: 'https://checkout.example/existing',
      paymentDeadline: '2026-09-01T10:30:00.000Z',
      zoomLink: '',
      attendeesCount: 0,
      canEdit: false,
    }]

    const { default: Calendar } = await import('@/features/zoom/components/calendar/Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, { mode: 'user', userId: 'user-1' }))
    const source = readFileSync(new URL('../../../../../src/features/zoom/components/calendar/Calendar.tsx', import.meta.url), 'utf8')

    expect(markup).toContain('ОЧІКУЄ ОПЛАТИ')
    expect(markup).not.toContain('disabled=""')
    expect(markup).toContain('hover:brightness-110')
    expect(markup).toContain('›')
    expect(source).toContain('if (isExpiredIndividualReservation(session)) return')
    expect(source).toContain('onClick={isDisabledReservation ? undefined : () => openUserSession(s)}')
  })

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
    const { default: Calendar } = await import('@/features/zoom/components/calendar/Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, { mode: 'coach', userId: 'expert-1' }))

    expect(markup).toContain('data-zoom-week-view="coach-vertical"')
    expect(markup).toContain('data-zoom-week-day="Пн"')
    expect(markup).toContain('data-zoom-week-day="Нд"')
    expect(markup.indexOf('Пн')).toBeLessThan(markup.indexOf('Вт'))
    expect(markup.indexOf('Вт')).toBeLessThan(markup.indexOf('ФОКУС · Zoom-практика'))
    expect(markup.match(/ФОКУС · Zoom-практика/g)).toHaveLength(1)
  })

  it('renders complete group, individual and battle details in coach week cards', async () => {
    state.view = 'week'
    state.sessions = [
      {
        id: 'group-session',
        scheduledAt: '2026-09-01T16:00:00.000Z',
        topic: 'ФОКУС · Zoom-практика',
        status: 'SCHEDULED',
        type: 'group_practice',
        zoomLink: '',
        attendeesCount: 0,
        remainingSlots: 50,
        canEdit: true,
      },
      {
        id: 'individual-session',
        scheduledAt: '2026-09-01T17:00:00.000Z',
        topic: 'Індивідуальна сесія',
        status: 'SCHEDULED',
        type: 'individual',
        zoomLink: '',
        attendeesCount: 1,
        remainingSlots: 0,
        participantNames: ['Марія К.'],
        questionPreviews: ['Питання про фокус'],
        canEdit: true,
      },
      {
        id: 'battle-session',
        scheduledAt: '2026-09-01T18:00:00.000Z',
        topic: 'Zoom Battle',
        status: 'SCHEDULED',
        type: 'battle_review',
        zoomLink: '',
        attendeesCount: 2,
        remainingSlots: 0,
        challengerId: 'user-1',
        opponentId: 'user-2',
        challengerName: 'Vira',
        opponentName: 'Marta',
        battleStatus: 'completed',
        goalA: '7 днів практики',
        goalB: '5 кроків фокусу',
        winnerId: 'user-2',
        canEdit: true,
      },
    ]

    const { default: Calendar } = await import('@/features/zoom/components/calendar/Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, { mode: 'coach', userId: 'expert-1' }))

    expect(markup).toContain('0/50 учасників')
    expect(markup).toContain('Марія К.')
    expect(markup).toContain('Питання про фокус')
    expect(markup).toContain('Vira vs Marta')
    expect(markup).toContain('Завершено')
    expect(markup).toContain('Ціль 1: 7 днів практики')
    expect(markup).toContain('Ціль 2: 5 кроків фокусу')
    expect(markup).toContain('Результат: Marta')
  })

  it('keeps the existing month grid renderer', async () => {
    state.view = 'month'
    state.sessions = []
    const { default: Calendar } = await import('@/features/zoom/components/calendar/Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, { mode: 'coach', userId: 'expert-1' }))

    expect(markup).toContain('grid grid-cols-7')
    expect(markup).not.toContain('data-zoom-week-view="coach-vertical"')
  })
})
