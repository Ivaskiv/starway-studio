// apps/web/src/features/zoom/zoom.utils.ts

import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';

import type { ZoomCalendarSession, ZoomPaymentModel, ZoomSessionType, ZoomCommerceStatus } from './zoom.types';

type SessionLike = {
  type?: string | null
  paymentModel?: ZoomPaymentModel | null
  status?: string | null
  battleStatus?: string | null
  winnerId?: string | null
  attendeesCount?: number | null
  participantsCount?: number | null
  maxParticipants?: number | null
  remainingSlots?: number | null
  isMyBooking?: boolean
  slotStatus?: string | null
  commerceStatus?: ZoomCommerceStatus | null
  commerceLabel?: string | null
}


export type ZoomFormatInfo = {
  label: string
  priceLabel: string | null
  paymentModel: ZoomPaymentModel
  description: string
  winnerLabel?: string
  loserLabel?: string
}

const ZOOM_FORMATS: Record<string, ZoomFormatInfo> = {
  group_practice: {
    label: 'Щомісячна підписка ФОКУС',
    priceLabel: 'Входить у підписку',
    paymentModel: 'included_in_subscription',
    description: '4 групові Zoom-розбори на місяць + чат + записи.',
  },
  group: {
    label: 'Щомісячна підписка ФОКУС',
    priceLabel: 'Входить у підписку',
    paymentModel: 'included_in_subscription',
    description: '4 групові Zoom-розбори на місяць + чат + записи.',
  },
  individual: {
    label: 'Індивідуальний розбір',
    priceLabel: '60 €',
    paymentModel: 'paid_required',
    description: '1-на-1 Zoom (60 хв), глибока стратегія, аудит блогу та МК.',
  },
  private: {
    label: 'Індивідуальний розбір',
    priceLabel: '60 €',
    paymentModel: 'paid_required',
    description: '1-на-1 Zoom (60 хв), глибока стратегія, аудит блогу та МК.',
  },
  battle_review: {
    label: 'Батл «Доміно»',
    priceLabel: '0 € / 25 €',
    paymentModel: 'result_based',
    winnerLabel: 'переможець 0 €',
    loserLabel: 'програвша 25 €',
    description: 'Переможець платить 0 €. Програвша платить 25 € і отримує розбір помилок.',
  },
  intensive: {
    label: 'Інтенсив',
    priceLabel: null,
    paymentModel: 'unknown',
    description: 'Додатковий Zoom-формат програми.',
  },
}

export function getZoomFormatInfo(input: SessionLike | string | null | undefined): ZoomFormatInfo {
  const normalizedType = getNormalizedSessionType(input)
  return ZOOM_FORMATS[normalizedType] ?? {
    label: SESSION_TYPE_LABELS[normalizedType] ?? 'Zoom-сесія',
    priceLabel: null,
    paymentModel: 'unknown',
    description: 'Zoom-сесія Starway.',
  }
}

export function getZoomPaymentModel(input: SessionLike | string | null | undefined): ZoomPaymentModel {
  if (typeof input !== 'string' && input?.paymentModel) return input.paymentModel
  return getZoomFormatInfo(input).paymentModel
}

export function getZoomPriceLabel(input: SessionLike | string | null | undefined): string | null {
  return getZoomFormatInfo(input).priceLabel
}

export type UserZoomCommercePresentationState =
  | 'AVAILABLE'
  | ZoomCommerceStatus

export type UserZoomCommercePresentation = {
  state: UserZoomCommercePresentationState
  label: string
  paymentVisible: boolean
}

const USER_ZOOM_COMMERCE_PRESENTATION: Record<
  UserZoomCommercePresentationState,
  Omit<UserZoomCommercePresentation, 'state'>
> = {
  AVAILABLE: { label: 'Доступно', paymentVisible: false },
  REQUESTED: { label: 'Очікує підтвердження', paymentVisible: false },
  APPROVED_PENDING_PAYMENT: { label: 'Очікує оплати', paymentVisible: true },
  PAID: { label: 'Оплачено · Заплановано', paymentVisible: false },
  EXPIRED: { label: 'Час вичерпано', paymentVisible: false },
  CANCELLED: { label: 'Скасовано', paymentVisible: false },
  REJECTED: { label: 'Відхилено', paymentVisible: false },
}

