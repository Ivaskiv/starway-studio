import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ZoomCalendarSession } from '@/features/zoom/zoom.types'

vi.mock('@/features/zoom/zoom.api', () => ({
  useBookPrivateSlotMutation: () => [vi.fn(), { isLoading: false }],
  useBookSlotMutation: () => [vi.fn(), { isLoading: false }],
  useCancelZoomCommerceRequestMutation: () => [vi.fn(), { isLoading: false }],
  useCancelPrivateBookingMutation: () => [vi.fn(), { isLoading: false }],
  useCompleteZoomSessionMutation: () => [vi.fn(() => ({ unwrap: vi.fn() })), { isLoading: false }],
  useLazyGetZoomCompletionDraftQuery: () => [vi.fn(() => ({ unwrap: vi.fn() })), { isFetching: false }],
  useCreateSwapRequestMutation: () => [vi.fn(), { isLoading: false }],
  useUnbookSlotMutation: () => [vi.fn(), { isLoading: false }],
}))

vi.mock('@/features/subscription/utils/openExternalPaymentUrl', () => ({
  openExternalPaymentUrl: vi.fn(),
}))

describe('SessionCard', () => {
  it.each([
    ['APPROVED_PENDING_PAYMENT', 'ОЧІКУЄ ОПЛАТИ', 'https://checkout.example/existing', true],
    ['APPROVED_PENDING_PAYMENT', 'ОЧІКУЄ ОПЛАТИ', null, false],
    ['REQUESTED', 'ЗАПИТ СТВОРЕНО', null, false],
    ['PAID', 'ОПЛАЧЕНО', null, false],
    ['EXPIRED', 'ЧАС ОПЛАТИ ВИЧЕРПАНО', null, false],
    ['REJECTED', 'ВІДХИЛЕНО', null, false],
    ['CANCELLED', 'СКАСОВАНО', null, false],
    [null, 'ВІЛЬНИЙ СЛОТ', null, false],
  ] as const)('renders Individual %s with checkout %s', async (commerceStatus, commerceLabel, checkoutUrl, showPayment) => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const session: ZoomCalendarSession = {
      id: 'individual-1', type: 'individual', status: 'SCHEDULED', topic: 'Індивідуальна сесія',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(), canEdit: false,
      attendeesCount: commerceStatus === 'PAID' ? 1 : 0,
      zoomLink: commerceStatus === 'PAID' ? 'https://zoom.us/j/1' : '',
      commerceStatus, commerceLabel, checkoutUrl,
      isMyPendingPayment: commerceStatus === 'APPROVED_PENDING_PAYMENT',
      isMyBooking: commerceStatus === 'PAID',
    }
    const markup = renderToStaticMarkup(createElement(SessionCard, {
      session, mode: 'user', userId: 'user-1', onClose: vi.fn(), onAddToCalendar: vi.fn(),
    }))
    expect(markup).toContain(commerceLabel)
    expect(markup).not.toContain('Заплановано')
    expect(markup.match(/ОПЛАТИТИ/g)?.length ?? 0).toBe(showPayment ? 1 : 0)
    if (commerceStatus === 'PAID') {
      expect(markup).toContain('Ти записана')
      expect(markup).toContain('href="https://zoom.us/j/1"')
    } else {
      expect(markup).not.toContain('href="https://zoom.us/j/1"')
    }
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
    expect(markup).toContain('Заверши оплату до 13:30.')
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

    expect(markup).toContain('ЗАПИТ СТВОРЕНО')
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

  it('opens the required question empty, without an invented answer', async () => {
    const { QuestionModal } = await import('@/features/zoom/components/calendar/QuestionModal')
    const markup = renderToStaticMarkup(createElement(QuestionModal, {
      session: { topic: 'ФОКУС' } as ZoomCalendarSession,
      questionText: '', error: null, isSubmitting: false,
      onChange: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn(),
    }))
    expect(markup).toContain('З яким питанням ти хочеш прийти на Zoom?')
    expect(markup).toMatch(/<textarea[^>]*><\/textarea>/)
    expect(markup).not.toContain('Невідомо')
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
    expect(cancelledIndividual).toContain('Учасник: Олена')
    expect(cancelledIndividual).not.toContain('0 / 50 заброньовано')
    expect(cancelledIndividual).not.toContain('Завершити сесію')
    expect(scheduledGroup).toContain('0 / 50 заброньовано')
    expect(scheduledGroup).not.toContain('Завершити сесію')
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

  it('shows manual completion CTA for eligible coach sessions', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const session: ZoomCalendarSession = {
      id: 'session-1',
      scheduledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      topic: 'Індивідуальна сесія',
      status: 'SCHEDULED',
      type: 'individual',
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
      session: { ...base, id: 'individual', topic: 'Індивідуальна сесія', type: 'individual', priceCents: 0 },
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

})
