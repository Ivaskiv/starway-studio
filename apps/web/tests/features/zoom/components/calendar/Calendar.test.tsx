import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { ZoomCalendarSession } from '@/features/zoom/zoom.types'

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

vi.mock('@/features/zoom/hooks/useCalendar', () => ({
  useCalendar: (props: { mode: 'coach' | 'user'; userId: string }) => ({
    mode: props.mode,
    userId: props.userId,
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

vi.mock('@/features/zoom/components/calendar/PreparationModal', () => ({
  PreparationModal: () => createElement('div', undefined, 'PREPARATION_MODAL'),
}))

describe('Zoom Calendar coach presentation', () => {
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

  it('renders one compact empty USER week state with booking and next-week actions', async () => {
    state.view = 'week'
    state.sessions = []

    const { default: Calendar } = await import('@/features/zoom/components/calendar/Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, {
      mode: 'user', userId: 'user-1', onFindAvailableSlots: vi.fn(),
    }))

    expect(markup).toContain('data-zoom-week-empty="user"')
    expect(markup).toContain('Цього тижня сесій немає.')
    expect(markup).toContain('НАЙБЛИЖЧІ СЛОТИ')
    expect(markup).toContain('НАСТУПНИЙ ТИЖДЕНЬ')
    expect(markup).not.toContain('Немає запланованих сесій')
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

  it('keeps NO_ACCESS Group and free Individual slots visible without a false payment label', async () => {
    state.view = 'week'
    state.sessions = [
      {
        id: 'group-no-access', scheduledAt: '2026-09-01T16:00:00.000Z', topic: 'Групова практика',
        status: 'SCHEDULED', type: 'group_practice', zoomLink: '', attendeesCount: 1,
        remainingSlots: 9, canEdit: false, isMyBooking: false,
      },
      {
        id: 'individual-free', scheduledAt: '2026-09-01T17:00:00.000Z', topic: 'Індивідуальна сесія',
        status: 'SCHEDULED', type: 'individual', zoomLink: '', attendeesCount: 0,
        remainingSlots: 1, canEdit: false, isMyBooking: false,
        commerceLabel: 'Оплату не підтверджено',
      },
    ]

    const { default: Calendar } = await import('@/features/zoom/components/calendar/Calendar')
    const markup = renderToStaticMarkup(createElement(Calendar, {
      mode: 'user', userId: 'user-1', hasFocusAccess: false, onRestrictedGroupAction: vi.fn(),
    }))

    expect(markup).toContain('Групова практика')
    expect(markup).toContain('Індивідуальна сесія')
    expect(markup).toContain('ДОСТУПНО')
    expect(markup).toContain('ВІЛЬНИЙ СЛОТ')
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

    expect(markup).toContain('ЗАПИТ СТВОРЕНО')
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
