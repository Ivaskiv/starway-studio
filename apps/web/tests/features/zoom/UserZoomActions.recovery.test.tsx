import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { ZoomCalendarSession } from '@/features/zoom/zoom.types'

vi.mock('@/features/zoom/zoom.api', () => ({
  useBookPrivateSlotMutation: () => [vi.fn(), { isLoading: false }],
  useCancelZoomCommerceRequestMutation: () => [vi.fn(), { isLoading: false }],
  useBookSlotMutation: () => [vi.fn(), { isLoading: false }],
  useCancelPrivateBookingMutation: () => [vi.fn(), { isLoading: false }],
  useCompleteZoomSessionMutation: () => [vi.fn(), { isLoading: false }],
  useLazyGetZoomCompletionDraftQuery: () => [vi.fn(), { isFetching: false }],
  useSaveSelfReportedAttendanceMutation: () => [vi.fn(), { isLoading: false }],
  useCreateSwapRequestMutation: () => [vi.fn(), { isLoading: false }],
  useUnbookSlotMutation: () => [vi.fn(), { isLoading: false }],
}))

vi.mock('@/features/subscription/utils/openExternalPaymentUrl', () => ({
  openExternalPaymentUrl: vi.fn(),
}))

const groupSession: ZoomCalendarSession = {
  id: 'group-session-1',
  scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60_000).toISOString(),
  topic: 'Monday group practice',
  status: 'SCHEDULED',
  type: 'group_practice',
  zoomLink: '',
  attendeesCount: 4,
  remainingSlots: 6,
  canEdit: false,
  isMyBooking: false,
}

describe('USER Zoom action recovery', () => {
  it('renders group registration, then the canonical question action and saved queue state', async () => {
    const { SessionCard } = await import('@/features/zoom/components/calendar/SessionCard')
    const renderCard = (session: ZoomCalendarSession) => renderToStaticMarkup(createElement(SessionCard, {
      session,
      mode: 'user',
      userId: 'user-1',
      onClose: vi.fn(),
      onRequestBooking: vi.fn(),
      onAddToCalendar: vi.fn(),
    }))

    expect(renderCard(groupSession)).toContain('ЗАПИСАТИСЯ НА ПРАКТИКУ')
    expect(renderCard({ ...groupSession, isMyBooking: true })).toContain('Додати питання')

    const savedQuestion = renderCard({
      ...groupSession,
      isMyBooking: true,
      myQuestion: { text: 'Як втримати фокус?', position: 2 },
    })
    expect(savedQuestion).toContain('Твоє питання: Як втримати фокус?')
    expect(savedQuestion).toContain('№2 у черзі')
    expect(savedQuestion).not.toContain('ОПЛАТИТИ')
  })

  it('keeps group, individual, and battle actions on their canonical owners', () => {
    const panel = readFileSync(new URL('../../../src/features/zoom/UserZoomPanel.tsx', import.meta.url), 'utf8')
    const calendar = readFileSync(new URL('../../../src/features/zoom/components/calendar/Calendar.tsx', import.meta.url), 'utf8')
    const calendarHook = readFileSync(new URL('../../../src/features/zoom/hooks/useCalendar.ts', import.meta.url), 'utf8')
    const createModal = readFileSync(new URL('../../../src/features/zoom/components/user/UserCreateModal.tsx', import.meta.url), 'utf8')
    const sessionsView = readFileSync(new URL('../../../src/features/zoom/components/user/UserSessionsView.tsx', import.meta.url), 'utf8')
    const battleSection = readFileSync(new URL('../../../src/features/zoom/components/battle/UserBattleSections.tsx', import.meta.url), 'utf8')

    expect(createModal).toContain('setRequestedUserSession(selected)')
    expect(sessionsView).toContain('requestedUserSession={requestedUserSession}')
    expect(createModal).toContain("setCreateAction('group')")
    expect(createModal).toContain("setCreateAction('individual')")
    expect(createModal).toContain("setCreateAction('battle')")
    expect(panel).toContain('createIndividualRequest({')
    expect(createModal).toContain("'Продовжити'")
    expect(calendar).toContain('openUserSession(props.requestedUserSession)')
    expect(calendarHook).toContain('await bookPrivateSlot({ sessionId: bookingQuestionSession.id, questionText: normalizedQuestionText }).unwrap()')
    expect(calendarHook).toContain("errorCode === 'NO_ACTIVE_SUBSCRIPTION'")
    expect(calendarHook).toContain('Доступ до Zoom відкривається з активним ФОКУСОМ.')
    expect(battleSection).toContain('useGetEligibleOpponentsQuery(userId)')
    expect(battleSection).toContain('useInitiateBattleMutation()')
    expect(createModal).toContain('<BattleCallSection')
  })
})