export function getUserZoomCommercePresentation(
  session: Pick<SessionLike, 'commerceStatus'>,
): UserZoomCommercePresentation {
  const state: UserZoomCommercePresentationState =
    session.commerceStatus ?? 'AVAILABLE'

  return {
    state,
    ...USER_ZOOM_COMMERCE_PRESENTATION[state],
  }
}

export function getZoomPaymentBadgeLabel(input: SessionLike | string | null | undefined): string | null {
  if (typeof input !== 'string' && input?.commerceLabel) return input.commerceLabel
  const model = getZoomPaymentModel(input)
  const format = getZoomFormatInfo(input)

  if (model === 'included_in_subscription') return 'Входить у підписку'
  if (model === 'paid_required') return format.priceLabel
  if (model === 'result_based') {
    if (typeof input !== 'string' && (input?.winnerId || input?.battleStatus === 'completed' || input?.status === 'COMPLETED')) {
      return 'За результатом: переможець 0 € · програвша 25 €'
    }
    return format.priceLabel ? `${format.priceLabel} · за результатом` : 'Оплата за результатом'
  }
  if (model === 'free') return 'Без оплати'
  return null
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  group_practice: 'Групова практика',
  group: 'Групова практика',
  individual: 'Індивідуальна',
  private: 'Індивідуальна',
  intensive: 'Інтенсив',
  battle_review: 'Zoom Battle',
}

const SESSION_BADGE_CLASSES: Record<string, string> = {
  group_practice: 'bg-purple-100 text-purple-800',
  group: 'bg-purple-100 text-purple-800',
  individual: 'bg-teal-100 text-teal-800',
  private: 'bg-teal-100 text-teal-800',
  intensive: 'bg-blue-100 text-blue-800',
  battle_review: 'bg-amber-100 text-amber-800',
}

const SESSION_BORDER_CLASSES: Record<string, string> = {
  group_practice: 'border-l-2 border-purple-500',
  group: 'border-l-2 border-purple-500',
  individual: 'border-l-2 border-teal-500',
  private: 'border-l-2 border-teal-500',
  intensive: 'border-l-2 border-blue-500',
  battle_review: 'border-l-2 border-amber-500',
}

const SESSION_DOT_CLASSES: Record<string, string> = {
  group_practice: 'bg-purple-500',
  group: 'bg-purple-500',
  individual: 'bg-teal-500',
  private: 'bg-teal-500',
  intensive: 'bg-blue-500',
  battle_review: 'bg-amber-500',
}

const SESSION_ICON_KEYS: Record<string, 'users' | 'person' | 'zap' | 'battle'> = {
  group_practice: 'users',
  group: 'users',
  individual: 'person',
  private: 'person',
  intensive: 'zap',
  battle_review: 'battle',
}

const SESSION_ICON_BG_CLASSES: Record<string, string> = {
  group_practice: 'bg-purple-500/20 text-purple-400',
  group: 'bg-purple-500/20 text-purple-400',
  individual: 'bg-teal-500/20 text-teal-400',
  private: 'bg-teal-500/20 text-teal-400',
  intensive: 'bg-blue-500/20 text-blue-400',
  battle_review: 'bg-amber-500/20 text-amber-400',
}

type SessionStatusVariant = {
  label: string
  surfaceClass: string
  textClass: string
  badgeClass: string
}

