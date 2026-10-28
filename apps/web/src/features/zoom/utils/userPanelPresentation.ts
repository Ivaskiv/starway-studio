import { getNormalizedSessionType, hasUserZoomCommitment, isUserOperationalCalendarSession } from '../zoom.utils';
import type { ZoomCalendarSession } from '../zoom.types';
import type { ZoomSessionWithAttendance } from '../types/zoom.types';
import { normalizeZoomHubSession } from './zoomCalendar.utils';
import { formatKyivTime, KYIV_TIME_LABEL, KYIV_TIMEZONE } from './zoomDateTime.utils';

const INDIVIDUAL_REQUEST_CONTEXT_ERROR = 'Опиши запит кількома словами, щоб коуч розумів, з чим ти приходиш.';

export function validateIndividualRequestContext(value: string): string | null {
  const normalized = value.trim();
  if (normalized.length < 8 || normalized.length > 1000) return INDIVIDUAL_REQUEST_CONTEXT_ERROR;
  const words = normalized.match(/\p{L}{2,}/gu) ?? [];
  return words.some((word) => /[aeiouyаеиіоуяюєїыэё]/iu.test(word) || /^[A-ZА-ЯІЇЄҐЁ]{2,5}$/u.test(word))
    ? null
    : INDIVIDUAL_REQUEST_CONTEXT_ERROR;
}

export function fmtDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KYIV_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';

  return `${value('day')}.${value('month')} · ${formatKyivTime(new Date(iso))} (${KYIV_TIME_LABEL})`;
}

export const INDIVIDUAL_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatIndividualDate(dateKey: string): string {
  return new Intl.DateTimeFormat('uk-UA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(parseLocalDate(dateKey));
}

export function formatIndividualTime(iso: string): string {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: KYIV_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export type UserCalendarFilter = 'all' | 'group' | 'individual';

export type UserSessionsTab = UserCalendarFilter | 'mine';

export type MySessionsFilter = 'upcoming' | 'past' | 'cancelled';

function getMySessionHistoryCategory(
  session: ZoomCalendarSession,
  now: Date,
): MySessionsFilter {
  // Commerce belongs to this USER. An expired request remains historical, even
  // if its inventory slot was later cancelled, whereas a cancelled request is
  // a cancelled history item.
  if (session.commerceStatus === 'CANCELLED') return 'cancelled'
  if (session.commerceStatus === 'EXPIRED') {
    return new Date(session.scheduledAt) < now ? 'past' : 'upcoming'
  }
  if (session.status === 'CANCELLED') return 'cancelled'
  return session.status === 'COMPLETED' || new Date(session.scheduledAt) < now
    ? 'past'
    : 'upcoming'
}

export function getMySessionsFilterPresentation(
  sessions: ZoomCalendarSession[],
  filter: MySessionsFilter,
  now: Date,
): {
  sessions: ZoomCalendarSession[]
  counts: Record<MySessionsFilter, number>
  emptyMessage: string
} {
  const mySessions = sessions.filter(
    hasUserZoomCommitment,
  )
  const byFilter: Record<MySessionsFilter, ZoomCalendarSession[]> = {
    upcoming: [],
    past: [],
    cancelled: [],
  }
  for (const session of mySessions) {
    byFilter[getMySessionHistoryCategory(session, now)].push(session)
  }
  const emptyMessages: Record<MySessionsFilter, string> = {
    upcoming: 'Немає майбутніх сесій.',
    past: 'Немає минулих сесій.',
    cancelled: 'Немає скасованих сесій.',
  }

  return {
    sessions: byFilter[filter],
    counts: {
      upcoming: byFilter.upcoming.length,
      past: byFilter.past.length,
      cancelled: byFilter.cancelled.length,
    },
    emptyMessage: emptyMessages[filter],
  }
}

/**
 * `/zoom/my` owns this user's registration and attendee-scoped fields.
 * The calendar projection owns commerce/checkout and inventory fields.  A
 * shared session id must combine those projections rather than replacing the
 * attendee record with the calendar record.
 */
export function mergeUserSessionHistoryEntries(
  mySessions: ZoomSessionWithAttendance[],
  calendarSessions: ZoomCalendarSession[],
): ZoomCalendarSession[] {
  const historyById = new Map<string, ZoomCalendarSession>()

  for (const session of mySessions) {
    historyById.set(session.id, {
      ...normalizeZoomHubSession(session, { isMyBooking: session.isRegistered }),
      canEdit: false,
    })
  }

  for (const calendarSession of calendarSessions) {
    if (!hasUserZoomCommitment(calendarSession)) continue

    const historySession = historyById.get(calendarSession.id)
    if (!historySession) {
      historyById.set(calendarSession.id, calendarSession)
      continue
    }

    historyById.set(calendarSession.id, {
      ...calendarSession,
      ...historySession,
      isMyBooking: Boolean(historySession.isMyBooking || calendarSession.isMyBooking),
      isMyPendingPayment: Boolean(historySession.isMyPendingPayment || calendarSession.isMyPendingPayment),
      commerceRequestId: calendarSession.commerceRequestId ?? historySession.commerceRequestId,
      commerceStatus: calendarSession.commerceStatus ?? historySession.commerceStatus,
      commerceLabel: calendarSession.commerceLabel ?? historySession.commerceLabel,
      checkoutUrl: calendarSession.checkoutUrl ?? historySession.checkoutUrl,
      paymentDeadline: calendarSession.paymentDeadline ?? historySession.paymentDeadline,
      priceCents: calendarSession.priceCents ?? historySession.priceCents,
      currency: calendarSession.currency ?? historySession.currency,
      paymentModel: calendarSession.paymentModel ?? historySession.paymentModel,
      slotStatus: calendarSession.slotStatus ?? historySession.slotStatus,
      remainingSlots: calendarSession.remainingSlots ?? historySession.remainingSlots,
      zoomLink: calendarSession.zoomLink,
      canEdit: false,
    })
  }

  return [...historyById.values()]
}

export function filterUserCalendarSessions(
  sessions: ZoomCalendarSession[],
  filter: UserCalendarFilter,
): ZoomCalendarSession[] {
  const calendarSessions = sessions.filter(isUserOperationalCalendarSession)
  if (filter === 'all') return calendarSessions

  return calendarSessions.filter((session) => {
    const type = getNormalizedSessionType(session)
    return filter === 'group'
      ? type === 'group' || type === 'group_practice'
      : type === 'individual' || type === 'private'
  })
}

export function routeUserBookingCta({
  hasFocusAccess,
  openPayment,
  openBookingFlow,
  showAllSessions,
}: {
  hasFocusAccess?: boolean
  openPayment: () => void
  openBookingFlow: () => void
  showAllSessions: () => void
}): void {
  if (hasFocusAccess === false) {
    openPayment()
    return
  }

  showAllSessions()
  openBookingFlow()
}
