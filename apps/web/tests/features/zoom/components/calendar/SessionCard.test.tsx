import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ZoomCalendarSession } from '@/features/zoom/zoom.types'
import { getUserZoomCommercePresentation } from '@/features/zoom/zoom.utils'
import { getCoachPrimaryStatus } from '@/features/zoom/utils/coachCalendarPresentation'

vi.mock('@/features/zoom/zoom.api', () => ({
  useBookPrivateSlotMutation: () => [vi.fn(), { isLoading: false }],
  useBookSlotMutation: () => [vi.fn(), { isLoading: false }],
  useCancelZoomCommerceRequestMutation: () => [vi.fn(), { isLoading: false }],
  useCancelPrivateBookingMutation: () => [vi.fn(), { isLoading: false }],
  useCompleteZoomSessionMutation: () => [vi.fn(() => ({ unwrap: vi.fn() })), { isLoading: false }],
  useLazyGetZoomCompletionDraftQuery: () => [vi.fn(() => ({ unwrap: vi.fn() })), { isFetching: false }],
  useCreateSwapRequestMutation: () => [vi.fn(), { isLoading: false }],
  useSaveSelfReportedAttendanceMutation: () => [vi.fn(() => ({ unwrap: vi.fn() })), { isLoading: false }],
  useUnbookSlotMutation: () => [vi.fn(), { isLoading: false }],
}))

vi.mock('@/features/subscription/utils/openExternalPaymentUrl', () => ({
  openExternalPaymentUrl: vi.fn(),
}))