const SESSION_STATUS_VARIANTS: Record<string, SessionStatusVariant> = {
  scheduled: {
    label: 'Заплановано',
    surfaceClass: 'border-[var(--border-primary)] bg-[var(--glass-bg)]',
    textClass: 'text-[var(--text-primary)]',
    badgeClass: 'border border-[var(--border-primary)] bg-[var(--glass-bg)] text-[var(--text-muted)]',
  },
  pending: {
    label: 'Заплановано',
    surfaceClass: 'border-[var(--border-primary)] bg-[var(--glass-bg)]',
    textClass: 'text-[var(--text-primary)]',
    badgeClass: 'border border-[var(--border-primary)] bg-[var(--glass-bg)] text-[var(--text-muted)]',
  },
  active: {
    label: 'Активний',
    surfaceClass: 'border-[rgba(var(--accent-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.12)]',
    textClass: 'text-[rgb(var(--accent-soft-rgb))]',
    badgeClass: 'border border-[rgba(var(--accent-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.14)] text-[rgb(var(--accent-soft-rgb))]',
  },
  completed: {
    label: 'Завершено',
    surfaceClass: 'border-[rgba(var(--semantic-success-rgb),0.32)] bg-[rgba(var(--semantic-success-rgb),0.1)]',
    textClass: 'text-[var(--semantic-success)]',
    badgeClass: 'border border-[rgba(var(--semantic-success-rgb),0.34)] bg-[rgba(var(--semantic-success-rgb),0.12)] text-[var(--semantic-success)]',
  },
  cancelled: {
    label: 'Пропущено',
    surfaceClass: 'border-[rgba(var(--semantic-warning-rgb),0.26)] bg-[rgba(var(--semantic-warning-rgb),0.08)] opacity-75',
    textClass: 'text-[var(--text-muted)]',
    badgeClass: 'border border-[rgba(var(--semantic-warning-rgb),0.3)] bg-[rgba(var(--semantic-warning-rgb),0.1)] text-[var(--semantic-warning)]',
  },
}

export function getNormalizedSessionType(input: SessionLike | string | null | undefined): string {
  const rawType =
    typeof input === 'string'
      ? input
      : typeof input?.type === 'string'
        ? input.type
        : ''

  return String(rawType ?? '').trim().toLowerCase()
}

function getSessionParticipantCount(session: SessionLike): number | null {
  if (typeof session.participantsCount === 'number') return session.participantsCount
  if (typeof session.attendeesCount === 'number') return session.attendeesCount
  return null
}

export function getParticipantsLabel(count: number): string {
  if (count === 0) return 'Набір відкрито';
  if (count === 1) return '1 учасник';
  return `${count} учасників`;
}

export function getSessionMeta(session: SessionLike): string {
  const normalizedType = getNormalizedSessionType(session)
  const label = SESSION_TYPE_LABELS[normalizedType] ?? 'Сесія'

  const supportsCapacityVocabulary =
    normalizedType === 'group_practice'
    || normalizedType === 'group'
    || normalizedType === 'intensive'

  if (!supportsCapacityVocabulary) {
    return label
  }

  const participantsCount = getSessionParticipantCount(session)
  const hasParticipantsMeta =
    typeof session.maxParticipants === 'number'
    || typeof session.remainingSlots === 'number'
    || participantsCount !== null

  const participantsLabel =
    hasParticipantsMeta && participantsCount !== null
      ? getParticipantsLabel(participantsCount)
      : ''

  return participantsLabel
    ? `${label} · ${participantsLabel}`
    : label
}

export function getSessionTypeLabel(type: string): string {
  console.error('RAW session.type USED — FORBIDDEN')
  return getSessionMeta({ type })
}

export function getSessionBadgeClass(session: SessionLike): string {
  return SESSION_BADGE_CLASSES[getNormalizedSessionType(session)] ?? 'bg-blue-100 text-blue-800'
}

export function getSessionBorderClass(session: SessionLike): string {
  return SESSION_BORDER_CLASSES[getNormalizedSessionType(session)] ?? 'border-l-2 border-blue-500'
}

export function getSessionIconKey(session: SessionLike): 'users' | 'person' | 'zap' | 'battle' {
  return SESSION_ICON_KEYS[getNormalizedSessionType(session)] ?? 'users'
}

export function getSessionIconBgClass(session: SessionLike): string {
  return SESSION_ICON_BG_CLASSES[getNormalizedSessionType(session)] ?? 'bg-blue-500/20 text-blue-400'
}

export function sessionStatusVariant(status: string | null | undefined): SessionStatusVariant {
  const normalizedStatus = String(status ?? '').trim().toLowerCase()
  return SESSION_STATUS_VARIANTS[normalizedStatus] ?? SESSION_STATUS_VARIANTS.scheduled
}

