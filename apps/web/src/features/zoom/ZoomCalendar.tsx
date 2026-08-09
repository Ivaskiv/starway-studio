// apps/web/src/features/zoom/ZoomCalendar.tsx

import { useEffect, useState } from 'react';
import {
  useGetCalendarSessionsQuery,
  useCreateZoomSessionMutation,
  useUpdateZoomSessionMutation,
  useCancelZoomSessionMutation,
  useBookSlotMutation,
  useUnbookSlotMutation,
  useBookPrivateSlotMutation,
  useCancelPrivateBookingMutation,
  useCreateSwapRequestMutation,
  useGetAvailablePrivateSlotsQuery,
} from './zoom.api';
import {
  useRegisterAttendeeMutation,
  useSubmitBookingPreparationMutation,
  useSubmitBookingQuestionMutation,
} from './services/zoom.api';
import {
  getMonthGrid,
  getWeekDays,
  isSameDay,
  isToday,
  isPastDate,
  isZoomLinkActive,
  getSlotDotClass,
  formatUkrDate,
  formatPrice,
  getRemainingLabel,
  getSessionBadgeClass,
  getSessionMeta,
  getNormalizedSessionType,
  isBattleReviewSession,
  isGroupPracticeSession,
  isIndividualSession,
  isIntensiveSession,
  isPrivateSession,
} from './zoom.utils';
import type {
  CalendarView,
  ZoomCalendarMode,
  ZoomCalendarSession,
  ZoomSessionType,
  CreateSessionPayload,
} from './zoom.types';

// ── helpers ───────────────────────────────────────────────────────────────────

const UK_DAY_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];

const UK_MONTH_NAMES = [
  'Січень','Лютий','Березень','Квітень','Травень','Червень',
  'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень',
];

function startOf(view: CalendarView, date: Date): Date {
  if (view === 'month') {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }
  const days = getWeekDays(date);
  return new Date(days[0].setHours(0, 0, 0, 0));
}