describe('SessionCard', () => {
  it('shows each coach attendee with their own question or no question', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const session = { id: 'group', type: 'group_practice', status: 'SCHEDULED', scheduledAt: '2099-10-27T17:00:00Z', topic: 'Практика', canEdit: true, zoomLink: '', attendees: [
      { userId: 'a', name: 'Анна', attended: false, question: 'Питання А' },
      { userId: 'b', name: 'Богдан', attended: false, question: 'Питання Б' },
      { userId: 'c', name: 'Віра', attended: false, question: null },
    ] } as ZoomCalendarSession
    const markup = renderToStaticMarkup(createElement(SessionCard, { session, mode: 'coach', userId: 'coach', onClose: vi.fn(), onAddToCalendar: vi.fn() }))
    expect(markup).toMatch(/Анна[\s\S]*?Питання А[\s\S]*?Богдан[\s\S]*?Питання Б[\s\S]*?Віра[\s\S]*?БЕЗ ПИТАННЯ/)
    expect(markup.match(/ЗАПИСАНИЙ/g)).toHaveLength(3)
  })
  it('shows the previous Kyiv time in rescheduled coach group details only', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const session: ZoomCalendarSession = { id: 'moved', type: 'group_practice', status: 'SCHEDULED', scheduledAt: '2026-10-27T17:00:00.000Z', previousScheduledAt: '2026-11-02T17:00:00.000Z', rescheduledAt: '2026-10-27T14:52:56.000Z', topic: 'Практика', canEdit: true, attendeesCount: 1, remainingSlots: 49, zoomLink: '', attendees: [{ userId: 'user-1', name: 'Учасниця', attended: false, question: 'Питання до практики' }] }
    const render = (value: ZoomCalendarSession) => renderToStaticMarkup(createElement(SessionCard, { session: value, mode: 'coach', userId: 'coach', onClose: vi.fn(), onAddToCalendar: vi.fn() }))
    expect(render(session)).toContain('ПЕРЕНЕСЕНО')
    expect(render(session)).toContain('Було:')
    expect(render(session)).toContain('Перенесено:')
    expect(render({ ...session, rescheduledAt: null })).toContain('недоступно')
    expect(render(session)).toContain('1 / 50')
    expect(render(session)).toContain('Учасниця')
    expect(render(session)).toContain('Питання до практики')
    expect(render({ ...session, previousScheduledAt: undefined })).not.toContain('ПЕРЕНЕСЕНО')
  })
  it('presents the October 12 group practice as past on October 17 without changing attendance or completion', async () => {
    const session: ZoomCalendarSession = {
      id: 'october-12-group',
      type: 'group_practice',
      status: 'SCHEDULED',
      isMyBooking: true,
      attendees: [{ userId: 'user-1', name: 'Vira', attended: false }],
      scheduledAt: '2026-10-12T15:00:00.000Z',
      durationMinutes: 60,
      topic: 'ФОКУС',
      canEdit: true,
      zoomLink: '',
    }

    const now = new Date('2026-10-17T12:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)
    try {
      expect(getUserZoomCommercePresentation(session).label).toBe('МИНУЛА')
      expect(getCoachPrimaryStatus(session)).toMatchObject({ label: 'МИНУЛА' })
      const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
      const markup = renderToStaticMarkup(createElement(SessionCard, {
        session,
        mode: 'user',
        userId: 'user-1',
        onClose: vi.fn(),
        onAddToCalendar: vi.fn(),
      }))
      expect(markup).toContain('МИНУЛА')
      expect(markup).not.toContain('ЗАПИСАТИСЯ НА ПРАКТИКУ')
      expect(session.status).toBe('SCHEDULED')
      expect(session.attendees?.[0].attended).toBe(false)
      expect(now.getTime()).toBeGreaterThan(new Date(session.scheduledAt).getTime() + 60 * 60_000)
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps an October 17 group practice upcoming until its end, then completed only when confirmed', () => {
    const upcoming: ZoomCalendarSession = {
      id: 'october-17-group',
      type: 'group_practice',
      status: 'SCHEDULED',
      isMyBooking: true,
      scheduledAt: '2026-10-17T15:00:00.000Z',
      durationMinutes: 60,
      topic: 'ФОКУС',
      canEdit: true,
      zoomLink: '',
    }

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-17T12:00:00.000Z'))
    try {
      expect(getUserZoomCommercePresentation(upcoming).label).toBe('ВИ ЗАПИСАНІ')
      expect(getCoachPrimaryStatus(upcoming)).toMatchObject({ label: 'ЗАПЛАНОВАНО' })
      expect(getUserZoomCommercePresentation({ ...upcoming, status: 'COMPLETED' }).label).toBe('ЗАВЕРШЕНО')
      expect(getCoachPrimaryStatus({ ...upcoming, status: 'COMPLETED' })).toMatchObject({ label: 'ЗАВЕРШЕНО' })
    } finally {
      vi.useRealTimers()
    }
  })
  it.each(['COMPLETED', 'CANCELLED'] as const)('keeps a terminal USER individual commitment historical: %s', async (status) => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: { id: 'owned-history', type: 'individual', status, commerceRequestId: 'owned-request', topic: 'Стратегія', scheduledAt: '2099-10-10T10:00:00Z', canEdit: false, attendeesCount: 0, remainingSlots: 1, zoomLink: '' },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))
    expect(markup).toContain('ІНДИВІДУАЛЬНА СЕСІЯ')
    expect(markup).toContain(status === 'COMPLETED' ? 'ЗАВЕРШЕНО' : 'СКАСОВАНО')
    expect(markup).toContain('Стратегія')
    expect(markup).not.toContain('Забронювати слот')
    expect(markup).not.toContain('Після запису ти отримаєш доступ до Zoom')
  })

  it('renders a user-owned cancelled commerce request in history, not the operational calendar', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: { id: 'cancelled-commerce-session', type: 'individual', status: 'SCHEDULED', commerceRequestId: 'cancelled-request', commerceStatus: 'CANCELLED', topic: 'Стратегія', scheduledAt: '2099-10-10T10:00:00Z', canEdit: false, attendeesCount: 0, remainingSlots: 1, zoomLink: '' },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))
    expect(markup).toContain('ІНДИВІДУАЛЬНА СЕСІЯ')
    expect(markup).toContain('СКАСОВАНО')
    expect(markup).not.toContain('ЗАПИСАТИСЯ НА СЕСІЮ')
  })

  it('presents a cancelled uncommitted coach slot as removable inventory, not booking history', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: { id: 'cancelled-free-slot', type: 'individual', status: 'CANCELLED', isDisposableIndividualSlot: true, topic: 'Індивідуальна сесія', scheduledAt: '2099-10-10T10:00:00Z', canEdit: true, attendeesCount: 0, remainingSlots: 1, zoomLink: '' },
      mode: 'coach', userId: 'coach-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))
    expect(markup).toContain('ІНДИВІДУАЛЬНИЙ СЛОТ')
    expect(markup).toContain('СКАСОВАНО')
    expect(markup).toContain('Скасований слот')
    expect(markup).toContain('Він не має записів, оплат чи історії участі.')
    expect(markup).toContain('ВИДАЛИТИ СЛОТ')
  })

  it.each([
    ['SCHEDULED', '2020-10-10T10:00:00Z'],
    ['SCHEDULED', '2099-10-10T10:00:00Z'],
    ['CANCELLED', '2099-10-10T10:00:00Z'],
  ] as const)('does not render uncommitted USER inventory: %s at %s', async (status, scheduledAt) => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: { id: 'inventory', type: 'individual', status, isDisposableIndividualSlot: true, topic: 'Free inventory', scheduledAt, canEdit: false, attendeesCount: 0, zoomLink: '' },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))
    expect(markup).toBe('')
  })

  it.each([
    ['SCHEDULED', false, 'НАБІР ВІДКРИТО'],
    ['SCHEDULED', true, 'ВИ ЗАПИСАНІ'],
    ['COMPLETED', true, 'ЗАВЕРШЕНО'],
    ['CANCELLED', true, 'СКАСОВАНО'],
  ] as const)('renders one USER Group Practice lifecycle: %s booked=%s', async (status, isMyBooking, label) => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: { id: 'group', type: 'group_practice', status, isMyBooking, topic: 'ФОКУС', scheduledAt: '2099-10-10T10:00:00Z', canEdit: false, attendeesCount: 0, remainingSlots: 50, zoomLink: '' },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))
    expect(markup).toMatch(new RegExp('>ГРУПОВА ПРАКТИКА</span><span[^>]*>' + label + '</span>'))
    expect(markup).not.toContain('Після запису ти отримаєш доступ до Zoom')
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      expect(markup).not.toContain('НАБІР ВІДКРИТО')
      expect(markup).not.toContain('ЗАПИСАТИСЯ НА ПРАКТИКУ')
    } else if (!isMyBooking) expect(markup).toContain('ЗАПИСАТИСЯ НА ПРАКТИКУ')
  })

  it.each([
    ['APPROVED_PENDING_PAYMENT', 'ОЧІКУЄ ОПЛАТИ', 'https://checkout.example/existing', true],
    ['APPROVED_PENDING_PAYMENT', 'ОЧІКУЄ ОПЛАТИ', null, false],
    ['REQUESTED', 'ОЧІКУЄ ДІЇ КОУЧА', null, false],
    ['PAID', 'ОПЛАЧЕНО', null, false],
    ['REJECTED', 'ВІДХИЛЕНО', null, false],
    ['EXPIRED', 'ЧАС ОПЛАТИ ВИЧЕРПАНО', null, false],
    ['CANCELLED', 'СКАСОВАНО', null, false],
  ] as const)('renders Individual %s with checkout %s', async (commerceStatus, commerceLabel, checkoutUrl, showPayment) => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const session: ZoomCalendarSession = {
      id: 'individual-1', type: 'individual', status: 'SCHEDULED', topic: 'Індивідуальна сесія',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(), canEdit: false,
      attendeesCount: commerceStatus === 'PAID' ? 1 : 0,
      zoomLink: commerceStatus === 'PAID' ? 'https://zoom.us/j/1' : '',
      commerceStatus, commerceLabel, checkoutUrl, commerceRequestId: 'owned-request',
      isMyPendingPayment: commerceStatus === 'APPROVED_PENDING_PAYMENT',
      isMyBooking: commerceStatus === 'PAID',
    }
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session, mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))
    expect(markup).toContain(commerceLabel)
    expect(markup).not.toContain('Заплановано')
    expect(markup).not.toContain('ПЕРЕНЕСТИ СЕСІЮ')
    expect(markup.match(/ОПЛАТИТИ/g)?.length ?? 0).toBe(showPayment ? 1 : 0)
    if (commerceStatus === 'EXPIRED') {
      expect(markup).toContain('ЗАБРОНЮВАТИ ЗНОВУ')
      expect(markup).not.toContain('ОПЛАТИТИ')
    } else {
      expect(markup).not.toContain('ОБРАТИ ІНШИЙ ЧАС')
    }
    if (commerceStatus === 'PAID') {
      expect(markup).toContain('Ти записана')
      expect(markup).toContain('href="https://zoom.us/j/1"')
    } else {
      expect(markup).not.toContain('href="https://zoom.us/j/1"')
    }
  })

  it.each([
    ['past', new Date(Date.now() - 60_000).toISOString(), 1, undefined],
    ['occupied', new Date(Date.now() + 60_000).toISOString(), 0, 'booked'],
  ] as const)('keeps an expired Individual request on slot selection when the slot is %s', async (_, scheduledAt, remainingSlots, slotStatus) => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'expired-individual', type: 'individual', status: 'SCHEDULED', topic: 'Індивідуальна сесія',
        scheduledAt, canEdit: false, attendeesCount: 0, remainingSlots, slotStatus,
        commerceRequestId: 'expired-request', commerceStatus: 'EXPIRED', commerceLabel: 'ЧАС ОПЛАТИ ВИЧЕРПАНО',
        zoomLink: '',
      },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onRequestBooking: vi.fn(), onFindAvailableSlots: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup).toContain('ОБРАТИ ІНШИЙ ЧАС')
    expect(markup).toContain('СЛОТ НЕДОСТУПНИЙ')
    expect(markup).not.toContain('ЗАБРОНЮВАТИ ЗНОВУ')
    expect(markup).not.toContain('ОПЛАТИТИ')
  })

  it('explains that a requested session needs the coach decision before payment', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'requested-individual', type: 'individual', status: 'SCHEDULED', topic: 'Індивідуальна сесія',
        scheduledAt: new Date(Date.now() + 60_000).toISOString(), canEdit: false, attendeesCount: 0, zoomLink: '',
        commerceStatus: 'REQUESTED', commerceRequestId: 'requested-1', commerceLabel: 'legacy',
      },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup).toContain('ОЧІКУЄ ДІЇ КОУЧА')
    expect(markup).toContain('Коуч має схвалити або відхилити запит. Оплата стане доступною лише після схвалення.')
    expect(markup).not.toContain('ОПЛАТИТИ')
  })

  it('keeps a cancelled commerce commitment as a session, never disposable slot inventory', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'future-individual-slot', type: 'individual', status: 'SCHEDULED', topic: 'Індивідуальна сесія',
        scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), canEdit: true,
        attendeesCount: 0, remainingSlots: 1, zoomLink: '', commerceRequestId: 'cancelled-request', commerceStatus: 'CANCELLED', commerceLabel: 'СКАСОВАНО',
      },
      mode: 'coach', userId: 'coach-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup).toContain('Індивідуальна сесія')
    expect(markup).toContain('ІНДИВІДУАЛЬНА')
    expect(markup).toContain('СКАСОВАНО')
    expect(markup).not.toContain('ІНДИВІДУАЛЬНИЙ СЛОТ')
    expect(markup).not.toContain('Вільний слот')
  })

  it('does not project a past committed individual session as completed without a persisted completion', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'past-individual-session', type: 'individual', status: 'SCHEDULED', topic: 'Стратегічна сесія',
        scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), durationMinutes: 60, canEdit: true,
        attendeesCount: 1, remainingSlots: 0, zoomLink: '', attendees: [{ userId: 'user-1', name: 'Олена', attended: false }],
      },
      mode: 'coach', userId: 'coach-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup).not.toContain('ПРОЙШЛА')
    expect(markup).toContain('ІНДИВІДУАЛЬНА')
    expect(markup).toContain('Учасник: Олена')
    expect(markup).not.toContain('Сесію завершено')
    expect(markup).not.toContain('Завершити сесію')
  })

  it('projects an expired uncommitted individual item as a slot with no participant, payment, or report actions', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'expired-individual-slot', type: 'individual', status: 'SCHEDULED', topic: 'Індивідуальна сесія',
        scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), durationMinutes: 60, canEdit: true,
        attendeesCount: 0, remainingSlots: 1, zoomLink: '',
      },
      mode: 'coach', userId: 'coach-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup).toContain('ІНДИВІДУАЛЬНИЙ СЛОТ')
    expect(markup).toContain('МИНУВ')
    expect(markup).toContain('Слот завершився')
    expect(markup).toContain('На цей час ніхто не записався.')
    expect(markup).toContain('Слот автоматично завершився.')
    expect(markup).toContain('Додаткових дій не потрібно.')
    expect(markup).not.toContain('Учасник:')
    expect(markup).not.toContain('Оплата:')
    expect(markup).not.toContain('ЗАВЕРШЕНО')
  })

  it('labels a future committed individual session as confirmed without exposing coach-only scheduling actions to users', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'future-confirmed-individual', type: 'individual', status: 'SCHEDULED', topic: 'Стратегія',
        scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), durationMinutes: 60, canEdit: false,
        attendeesCount: 1, remainingSlots: 0, isMyBooking: true, zoomLink: '', participantNames: ['Олена'],
      },
      mode: 'coach', userId: 'coach-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup).toContain('ІНДИВІДУАЛЬНА')
    expect(markup).toContain('ПІДТВЕРДЖЕНО')
    expect(markup).toContain('Учасник: Олена')
    expect(markup).toContain('Тема: Стратегія')
  })

  it('renders the persisted development payment terms instead of a production price', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'individual-dev-payment', type: 'individual', status: 'SCHEDULED', topic: 'Індивідуальна сесія',
        scheduledAt: new Date(Date.now() + 60_000).toISOString(), canEdit: false,
        attendeesCount: 0, isMyBooking: false, isMyPendingPayment: true,
        commerceStatus: 'APPROVED_PENDING_PAYMENT', commerceLabel: 'ОЧІКУЄ ОПЛАТИ',
        checkoutUrl: 'https://checkout.example/one-uah', priceCents: 100, currency: 'UAH',
        paymentDeadline: '2026-09-21T10:30:00.000Z',
      },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup).toContain('ОПЛАТИТИ')
    expect(markup).toContain('1 ГРН')
    expect(markup).not.toContain('60 EUR')
    expect(markup).not.toContain('60 EUR')
    expect(markup).toContain('Цей час тимчасово заброньований за тобою.')
    expect(markup).toContain('Заверши оплату до 13:30 (час за Києвом).')
    expect(markup).toContain('Після цього бронювання автоматично скасується, а час стане доступним для інших.')
    expect(markup).toContain('Zoom-посилання стане доступним після підтвердження оплати.')
    expect(markup.match(/ОЧІКУЄ ОПЛАТИ/g)?.length ?? 0).toBe(1)
    expect(markup.match(/>1 ГРН<\/span>/g)?.length ?? 0).toBe(1)
    expect(markup.match(/Заверши оплату до/g)?.length ?? 0).toBe(1)
    expect(markup.match(/ОПЛАТИТИ/g)?.length ?? 0).toBe(1)
    expect(markup).not.toContain('💳')
    const source = readFileSync(new URL('../../../../../src/features/zoom/components/calendar/SessionCard.tsx', import.meta.url), 'utf8')
    expect(source).toContain('openExternalPaymentUrl(session.checkoutUrl!)')
  })

  it('renders real pending-request fields and uses commerce cancellation rather than attendee cancellation', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'individual-pending-card', type: 'individual', status: 'SCHEDULED', topic: 'Індивідуальна сесія',
        scheduledAt: new Date(Date.now() + 60_000).toISOString(), canEdit: false,
        attendeesCount: 0, isMyBooking: false, isMyPendingPayment: true,
        commerceRequestId: 'commerce-1', commerceStatus: 'APPROVED_PENDING_PAYMENT',
        checkoutUrl: 'https://checkout.example/one-uah', priceCents: 100, currency: 'UAH',
        durationMinutes: 60, goalText: 'Потрібен план дій', coach: { id: 'expert-1', name: 'Надія Старвей' },
      },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup).toContain('ОЧІКУЄ ОПЛАТИ')
    expect(markup).toContain('ОЧІКУЄ ОПЛАТИ')
    expect(markup).toContain('Надія Старвей')
    expect(markup).toContain('Потрібен план дій')
    expect(markup).toContain('1 ГРН')
    expect(markup).toContain('ОПЛАТИТИ')
    expect(markup).toContain('СКАСУВАТИ ЗАПИТ')
    const source = readFileSync(new URL('../../../../../src/features/zoom/components/calendar/SessionCard.tsx', import.meta.url), 'utf8')
    expect(source).toContain('cancelCommerceRequest(session.commerceRequestId).unwrap()')
    expect(source).not.toContain('cancelPrivateBooking(session.commerceRequestId)')
  })

  it('keeps a non-actionable pending Individual state human-readable without duplicate payment status or CTA', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'individual-expired-checkout', type: 'individual', status: 'SCHEDULED', topic: 'Індивідуальна сесія',
        scheduledAt: new Date(Date.now() + 60_000).toISOString(), canEdit: false,
        attendeesCount: 0, isMyBooking: false, isMyPendingPayment: true,
        commerceStatus: 'APPROVED_PENDING_PAYMENT', commerceLabel: 'ОЧІКУЄ ОПЛАТИ',
        checkoutUrl: null, priceCents: 100, currency: 'UAH',
      },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup.match(/ОЧІКУЄ ОПЛАТИ/g)?.length ?? 0).toBe(1)
    expect(markup.match(/ОПЛАТИТИ/g)?.length ?? 0).toBe(0)
  })

  it('renders production-like persisted payment terms without a frontend price fallback', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'individual-production-payment', type: 'individual', status: 'SCHEDULED', topic: 'Індивідуальна сесія',
        scheduledAt: new Date(Date.now() + 60_000).toISOString(), canEdit: false,
        attendeesCount: 0, isMyBooking: false, isMyPendingPayment: true,
        commerceRequestId: 'commerce-production',
        commerceStatus: 'APPROVED_PENDING_PAYMENT', commerceLabel: 'ОЧІКУЄ ОПЛАТИ',
        checkoutUrl: 'https://checkout.example/production', priceCents: 6000, currency: 'EUR',
      },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup).toContain('ОПЛАТИТИ')
    expect(markup).toContain('60 EUR')
    expect(markup).not.toContain('1 ГРН')
  })

  it('keeps the question modal centered in the visual viewport with a scrollable body and reachable CTA', () => {
    const source = readFileSync(
      new URL('../../../../../src/features/zoom/components/calendar/QuestionModal.tsx', import.meta.url),
      'utf8',
    )

    expect(source).toContain("import { BaseModal } from '@/features/modals/BaseModal'")
    expect(source).toContain('fitVisualViewport')
    expect(source).toContain('items-center justify-center')
    expect(source).toContain('pb-[calc(5.5rem+env(safe-area-inset-bottom))]')
    expect(source).toContain('min-h-0 flex-1 overflow-y-auto overscroll-contain')
    expect(source).toContain('shrink-0 border-t border-white/10')
    expect(source).toContain('З яким питанням ти хочеш прийти на Zoom?')
    expect(source).not.toContain('items-end justify-center')
  })

  it('renders the unbook action for booked user sessions', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const session: ZoomCalendarSession = {
      id: 'session-1',
      scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      topic: 'Focus group practice',
      status: 'SCHEDULED',
      type: 'group_practice',
      zoomLink: '',
      attendeesCount: 4,
      canEdit: false,
      isMyBooking: true,
      remainingSlots: 6,
    }

    const markup = renderToStaticMarkup(
      createElement(SessionCard, {
        session,
        mode: 'user',
        userId: 'user-1',
        onClose: vi.fn(),
        onRequestBooking: vi.fn(),
        onAddToCalendar: vi.fn(),
      }),
    )

    expect(markup).toContain('Ти записана')
    expect(markup).toContain('Додати в календар')
    expect(markup).toContain('СКАСУВАТИ ЗАПИС')
  })

  it('uses the private booking cancellation owner for a future booked Individual session', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'coach-created-individual', type: 'individual', status: 'SCHEDULED', topic: 'Індивідуальна сесія',
        scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), canEdit: false,
        attendeesCount: 1, remainingSlots: 0, isMyBooking: true, zoomLink: '',
      },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup).toContain('СКАСУВАТИ ЗАПИС')
    const source = readFileSync(new URL('../../../../../src/features/zoom/components/calendar/SessionCard.tsx', import.meta.url), 'utf8')
    expect(source).toContain('if (isPrivate || isIndividual)')
    expect(source).toContain('cancelPrivateBooking(session.id).unwrap()')
  })

  it('does not offer active cancellation for past, completed, or cancelled user sessions', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const base = {
      id: 'not-cancellable', type: 'group_practice' as const, topic: 'Групова практика',
      zoomLink: '', attendeesCount: 1, remainingSlots: 4, canEdit: false, isMyBooking: true,
    }

    for (const session of [
      { ...base, status: 'SCHEDULED' as const, scheduledAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
      { ...base, status: 'COMPLETED' as const, scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() },
      { ...base, status: 'CANCELLED' as const, scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() },
    ]) {
      const markup = renderToStaticMarkup(createElement(SessionCard, {
        session, mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
      }))
      expect(markup).not.toContain('СКАСУВАТИ ЗАПИС')
      expect(markup).not.toContain('Додати в календар')
    }
  })

  it('does not offer calendar export for an expired individual booking', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'expired-booking', type: 'individual', status: 'SCHEDULED',
        commerceRequestId: 'expired-request', commerceStatus: 'EXPIRED', isMyBooking: true,
        topic: 'Індивідуальна сесія', scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        canEdit: false, attendeesCount: 1, remainingSlots: 0, zoomLink: '',
      },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup).not.toContain('Додати в календар')
  })

  it('keeps future terminal Group Practice history out of user booking presentation', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const base = {
      id: 'terminal-group-history',
      type: 'group_practice' as const,
      topic: 'ФОКУС · Zoom-практика',
      scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      zoomLink: '',
      attendeesCount: 5,
      remainingSlots: 45,
      canEdit: false,
      isMyBooking: true,
    }

    for (const status of ['COMPLETED', 'CANCELLED'] as const) {
      const markup = renderToStaticMarkup(createElement(SessionCard, {
        session: { ...base, id: `${base.id}-${status}`, status },
        mode: 'user',
        userId: 'user-1',
        onClose: vi.fn(),
        onAddToCalendar: vi.fn(),
      }))

      expect(markup).not.toContain('Записатися')
      expect(markup).not.toContain('Ти записана')
      expect(markup).not.toContain('Додати в календар')
      expect(markup).not.toContain('СКАСУВАТИ ЗАПИС')
      expect(markup).not.toContain('Після запису ти отримаєш доступ до Zoom')
    }
  })

  it('does not offer pending-request cancellation after the scheduled time has passed', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'past-pending-request', type: 'individual', status: 'SCHEDULED', topic: 'Індивідуальна сесія',
        scheduledAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), canEdit: false,
        attendeesCount: 0, isMyPendingPayment: true, commerceRequestId: 'commerce-past',
        commerceStatus: 'APPROVED_PENDING_PAYMENT', checkoutUrl: 'https://checkout.example/past',
      },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup).not.toContain('СКАСУВАТИ ЗАПИТ')
  })

  it('offers the coach cancellation action only for a future active session', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const future = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'coach-future', type: 'group_practice', status: 'SCHEDULED', topic: 'Групова практика',
        scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), canEdit: true,
        attendeesCount: 0, remainingSlots: 10, zoomLink: '',
      },
      mode: 'coach', userId: 'coach-1', onClose: vi.fn(), onAddToCalendar: vi.fn(), onCancel: vi.fn(),
    }))
    const completed = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'coach-completed', type: 'group_practice', status: 'COMPLETED', topic: 'Групова практика',
        scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), canEdit: true,
        attendeesCount: 0, remainingSlots: 10, zoomLink: '',
      },
      mode: 'coach', userId: 'coach-1', onClose: vi.fn(), onAddToCalendar: vi.fn(), onCancel: vi.fn(),
    }))

    expect(future).toContain('СКАСУВАТИ СЕСІЮ')
    expect(completed).not.toContain('СКАСУВАТИ СЕСІЮ')
  })

  it('keeps coach modal state and participant presentation consistent by session type', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const cancelledIndividual = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'coach-cancelled-individual', type: 'individual', status: 'CANCELLED', topic: 'Стратегічна сесія',
        scheduledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), canEdit: true,
        attendeesCount: 0, remainingSlots: 50, participantNames: ['Олена'], zoomLink: '',
      },
      mode: 'coach', userId: 'coach-1', onClose: vi.fn(), onAddToCalendar: vi.fn(), onCancel: vi.fn(),
    }))
    const scheduledGroup = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'coach-scheduled-group', type: 'group_practice', status: 'SCHEDULED', topic: 'ФОКУС',
        scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), canEdit: true,
        attendeesCount: 0, remainingSlots: 50, zoomLink: '',
      },
      mode: 'coach', userId: 'coach-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(cancelledIndividual).toContain('СКАСОВАНО')
    expect(cancelledIndividual).toContain('Індивідуальна сесія')
    expect(cancelledIndividual).toContain('Учасник: Олена')
    expect(cancelledIndividual).not.toContain('0 / 50 заброньовано')
    expect(cancelledIndividual).not.toContain('Завершити сесію')
    expect(cancelledIndividual).not.toContain('ПРОЙШЛА')
    expect(scheduledGroup).toContain('0 / 50 заброньовано')
    expect(scheduledGroup).toContain('ГРУПОВА ПРАКТИКА')
    expect(scheduledGroup).toContain('НАБІР ВІДКРИТО')
    expect(scheduledGroup).toMatch(/>ГРУПОВА ПРАКТИКА<\/span><span[^>]*>НАБІР ВІДКРИТО<\/span>/)
    expect(scheduledGroup).not.toContain('Групова практика · Набір відкрито')
    expect(scheduledGroup).toContain('Входить у підписку')
    expect(scheduledGroup).not.toContain('Завершити сесію')
  })

  it('prioritizes completed and cancelled group lifecycle over booking presentation', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const completed = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'completed-group-practice',
        type: 'group_practice',
        status: 'COMPLETED',
        topic: 'ФОКУС · Zoom-практика',
        scheduledAt: '2026-10-05T18:00:00',
        durationMinutes: 60,
        attendeesCount: 0,
        remainingSlots: 50,
        actualAttendeeCount: 5,
        outcomeTopic: 'Причини відкладень дій',
        summary: 'Всі пройшли практику успішно',
        zoomLink: '',
        canEdit: true,
      },
      mode: 'coach', userId: 'coach-1', onClose: vi.fn(), showCloseControl: false, onAddToCalendar: vi.fn(),
    }))
    const cancelled = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'cancelled-group-practice',
        type: 'group_practice',
        status: 'CANCELLED',
        topic: 'ФОКУС · Zoom-практика',
        scheduledAt: '2026-10-05T18:00:00',
        attendeesCount: 0,
        remainingSlots: 50,
        zoomLink: '',
        canEdit: true,
      },
      mode: 'coach', userId: 'coach-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(completed).toContain('ГРУПОВА ПРАКТИКА')
    expect(completed).toContain('ЗАВЕРШЕНО')
    expect(completed).toMatch(/>ГРУПОВА ПРАКТИКА<\/span><span[^>]*>ЗАВЕРШЕНО<\/span>/)
    expect(completed).toContain('ФОКУС · Zoom-практика')
    expect(completed).toContain('5 жовтня 2026 · 19:00 (час за Києвом)–20:00')
    expect(completed).toContain('УЧАСНИКИ')
    expect(completed).toContain('5 були присутні')
    expect(completed).toContain('ТЕМА')
    expect(completed).toContain('Причини відкладень дій')
    expect(completed).toContain('ПІДСУМОК')
    expect(completed).toContain('Всі пройшли практику успішно')
    expect(completed).not.toContain('Групова практика · Набір відкрито')
    expect(completed).not.toContain('Набір відкрито')
    expect(completed).not.toContain('0 / 50 заброньовано')
    expect(completed).not.toContain('Входить у підписку')
    expect(completed).not.toContain('Після запису ти отримаєш доступ до Zoom')
    expect(completed).not.toContain('>×</button>')

    expect(cancelled).toContain('ГРУПОВА ПРАКТИКА')
    expect(cancelled).toContain('СКАСОВАНО')
    expect(cancelled).not.toContain('Набір відкрито')
    expect(cancelled).not.toContain('ЗАПЛАНОВАНО')
    expect(cancelled).not.toContain('Після запису ти отримаєш доступ до Zoom')
  })

  it('renders persisted aggregate completion details for a USER group-practice attendee', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const completedGroup = {
      id: 'completed-user-group',
      type: 'group_practice' as const,
      status: 'COMPLETED' as const,
      topic: 'ФОКУС · Zoom-практика',
      scheduledAt: '2026-10-05T18:00:00',
      durationMinutes: 60,
      attendeesCount: 0,
      remainingSlots: 50,
      actualAttendeeCount: 5,
      outcomeTopic: 'Причини відкладень дій',
      summary: 'Всі пройшли практику успішно',
      recordingUrl: 'https://zoom.us/rec/coach-only',
      recordingAvailable: true,
      canViewRecording: true,
      isMyBooking: true,
      isMyAttendanceConfirmed: true,
      zoomLink: '',
      canEdit: false,
    }

    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: completedGroup,
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))
    const noPersonalAttendanceOrRecording = renderToStaticMarkup(createElement(SessionCard, {
      session: { ...completedGroup, isMyAttendanceConfirmed: false, recordingUrl: null, recordingAvailable: false },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup).toContain('ГРУПОВА ПРАКТИКА')
    expect(markup).toContain('ЗАВЕРШЕНО')
    expect(markup).toContain('ФОКУС · Zoom-практика')
    expect(markup).toContain('5 жовтня 2026 · 19:00 (час за Києвом)–20:00')
    expect(markup).toContain('Практика завершена')
    expect(markup).toContain('Твоя присутність підтверджена')
    expect(markup).toContain('5 були присутні')
    expect(markup).toContain('Причини відкладень дій')
    expect(markup).toContain('Всі пройшли практику успішно')
    expect(markup).toContain('Відкрити запис')
    expect(noPersonalAttendanceOrRecording).not.toContain('Твоя присутність підтверджена')
    expect(noPersonalAttendanceOrRecording).not.toContain('Відкрити запис')
  })

  it('uses the supplied Focus access gate for an unbooked Group session', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session: {
        id: 'group-no-access', type: 'group_practice', status: 'SCHEDULED', topic: 'Групова практика',
        scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), canEdit: false,
        attendeesCount: 1, remainingSlots: 9, zoomLink: '', isMyBooking: false,
      },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onRequestBooking: vi.fn(),
      hasFocusAccess: false, onRestrictedGroupAction: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(markup).toContain('АКТИВУВАТИ ДОСТУП')
    expect(markup).not.toContain('Записатися')
  })

  it('keeps manual completion CTA for eligible non-individual coach sessions', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const session: ZoomCalendarSession = {
      id: 'session-1',
      scheduledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      topic: 'Групова практика',
      status: 'SCHEDULED',
      type: 'group_practice',
      zoomLink: 'https://zoom.us/j/1',
      attendeesCount: 1,
      attendees: [{ userId: 'user-1', name: 'V3', attended: false }],
      canEdit: true,
      isMyBooking: false,
      remainingSlots: 0,
    }

    const markup = renderToStaticMarkup(
      createElement(SessionCard, {
        session,
        mode: 'coach',
        userId: 'coach-user-1',
        onClose: vi.fn(),
        onAddToCalendar: vi.fn(),
      }),
    )

    expect(markup).toContain('Завершити сесію')
  })


  it('can open the existing completion owner from an external weekly CTA', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const session: ZoomCalendarSession = {
      id: 'session-1',
      scheduledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      topic: 'Групова практика',
      status: 'SCHEDULED',
      type: 'group_practice',
      zoomLink: 'https://zoom.us/j/1',
      attendeesCount: 2,
      attendees: [
        { userId: 'user-1', name: 'V3', attended: false },
        { userId: 'user-2', name: 'V4', attended: false },
      ],
      canEdit: true,
      isMyBooking: false,
      remainingSlots: 48,
    }

    const markup = renderToStaticMarkup(
      createElement(SessionCard, {
        session,
        mode: 'coach',
        userId: 'coach-user-1',
        initialCompletionOpen: true,
        onClose: vi.fn(),
        onAddToCalendar: vi.fn(),
      }),
    )

    expect(markup).toContain('Фактичні присутні')
    expect(markup).toContain('Фактично були присутні')
    expect(markup).toContain('Тема / що обговорювали')
    expect(markup).toContain('Короткий підсумок')
    expect(markup).toContain('Посилання на запис')
    expect(markup).toContain('Зберегти та завершити')
  })



  it('renders AI draft control inside the existing completion form without a second modal owner', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const session: ZoomCalendarSession = {
      id: 'session-1',
      scheduledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      topic: 'Групова практика',
      status: 'SCHEDULED',
      type: 'group_practice',
      zoomLink: 'https://zoom.us/j/1',
      attendeesCount: 2,
      attendees: [
        { userId: 'user-1', name: 'V3', attended: false },
        { userId: 'user-2', name: 'V4', attended: false },
      ],
      recordingUrl: 'https://zoom.us/rec/1',
      recordingAvailable: true,
      canViewRecording: true,
      canEdit: true,
      isMyBooking: false,
      remainingSlots: 48,
    }

    const markup = renderToStaticMarkup(
      createElement(SessionCard, {
        session,
        mode: 'coach',
        userId: 'coach-user-1',
        initialCompletionOpen: true,
        onClose: vi.fn(),
        onAddToCalendar: vi.fn(),
      }),
    )

    expect(markup).toContain('Заповнити з запису')
    expect(markup).toContain('Фактично були присутні')
    expect(markup).toContain('Зберегти та завершити')
    expect(markup).not.toContain('role="dialog"')
  })

  it('keeps AI draft wiring read-only for attendance and preserves the existing completion mutation owner', () => {
    const source = readFileSync(new URL('../../../../../src/features/zoom/components/calendar/SessionCard.tsx', import.meta.url), 'utf8')

    expect(source).toContain('useLazyGetZoomCompletionDraftQuery')
    expect(source).toContain('loadCompletionDraft(session.id).unwrap()')
    expect(source).toContain("if (!outcomeTopic.trim() && draft.topic?.trim())")
    expect(source).toContain('if (!summary.trim())')
    expect(source).toContain("Поля вже заповнені вручну. AI draft не перезаписав їх.")
    expect(source).toContain('await completeZoomSession({ id: session.id, payload }).unwrap()')
    expect(source).not.toContain('setAttendeeCount(draft')
    expect(source).not.toContain('attendeeCount: draft')
  })

  it('renders individual, battle, and FOCUS pricing through the shared payment model', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const base = {
      scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      status: 'SCHEDULED' as const,
      zoomLink: 'https://zoom.us/j/1',
      attendeesCount: 0,
      canEdit: true,
      isMyBooking: false,
      remainingSlots: 1,
    }

    const individualMarkup = renderToStaticMarkup(createElement(SessionCard, {
      session: { ...base, id: 'individual', topic: 'Індивідуальна сесія', type: 'individual', participantNames: ['Олена'], priceCents: 0 },
      mode: 'coach',
      userId: 'coach-user-1',
      onClose: vi.fn(),
      onAddToCalendar: vi.fn(),
    }))
    const battleMarkup = renderToStaticMarkup(createElement(SessionCard, {
      session: { ...base, id: 'battle', topic: 'Zoom Battle', type: 'battle_review', battleStatus: 'completed', winnerId: 'winner-1', priceCents: 0 },
      mode: 'coach',
      userId: 'coach-user-1',
      onClose: vi.fn(),
      onAddToCalendar: vi.fn(),
    }))
    const focusMarkup = renderToStaticMarkup(createElement(SessionCard, {
      session: { ...base, id: 'focus', topic: 'ФОКУС', type: 'group_practice', priceCents: 0 },
      mode: 'coach',
      userId: 'coach-user-1',
      onClose: vi.fn(),
      onAddToCalendar: vi.fn(),
    }))

    expect(individualMarkup).toContain('60 €')
    expect(battleMarkup).toContain('За результатом: переможець 0 € · програвша 25 €')
    expect(focusMarkup).toContain('Входить у підписку')
    expect(`${individualMarkup}${battleMarkup}`).not.toContain('Без оплати')
  })

  it('builds canonical completion mutation payload with actual attendance count', async () => {
    const { buildZoomCompletionPayload } = await import('@/features/zoom/components/calendar/SessionCard')

    expect(buildZoomCompletionPayload({
      actualParticipantUserIds: ['user-1'],
      attendeeCount: '12.8',
      maxAttendeeCount: 50,
      outcomeTopic: ' Воронка ',
      summary: ' Підсумок ',
      recordingRef: ' https://zoom.us/rec/1 ',
    })).toEqual({
      actualParticipantUserIds: ['user-1'],
      attendeeCount: 12,
      topic: 'Воронка',
      summary: 'Підсумок',
      recordingRef: 'https://zoom.us/rec/1',
    })

    expect(buildZoomCompletionPayload({
      actualParticipantUserIds: [],
      attendeeCount: '55',
      maxAttendeeCount: 50,
      outcomeTopic: '',
      summary: '',
      recordingRef: '',
    })).toEqual({ attendeeCount: 50 })
  })

  it('renders completed outcome from canonical DTO fields', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const session: ZoomCalendarSession = {
      id: 'session-1',
      scheduledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      topic: 'Індивідуальна сесія',
      status: 'COMPLETED',
      type: 'individual',
      zoomLink: 'https://zoom.us/j/1',
      attendeesCount: 1,
      actualAttendeeCount: 1,
      outcomeTopic: 'Воронка перед запуском',
      summary: 'Перевірили структуру запуску.',
      recordingUrl: 'https://zoom.us/rec/1',
      recordingAvailable: true,
      canViewRecording: true,
      canEdit: true,
      isMyBooking: false,
      remainingSlots: 0,
    }

    const markup = renderToStaticMarkup(
      createElement(SessionCard, {
        session,
        mode: 'coach',
        userId: 'coach-user-1',
        onClose: vi.fn(),
        onAddToCalendar: vi.fn(),
      }),
    )

    expect(markup).toContain('ЗАВЕРШЕНО')
    expect(markup).toContain('1 були присутні')
    expect(markup).toContain('Тема: Воронка перед запуском')
    expect(markup).toContain('Підсумок: Перевірили структуру запуску.')
    expect(markup).toContain('Відкрити запис')
    expect(markup).not.toContain('Завершити сесію')
  })

  it('shows the participant checkpoint only for a completed group-practice attendee', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const base: ZoomCalendarSession = {
      id: 'completed-group',
      scheduledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      topic: 'ФОКУС · Zoom-практика',
      status: 'COMPLETED',
      type: 'group_practice',
      zoomLink: '',
      canEdit: false,
    }

    const attendeeMarkup = renderToStaticMarkup(createElement(SessionCard, {
      session: { ...base, canSelfReportAttendance: true, selfReportedAttended: true },
      mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))
    const nonAttendeeMarkup = renderToStaticMarkup(createElement(SessionCard, {
      session: base,
      mode: 'user', userId: 'user-2', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))

    expect(attendeeMarkup).toContain('ПІДТВЕРДЖУЮ СВОЮ УЧАСТЬ У ПРАКТИЦІ')
    expect(attendeeMarkup).toContain('Збережено')
    expect(nonAttendeeMarkup).not.toContain('ПІДТВЕРДЖУЮ СВОЮ УЧАСТЬ У ПРАКТИЦІ')
  })

})