export function isBattleReviewSession(session: SessionLike): boolean {
  return getNormalizedSessionType(session) === 'battle_review'
}

export function isGroupPracticeSession(session: SessionLike): boolean {
  return getNormalizedSessionType(session) === 'group_practice'
}

export function isIndividualSession(session: SessionLike): boolean {
  return getNormalizedSessionType(session) === 'individual'
}

export function isPrivateSession(session: SessionLike): boolean {
  return getNormalizedSessionType(session) === 'private'
}

export function isIntensiveSession(session: SessionLike): boolean {
  return getNormalizedSessionType(session) === 'intensive'
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getSessionDateLabel(date: Date | string): string {
  const d = new Date(date);

  const day = d.toLocaleDateString('uk-UA', { weekday: 'long' });
  const dayNumber = d.getDate();
  const month = d.toLocaleDateString('uk-UA', { month: 'long' });
  const time = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

  return `${capitalize(day)}, ${dayNumber} ${month} · ${time}`;
}

export function getSessionCountdownLabel(startAt: Date): string {
  const sessionDate = new Date(startAt);
  const time = sessionDate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  const relativeDayLabel = getRelativeDayLabel(sessionDate);

  if (relativeDayLabel === 'сьогодні') return `Сьогодні о ${time}`;
  if (relativeDayLabel === 'завтра') return `Завтра о ${time}`;

  return getSessionDateLabel(sessionDate);
}

export function isZoomLinkActive(scheduledAt: string): boolean {
  const sessionTime = new Date(scheduledAt).getTime();
  return sessionTime <= Date.now() + 2 * 60 * 60 * 1000;
}

export function getSessionDotClass(type: ZoomSessionType, isPast: boolean): string {
  if (isPast) return 'bg-gray-400';
  return SESSION_DOT_CLASSES[getNormalizedSessionType(type)] ?? 'bg-blue-500';
}

export function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  // Monday = 0 offset, Sunday = 6
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d.setDate(d.getDate() + diff));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

export function getMonthGrid(date: Date): (Date | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday-based week: Mon=0..Sun=6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = 42;

  const grid: (Date | null)[] = [];

  for (let i = 0; i < startOffset; i++) grid.push(null);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    grid.push(new Date(year, month, d));
  }

  while (grid.length < totalCells) grid.push(null);

  return grid;
}

const UK_MONTHS = [
  'січня','лютого','березня','квітня','травня','червня',
  'липня','серпня','вересня','жовтня','листопада','грудня',
];

export function formatUkrDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const month = UK_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(d: Date | null): boolean {
  if (!d) return false;
  return isSameDay(d, new Date());
}

export function isTomorrow(d: Date | null): boolean {
  if (!d) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(d, tomorrow);
}

export function getRelativeDayLabel(date: Date | string): string {
  const resolvedDate = new Date(date);

  if (isToday(resolvedDate)) return 'сьогодні';
  if (isTomorrow(resolvedDate)) return 'завтра';

  return formatDistanceToNow(resolvedDate, {
    addSuffix: false,
    locale: uk,
  });
}

export function isPastDate(iso: string): boolean {
  return new Date(iso) < new Date();
}

export function getSlotDotClass(session: ZoomCalendarSession, isUser: boolean): string {
  const past = isPastDate(session.scheduledAt);
  if (past) return 'bg-gray-400';
  if (isGroupPracticeSession(session)) return 'bg-purple-500';
  if (isBattleReviewSession(session)) return 'bg-amber-500';
  if (isIndividualSession(session) || isPrivateSession(session)) {
    if (isUser) {
      if (session.isMyBooking) return 'bg-amber-500';
      return session.slotStatus === 'booked' ? 'bg-gray-400' : 'bg-teal-500';
    }
    return 'bg-teal-500';
  }
  return SESSION_DOT_CLASSES[getNormalizedSessionType(session)] ?? 'bg-blue-500';
}

export function formatPrice(priceCents: number, isSubscriber: boolean): string {
  if (priceCents === 0 || isSubscriber) return 'Безкоштовно';
  return `${priceCents / 100} грн`;
}

export function getRemainingLabel(remaining: number, max: number): string {
  return `${remaining} з ${max} місць`;
}