function endOf(view: CalendarView, date: Date): Date {
  if (view === 'month') {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  const days = getWeekDays(date);
  return new Date(days[6].setHours(23, 59, 59, 999));
}

function getNearestSession(sessions: ZoomCalendarSession[]): ZoomCalendarSession | null {
  const now = Date.now();

  return sessions
    .filter((session) => new Date(session.scheduledAt).getTime() > now)
    .sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime())[0] ?? null;
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function buildZoomCalendarEvent(session: ZoomCalendarSession): string {
  const startDate = new Date(session.scheduledAt);
  const endDate = new Date(startDate.getTime() + (session.durationMinutes ?? 60) * 60 * 1000);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'SUMMARY:ФОКУС Zoom-практика',
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    'DESCRIPTION:Zoom-практика ФОКУС',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');
}

function BookingQuestionModal({
  session,
  questionText,
  error,
  isSubmitting,
  onChange,
  onCancel,
  onConfirm,
}: {
  session: ZoomCalendarSession;
  questionText: string;
  error: string | null;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 py-4 sm:items-center">
      <button
        type="button"
        aria-label="Закрити запис на Zoom"
        onClick={onCancel}
        className="absolute inset-0"
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1117] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">Запис на Zoom</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{session.topic || 'ФОКУС · Zoom-практика'}</h3>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div>
            <label htmlFor="zoom-booking-question" className="block text-sm font-medium text-white">
              З яким питанням ти хочеш прийти на Zoom?
            </label>
            <textarea
              id="zoom-booking-question"
              value={questionText}
              onChange={(event) => onChange(event.target.value)}
              placeholder="наприклад: не можу почати заробляти / відкладаю / не розумію що робити"
              rows={4}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/20"
            />
            {error ? (
              <p className="mt-2 text-sm text-amber-300">{error}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/15 disabled:opacity-50"
            >
              {isSubmitting ? 'Записуємо...' : 'Підтвердити запис'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              Скасувати
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PRIMARY_BOOKING_BUTTON_CLASS = 'bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl shadow-md disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed';

function BookedState({
  session,
  onAddToCalendar,
}: {
  session: ZoomCalendarSession;
  onAddToCalendar: (session: ZoomCalendarSession) => void;
}) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="text-green-400 text-sm font-semibold">
        Ти записана
      </div>

      <button
        className="bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-2 rounded-lg"
        onClick={() => onAddToCalendar(session)}
        type="button"
      >
        Додати в календар
      </button>
    </div>
  );
}

function BookingPreparationModal({
  answer,
  error,
  isSubmitting,
  onChange,
  onCancel,
  onConfirm,
}: {
  answer: string;
  error: string | null;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 py-4 sm:items-center">
      <button
        type="button"
        aria-label="Закрити підготовку до Zoom"
        onClick={onCancel}
        className="absolute inset-0"
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1117] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">Підготовка до Zoom</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Що ти вже пробувала зробити?</h3>
        </div>

        <div className="space-y-4 px-4 py-4">
          <textarea
            value={answer}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Коротко опиши, що вже пробувала"
            rows={4}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/20"
          />
          {error ? (
            <p className="text-sm text-amber-300">{error}</p>
          ) : null}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/15 disabled:opacity-50"
            >
              {isSubmitting ? 'Зберігаємо...' : 'Підтвердити'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              Скасувати
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SessionDetailCard ─────────────────────────────────────────────────────────

function SessionDetailCard({
  session,
  mode,
  userId,
  onClose,
  onEdit,
  onCancel,
  onRequestBooking,
  onAddToCalendar,
}: {
  session: ZoomCalendarSession;
  mode: ZoomCalendarMode;
  userId: string;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRequestBooking?: (session: ZoomCalendarSession) => void;
  onAddToCalendar: (session: ZoomCalendarSession) => void;
}) {
  const linkActive = isZoomLinkActive(session.scheduledAt) && !!session.zoomLink;
  const [bookSlot, { isLoading: booking }] = useBookSlotMutation();
  const [unbookSlot, { isLoading: unbooking }] = useUnbookSlotMutation();
  const [bookPrivateSlot, { isLoading: bookingPrivate }] = useBookPrivateSlotMutation();
  const [cancelPrivateBooking, { isLoading: cancelingPrivate }] = useCancelPrivateBookingMutation();
  const [createSwapRequest, { isLoading: creatingSwap }] = useCreateSwapRequestMutation();

  const maxSlots = (session.remainingSlots !== undefined && session.attendeesCount !== undefined)
    ? session.remainingSlots + session.attendeesCount
    : undefined;
  const isBattleReview = isBattleReviewSession(session);
  const isPrivate = isPrivateSession(session);
  const isGroupPractice = isGroupPracticeSession(session);
  const isIndividual = isIndividualSession(session);
  const isIntensive = isIntensiveSession(session);

  const tooLateToUnbook = new Date(session.scheduledAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 mt-3">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getSessionBadgeClass(session)}`}>
            {getSessionMeta(session)}
          </span>
          <h3 className="text-[15px] font-semibold text-white mt-1.5 leading-snug">{session.topic}</h3>
          <p className="text-[12px] text-white/50 mt-0.5">{formatUkrDate(session.scheduledAt)}</p>
          {session.durationMinutes && (
            <p className="text-[11px] text-white/30 mt-0.5">{session.durationMinutes} хв</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/60 text-lg leading-none flex-shrink-0"
        >
          ×
        </button>
      </div>

      {mode === 'coach' && (
        <div className="flex flex-wrap gap-2 mb-3">
          {session.attendeesCount !== undefined && maxSlots !== undefined && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50">
              {session.attendeesCount} / {maxSlots} заброньовано
            </span>
          )}
          {session.notifiedAt24h && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400/80">
              ✓ 24h надіслано
            </span>
          )}
          {session.notifiedAt2h && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400/80">
              ✓ 2h надіслано
            </span>
          )}
        </div>
      )}

      {mode === 'user' && session.goalText && (
        <p className="text-[12px] text-white/60 bg-white/[0.03] rounded-lg px-3 py-2 mb-3">
          {session.goalText}
        </p>
      )}

      {/* Booking UI — user mode only */}
      {mode === 'user' && !isPastDate(session.scheduledAt) && !isBattleReview && (
        <div className="mb-3">
          {isPrivate && (
            <div className="flex flex-col gap-2">
              {session.isMyBooking ? (
                <BookedState session={session} onAddToCalendar={onAddToCalendar} />
              ) : (
                <button
                  onClick={() => onRequestBooking?.(session)}
                  disabled={bookingPrivate}
                  className={`self-start text-[13px] transition-all ${PRIMARY_BOOKING_BUTTON_CLASS}`}
                >
                   Записатись
                </button>
              )}
            </div>
          )}
          {isGroupPractice && (
            session.isMyBooking ? (
              <BookedState session={session} onAddToCalendar={onAddToCalendar} />
            ) : (
              <button
                onClick={() => onRequestBooking?.(session)}
                disabled={booking}
                className={`text-[13px] transition-all ${PRIMARY_BOOKING_BUTTON_CLASS}`}
              >
                {booking ? 'Додаємо...' : '+ Додати в розклад'}
              </button>
            )
          )}

          {isIndividual && (
            <div className="flex flex-col gap-2">
              {session.remainingSlots !== undefined && maxSlots !== undefined && (
                <div className="flex items-center justify-between text-[12px] text-white/50">
                  <span>{getRemainingLabel(session.remainingSlots, maxSlots)}</span>
                  {session.priceCents !== undefined && (
                    <span className="text-teal-400 font-semibold">
                      {formatPrice(session.priceCents, false)}
                    </span>
                  )}
                </div>
              )}
              {session.isMyBooking ? (
                <BookedState session={session} onAddToCalendar={onAddToCalendar} />
              ) : session.slotStatus === 'booked' ? (
                <span className="text-[12px] px-2 py-1 rounded-full bg-white/[0.05] text-white/30 self-start">
                  Зайнято
                </span>
              ) : (
                <button
                  onClick={() => onRequestBooking?.(session)}
                  disabled={booking || (session.remainingSlots ?? 1) <= 0}
                  className={`self-start text-[13px] transition-all ${PRIMARY_BOOKING_BUTTON_CLASS}`}
                >
                  {booking ? 'Бронюємо...' : 'Забронювати слот'}
                </button>
              )}
            </div>
          )}

          {isIntensive && !session.isMyBooking && (
            <button
              onClick={() => onRequestBooking?.(session)}
              disabled={booking}
              className={`text-[13px] transition-all ${PRIMARY_BOOKING_BUTTON_CLASS}`}
            >
              {booking ? 'Реєстрація...' : '+ Зареєструватись'}
            </button>
          )}
          {isIntensive && session.isMyBooking && (
            <BookedState session={session} onAddToCalendar={onAddToCalendar} />
          )}
        </div>
      )}

      <div className="flex gap-2">
        {session.zoomLink ? (
          <a
            href={linkActive ? session.zoomLink : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!linkActive}
            className={[
              'flex-1 text-center text-[13px] font-semibold py-2 rounded-lg border transition-all',
              linkActive
                ? 'bg-[rgba(var(--accent-rgb),0.12)] border-[rgba(var(--accent-rgb),0.3)] text-[rgb(var(--accent-rgb))] hover:bg-[rgba(var(--accent-rgb),0.2)]'
                : 'border-white/10 text-white/25 cursor-not-allowed pointer-events-none',
            ].join(' ')}
          >
            ▶ Zoom
          </a>
        ) : (
          <span className="flex-1 text-center text-xs text-white/60 mt-1 py-2">
            Після запису ти отримаєш доступ до Zoom
          </span>
        )}

        {mode === 'coach' && session.canEdit && (
          <>
            <button
              onClick={() => onEdit?.(session.id)}
              className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-[12px] text-white/60 hover:text-white/90 hover:bg-white/[0.08] transition-all"
            >
              Редагувати
            </button>
            <button
              onClick={() => onCancel?.(session.id)}
              className="px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/[0.05] text-[12px] text-red-400/70 hover:bg-red-500/[0.1] transition-all"
            >
              Скасувати
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── CreateSessionForm ─────────────────────────────────────────────────────────

function CreateSessionForm({
  defaultDate,
  onSubmit,
  onClose,
  isLoading,
}: {
  defaultDate: Date;
  onSubmit: (p: CreateSessionPayload) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const [date, setDate] = useState(
    `${pad(defaultDate.getDate())}.${pad(defaultDate.getMonth() + 1)}.${defaultDate.getFullYear()}`,
  );
  const [time, setTime] = useState('19:00');
  const [topic, setTopic] = useState('');
  const [type, setType] = useState<ZoomSessionType>('group_practice');
  const [zoomLink, setZoomLink] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const [d, m, y] = date.split('.').map(Number);
    const [h, min] = time.split(':').map(Number);
    const dt = new Date(y, m - 1, d, h, min, 0);
    onSubmit({
      scheduledAt: dt.toISOString(),
      topic,
      type,
      zoomLink: zoomLink || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/10 bg-white/[0.04] p-4 mt-3 flex flex-col gap-3"
    >
      <p className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">Нова сесія</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Дата (ДД.ММ.РРРР)</label>
          <input
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
            value={date}
            onChange={e => setDate(e.target.value)}
            placeholder="29.05.2026"
            required
          />
        </div>
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Час (ГГ:ХХ)</label>
          <input
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
            value={time}
            onChange={e => setTime(e.target.value)}
            placeholder="19:00"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] text-white/40 mb-1 block">Тема</label>
        <input
          className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Щотижнева сесія балансу"
          required
        />
      </div>

      <div>
        <label className="text-[11px] text-white/40 mb-1 block">Тип</label>
        <select
          className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/25"
          value={type}
          onChange={e => setType(e.target.value as ZoomSessionType)}
        >
          <option value="group_practice">Групова практика</option>
          <option value="individual">Індивідуальна</option>
          <option value="intensive">Інтенсив</option>
          <option value="battle_review">Battle</option>
        </select>
      </div>

      <div>
        <label className="text-[11px] text-white/40 mb-1 block">Zoom-посилання (опційно)</label>
        <input
          className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
          value={zoomLink}
          onChange={e => setZoomLink(e.target.value)}
          placeholder="https://zoom.us/j/..."
          type="url"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-2 rounded-lg bg-[rgba(var(--accent-rgb),0.12)] border border-[rgba(var(--accent-rgb),0.3)] text-[rgb(var(--accent-rgb))] text-[13px] font-semibold hover:bg-[rgba(var(--accent-rgb),0.2)] transition-all disabled:opacity-50"
        >
          {isLoading ? 'Створення...' : 'Створити'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-white/10 text-[13px] text-white/50 hover:text-white/80 transition-all"
        >
          Скасувати
        </button>
      </div>
    </form>
  );
}

function DaySessionsSheet({
  selectedDate,
  selectedSessions,
  onClose,
  onRequestBooking,
  onAddToCalendar,
}: {
  selectedDate: Date;
  selectedSessions: ZoomCalendarSession[];
  onClose: () => void;
  onRequestBooking: (session: ZoomCalendarSession) => void;
  onAddToCalendar: (session: ZoomCalendarSession) => void;
}) {
  const dateLabel = selectedDate.toLocaleDateString('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const nearestSession = selectedSessions[0] ?? null;
  const remainingSessions = nearestSession
    ? selectedSessions.filter((session) => session.id !== nearestSession.id)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 py-4 sm:items-center">
      <button
        type="button"
        aria-label="Закрити список сесій"
        onClick={onClose}
        className="absolute inset-0"
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1117] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">Сесії дня</p>
            <h3 className="mt-1 text-base font-semibold text-white">{dateLabel}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm font-semibold text-white/70 transition-all hover:bg-white/[0.08] hover:text-white"
          >
            Закрити
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
          {selectedSessions.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
              На цей день сесій немає
            </div>
          ) : (
            <div className="space-y-3">
              {nearestSession ? (
                <div className="rounded-2xl border border-[rgba(var(--accent-rgb),0.32)] bg-[rgba(var(--accent-rgb),0.12)] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.24)]">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[rgb(var(--accent-rgb))]">
                    Найближча Zoom-практика
                  </p>
                  {(() => {
                    const session = nearestSession;
                    const sessionTime = new Date(session.scheduledAt).toLocaleTimeString('uk-UA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const isPast = isPastDate(session.scheduledAt);
                    const normalizedSessionType = getNormalizedSessionType(session);
                    const isBookedOut = session.slotStatus === 'booked' || (session.remainingSlots ?? 1) <= 0;

                    return (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{session.topic || 'ФОКУС · Zoom-практика'}</p>
                          <p className="mt-1 text-xs text-white/75">
                            {sessionTime} · {getSessionMeta(session)}
                          </p>
                        </div>

                        {session.isMyBooking ? (
                          <BookedState session={session} onAddToCalendar={onAddToCalendar} />
                        ) : normalizedSessionType === 'battle_review' || isPast || session.status === 'CANCELLED' || session.status === 'COMPLETED' ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/35">
                            Недоступно
                          </span>
                        ) : isBookedOut && normalizedSessionType !== 'group_practice' && normalizedSessionType !== 'intensive' ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/35">
                            Зайнято
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRequestBooking(session)}
                            className={`cursor-pointer text-xs opacity-100 active:scale-[0.98] ${PRIMARY_BOOKING_BUTTON_CLASS}`}
                          >
                            Записатись
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : null}

              {remainingSessions.map((session) => {
                const sessionTime = new Date(session.scheduledAt).toLocaleTimeString('uk-UA', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const isPast = isPastDate(session.scheduledAt);
                const normalizedSessionType = getNormalizedSessionType(session);
                const isBookedOut = session.slotStatus === 'booked' || (session.remainingSlots ?? 1) <= 0;

                return (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{session.topic || 'ФОКУС · Zoom-практика'}</p>
                        <p className="mt-1 text-xs text-white/55">
                          {sessionTime} · {getSessionMeta(session)}
                        </p>
                      </div>

                        {session.isMyBooking ? (
                          <BookedState session={session} onAddToCalendar={onAddToCalendar} />
                        ) : normalizedSessionType === 'battle_review' || isPast || session.status === 'CANCELLED' || session.status === 'COMPLETED' ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/35">
                            Недоступно
                          </span>
                      ) : isBookedOut && normalizedSessionType !== 'group_practice' && normalizedSessionType !== 'intensive' ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/35">
                          Зайнято
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRequestBooking(session)}
                          className={`cursor-pointer text-xs opacity-100 active:scale-[0.98] ${PRIMARY_BOOKING_BUTTON_CLASS}`}
                        >
                          Записатись
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ZoomCalendar ──────────────────────────────────────────────────────────────

export interface ZoomCalendarProps {
  mode: ZoomCalendarMode;
  userId: string;
  expertId?: string;
}

export default function ZoomCalendar({ mode, userId, expertId }: ZoomCalendarProps) {
  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<ZoomCalendarSession | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<ZoomCalendarSession[]>([]);
  const [isDaySheetOpen, setIsDaySheetOpen] = useState(false);
  const [bookingQuestionSession, setBookingQuestionSession] = useState<ZoomCalendarSession | null>(null);
  const [bookingQuestionText, setBookingQuestionText] = useState('');
  const [bookingQuestionError, setBookingQuestionError] = useState<string | null>(null);
  const [bookingConfirmation, setBookingConfirmation] = useState<{ sessionId: string; text: string } | null>(null);
  const [bookingPreparationSessionId, setBookingPreparationSessionId] = useState<string | null>(null);
  const [bookingPreparationAnswer, setBookingPreparationAnswer] = useState('');
  const [bookingPreparationError, setBookingPreparationError] = useState<string | null>(null);
  const [bookingPreparationSuccess, setBookingPreparationSuccess] = useState<string | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [registerAttendee, { isLoading: isRegisteringAttendee }] = useRegisterAttendeeMutation();
  const [submitBookingPreparation, { isLoading: isSavingBookingPreparation }] = useSubmitBookingPreparationMutation();
  const [submitBookingQuestion, { isLoading: isSavingBookingQuestion }] = useSubmitBookingQuestionMutation();
  const [bookPrivateSlot, { isLoading: isBookingPrivateSlot }] = useBookPrivateSlotMutation();

  const from = startOf(view, currentDate).toISOString();
  const to   = endOf(view, currentDate).toISOString();

  const { data: sessions = [] } = useGetCalendarSessionsQuery(
    { from, to, role: mode, userId },
    { pollingInterval: 30_000, refetchOnMountOrArgChange: true },
  );
  const visibleSessions = sessions.filter(
    (session) => new Date(session.scheduledAt) >= new Date(),
  );
  useGetAvailablePrivateSlotsQuery(
    { expertId: expertId ?? userId, from, to },
    { skip: !(expertId ?? userId) },
  );
  const [createSession, { isLoading: creating }] = useCreateZoomSessionMutation();
  const [updateSession] = useUpdateZoomSessionMutation();
  const [cancelSession] = useCancelZoomSessionMutation();
  const isSubmittingBookingQuestion = isRegisteringAttendee || isSavingBookingQuestion || isBookingPrivateSlot;
  const isSubmittingBookingPreparation = isSavingBookingPreparation;

  const monthGrid = getMonthGrid(currentDate);
  const weekDays  = getWeekDays(currentDate);

  const prevPeriod = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const nextPeriod = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const periodLabel =
    view === 'month'
      ? `${UK_MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      : (() => {
          const days = getWeekDays(currentDate);
          const s = days[0];
          const e = days[6];
          return `${s.getDate()} – ${e.getDate()} ${UK_MONTH_NAMES[e.getMonth()]}`;
        })();

  const sessionsOnDay = (day: Date | null) => {
    if (!day) return [];
    return sessions.filter(s => isSameDay(new Date(s.scheduledAt), day));
  };

  const handleDayClick = (day: Date | null) => {
    if (!day) return;
    const daySessions = sessionsOnDay(day);
    if (mode === 'user') {
      setSelectedDate(day);
      setSelectedSessions(daySessions);
      setIsDaySheetOpen(true);
      setSelectedSession(null);
      setCreateDate(null);
      return;
    }

    if (daySessions.length > 0) {
      setSelectedSession(daySessions[0]);
      setCreateDate(null);
    } else if (mode === 'coach') {
      setCreateDate(day);
      setSelectedSession(null);
    }
  };

  const todaySession = sessions.find(s => isSameDay(new Date(s.scheduledAt), new Date()));

  useEffect(() => {
    if (mode !== 'user' || selectedDate || visibleSessions.length === 0) {
      return;
    }

    const nextSession = getNearestSession(visibleSessions);
    if (!nextSession) {
      return;
    }

    const nextSessionDate = new Date(nextSession.scheduledAt);
    setSelectedDate(nextSessionDate);
    setSelectedSessions([nextSession]);
    setIsDaySheetOpen(true);
  }, [mode, selectedDate, visibleSessions]);

  const handleCreate = async (payload: CreateSessionPayload) => {
    await createSession(payload).unwrap();
    setCreateDate(null);
  };

  const handleCancel = async (id: string) => {
    await cancelSession(id).unwrap();
    setSelectedSession(null);
  };

  const handleAddToCalendar = (session: ZoomCalendarSession) => {
    const icsContent = buildZoomCalendarEvent(session);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'focus-zoom-practice.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openBookingQuestion = (session: ZoomCalendarSession) => {
    setBookingConfirmation(null);
    setBookingPreparationSuccess(null);
    setBookingQuestionError(null);
    setBookingQuestionText('');
    setBookingQuestionSession(session);
  };

  const closeBookingQuestion = () => {
    if (isSubmittingBookingQuestion) {
      return;
    }

    setBookingQuestionSession(null);
    setBookingQuestionError(null);
    setBookingQuestionText('');
  };

  const handleBookingConfirm = async () => {
    if (!bookingQuestionSession) {
      return;
    }

    const normalizedQuestionText = bookingQuestionText.trim();
    if (!normalizedQuestionText) {
      setBookingQuestionError('Напиши коротко, з чим хочеш прийти на Zoom.');
      return;
    }

    try {
      if (isPrivateSession(bookingQuestionSession)) {
        await bookPrivateSlot(bookingQuestionSession.id).unwrap();
        await submitBookingQuestion({
          sessionId: bookingQuestionSession.id,
          questionText: normalizedQuestionText,
        }).unwrap();
      } else {
        await registerAttendee({
          sessionId: bookingQuestionSession.id,
          questionText: normalizedQuestionText,
        } as never).unwrap();
      }

      setBookingConfirmation({
        sessionId: bookingQuestionSession.id,
        text: 'Ти записана на Zoom.\n\n👉 Я передам твоє питання коучу\n👉 і підготую для тебе розбір',
      });
      setBookingQuestionSession(null);
      setBookingQuestionText('');
      setBookingQuestionError(null);
      setSelectedSession(null);
      setIsDaySheetOpen(false);
      setSelectedDate(null);
      setSelectedSessions([]);
    } catch (error) {
      console.error('[ZoomCalendar] booking with question failed', {
        sessionId: bookingQuestionSession.id,
        error,
      });
      setBookingQuestionError('Не вдалося завершити запис. Спробуй ще раз.');
    }
  };

  const openBookingPreparation = (sessionId: string) => {
    setBookingPreparationSessionId(sessionId);
    setBookingPreparationAnswer('');
    setBookingPreparationError(null);
    setBookingPreparationSuccess(null);
  };

  const closeBookingPreparation = () => {
    if (isSubmittingBookingPreparation) {
      return;
    }

    setBookingPreparationSessionId(null);
    setBookingPreparationAnswer('');
    setBookingPreparationError(null);
  };

  const handleBookingPreparationConfirm = async () => {
    if (!bookingPreparationSessionId) {
      return;
    }

    const normalizedPreparationAnswer = bookingPreparationAnswer.trim();
    if (!normalizedPreparationAnswer) {
      setBookingPreparationError('Напиши коротко, що ти вже пробувала.');
      return;
    }

    try {
      await submitBookingPreparation({
        sessionId: bookingPreparationSessionId,
        preparationAnswer: normalizedPreparationAnswer,
      }).unwrap();
      setBookingPreparationSuccess('Добре. Я врахую це перед Zoom.');
      setBookingPreparationSessionId(null);
      setBookingPreparationAnswer('');
      setBookingPreparationError(null);
    } catch (error) {
      console.error('[ZoomCalendar] booking preparation failed', {
        sessionId: bookingPreparationSessionId,
        error,
      });
      setBookingPreparationError('Не вдалося зберегти відповідь. Спробуй ще раз.');
    }
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Today banner */}
      {todaySession && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.04]">
          <div>
            <p className="text-[11px] text-white/40 mb-0.5">Сьогодні</p>
            <p className="text-[13px] font-medium text-white">
              {new Date(todaySession.scheduledAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
              {' — '}
              {todaySession.topic}
            </p>
          </div>
          {todaySession.zoomLink ? (
            <a
              href={isZoomLinkActive(todaySession.scheduledAt) ? todaySession.zoomLink : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!isZoomLinkActive(todaySession.scheduledAt)}
              className={[
                'flex-shrink-0 px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-all',
                isZoomLinkActive(todaySession.scheduledAt)
                  ? 'bg-[rgba(var(--accent-rgb),0.12)] border-[rgba(var(--accent-rgb),0.3)] text-[rgb(var(--accent-rgb))] hover:bg-[rgba(var(--accent-rgb),0.2)]'
                  : 'border-white/10 text-white/25 cursor-not-allowed pointer-events-none',
              ].join(' ')}
            >
              Zoom-посилання
            </a>
          ) : null}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['week', 'month'] as CalendarView[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={[
                'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all',
                view === v
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]',
              ].join(' ')}
            >
              {v === 'month' ? 'Місяць' : 'Тиждень'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevPeriod}
            className="w-7 h-7 rounded-lg border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all flex items-center justify-center text-[14px]"
          >
            ←
          </button>
          <span className="text-[13px] font-medium text-white/80 min-w-[160px] text-center">
            {periodLabel}
          </span>
          <button
            onClick={nextPeriod}
            className="w-7 h-7 rounded-lg border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all flex items-center justify-center text-[14px]"
          >
            →
          </button>
        </div>
      </div>

      {/* Month grid */}
      {view === 'month' && (
        <div className="rounded-xl border border-white/[0.07] overflow-hidden">
          <div className="grid grid-cols-7">
            {UK_DAY_SHORT.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold text-white/30 bg-white/[0.02]">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-white/[0.05]">
            {monthGrid.map((day, i) => {
              const daySessions = sessionsOnDay(day);
              const today = isToday(day);
              const hasSession = daySessions.length > 0;
              return (
                <div
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={[
                    'min-h-[80px] bg-[#0d1117] p-1.5',
                    hasSession ? 'bg-blue-500/10 text-white' : '',
                    day ? 'cursor-pointer hover:bg-white/[0.04] transition-colors' : 'opacity-0 pointer-events-none',
                    today ? 'ring-2 ring-inset ring-purple-500/50' : '',
                  ].join(' ')}
                >
                  {day && (
                    <>
                      <span className={['text-[11px] font-medium', today ? 'text-purple-400' : 'text-white/40'].join(' ')}>
                        {day.getDate()}
                      </span>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {daySessions.map(s => (
                          <span
                            key={s.id}
                            title={s.topic}
                            className="relative inline-flex items-center"
                          >
                            <span className={['w-2 h-2 rounded-full flex-shrink-0', getSlotDotClass(s, mode === 'user')].join(' ')} />
                            {s.type === 'individual' && !isPastDate(s.scheduledAt) &&
                              s.remainingSlots !== undefined && s.remainingSlots > 0 &&
                              (s.attendeesCount ?? 0) > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 text-[8px] leading-none bg-teal-500 text-white rounded-full px-0.5 min-w-[10px] text-center">
                                {s.remainingSlots}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week grid */}
      {view === 'week' && (
        <div className="rounded-xl border border-white/[0.07] overflow-hidden">
          <div className="grid grid-cols-7">
            {weekDays.map((d, i) => {
              const today = isToday(d);
              const daySessions = sessionsOnDay(d);
              return (
                <div
                  key={i}
                  onClick={() => handleDayClick(d)}
                  className={[
                    'border-r border-white/[0.05] last:border-r-0 p-2 min-h-[120px] cursor-pointer hover:bg-white/[0.03] transition-colors',
                    today ? 'bg-purple-500/[0.05]' : 'bg-[#0d1117]',
                  ].join(' ')}
                >
                  <div className="flex flex-col items-center mb-2">
                    <span className="text-[10px] text-white/30">{UK_DAY_SHORT[i]}</span>
                    <span className={['text-[14px] font-semibold', today ? 'text-purple-400' : 'text-white/60'].join(' ')}>
                      {d.getDate()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {daySessions.map(s => (
                      <div
                        key={s.id}
                        onClick={e => { e.stopPropagation(); setSelectedSession(s); setCreateDate(null); }}
                        className={['text-[10px] rounded px-1.5 py-1 cursor-pointer truncate', getSessionBadgeClass(s)].join(' ')}
                      >
                        {new Date(s.scheduledAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                        {' '}
                        {s.topic}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'user' && isDaySheetOpen && selectedDate && (
        <DaySessionsSheet
          selectedDate={selectedDate}
          selectedSessions={selectedSessions}
          onRequestBooking={openBookingQuestion}
          onAddToCalendar={handleAddToCalendar}
          onClose={() => {
            setIsDaySheetOpen(false);
            setSelectedDate(null);
            setSelectedSessions([]);
          }}
        />
      )}

      {/* Session detail */}
      {selectedSession && (
        <SessionDetailCard
          session={selectedSession}
          mode={mode}
          userId={userId}
          onClose={() => setSelectedSession(null)}
          onRequestBooking={openBookingQuestion}
          onAddToCalendar={handleAddToCalendar}
          onEdit={id => { setEditingSession(id); setSelectedSession(null); }}
          onCancel={handleCancel}
        />
      )}

      {mode === 'user' && bookingConfirmation && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-50">
          <div className="whitespace-pre-line">{bookingConfirmation.text}</div>
          <div className="mt-4">
            <p>👉 Щоб отримати максимум з цієї зустрічі:</p>
            <p className="mt-1">зроби 1 крок вже зараз</p>
            <button
              type="button"
              onClick={() => openBookingPreparation(bookingConfirmation.sessionId)}
              className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/15"
            >
              Зробити крок
            </button>
          </div>
        </div>
      )}

      {mode === 'user' && bookingPreparationSuccess && (
        <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-50">
          {bookingPreparationSuccess}
        </div>
      )}

      {/* Create form (coach + empty day click) */}
      {mode === 'coach' && createDate && (
        <CreateSessionForm
          defaultDate={createDate}
          onSubmit={handleCreate}
          onClose={() => setCreateDate(null)}
          isLoading={creating}
        />
      )}

      {/* Edit form */}
      {mode === 'coach' && editingSession && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 mt-3">
          <p className="text-[12px] text-white/50 mb-3">Редагування сесії {editingSession.slice(0, 8)}…</p>
          <button
            onClick={async () => {
              await updateSession({ id: editingSession, patch: {} });
              setEditingSession(null);
            }}
            className="text-[12px] text-white/40 hover:text-white/70"
          >
            Закрити
          </button>
        </div>
      )}

      {mode === 'user' && bookingQuestionSession && (
        <BookingQuestionModal
          session={bookingQuestionSession}
          questionText={bookingQuestionText}
          error={bookingQuestionError}
          isSubmitting={isSubmittingBookingQuestion}
          onChange={setBookingQuestionText}
          onCancel={closeBookingQuestion}
          onConfirm={() => void handleBookingConfirm()}
        />
      )}

      {mode === 'user' && bookingPreparationSessionId && (
        <BookingPreparationModal
          answer={bookingPreparationAnswer}
          error={bookingPreparationError}
          isSubmitting={isSubmittingBookingPreparation}
          onChange={setBookingPreparationAnswer}
          onCancel={closeBookingPreparation}
          onConfirm={() => void handleBookingPreparationConfirm()}
        />
      )}

    </div>
  );
}
