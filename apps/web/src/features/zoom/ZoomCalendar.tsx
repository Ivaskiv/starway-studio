// apps/web/src/features/zoom/ZoomCalendar.tsx

import { useState } from 'react';
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
} from './zoom.utils';
import type {
  CalendarView,
  ZoomCalendarMode,
  ZoomCalendarSession,
  ZoomSessionType,
  CreateSessionPayload,
} from './zoom.types';

// ── helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ZoomSessionType, string> = {
  group_practice: 'Групова практика',
  individual:     'Індивідуальна',
  intensive:      'Інтенсив',
  battle_review:  'Battle',
  PRIVATE:        'PRIVATE слот',
  GROUP:          'GROUP практика',
};

const TYPE_BADGE: Record<ZoomSessionType, string> = {
  group_practice: 'bg-purple-100 text-purple-800',
  battle_review:  'bg-amber-100 text-amber-800',
  individual:     'bg-teal-100 text-teal-800',
  intensive:      'bg-blue-100 text-blue-800',
  PRIVATE:        'bg-blue-100 text-blue-800',
  GROUP:          'bg-purple-100 text-purple-800',
};

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

// ── SessionDetailCard ─────────────────────────────────────────────────────────

function SessionDetailCard({
  session,
  mode,
  userId,
  onClose,
  onEdit,
  onCancel,
}: {
  session: ZoomCalendarSession;
  mode: ZoomCalendarMode;
  userId: string;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
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

  const tooLateToUnbook = new Date(session.scheduledAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 mt-3">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[session.type]}`}>
            {TYPE_LABELS[session.type]}
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
      {mode === 'user' && !isPastDate(session.scheduledAt) && session.type !== 'battle_review' && (
        <div className="mb-3">
          {(session.type === 'PRIVATE') && (
            <div className="flex flex-col gap-2">
              {session.isMyBooking ? (
                <>
                  <button
                    onClick={() => cancelPrivateBooking(session.id).catch(console.error)}
                    disabled={cancelingPrivate}
                    className="self-start px-4 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[13px] font-semibold hover:bg-amber-500/20 transition-all disabled:opacity-50"
                  >
                    ❌ Скасувати запис
                  </button>
                  <button
                    onClick={() => createSwapRequest({ sessionIdFrom: session.id }).catch(console.error)}
                    disabled={creatingSwap}
                    className="self-start px-4 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[13px] font-semibold hover:bg-blue-500/20 transition-all disabled:opacity-50"
                  >
                    💱 Запропонувати обмін
                  </button>
                </>
              ) : (
                <button
                  onClick={() => bookPrivateSlot(session.id).catch(console.error)}
                  disabled={bookingPrivate}
                  className="self-start px-4 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[13px] font-semibold hover:bg-blue-500/20 transition-all disabled:opacity-50"
                >
                  📅 Записатись
                </button>
              )}
            </div>
          )}
          {session.type === 'group_practice' && (
            session.isMyBooking ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] px-2 py-1 rounded-full bg-teal-500/10 text-teal-400">
                  У розкладі ✓
                </span>
                <button
                  onClick={() => unbookSlot(session.id).catch(console.error)}
                  disabled={unbooking}
                  className="text-[12px] text-white/40 hover:text-white/70 transition-all disabled:opacity-50"
                >
                  Видалити
                </button>
              </div>
            ) : (
              <button
                onClick={() => bookSlot(session.id).catch(console.error)}
                disabled={booking}
                className="px-4 py-2 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 text-[13px] font-semibold hover:bg-purple-500/20 transition-all disabled:opacity-50"
              >
                {booking ? 'Додаємо...' : '+ Додати в розклад'}
              </button>
            )
          )}

          {session.type === 'individual' && (
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
                <div className="flex items-center gap-2">
                  <span className="text-[12px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-400">
                    Ваше бронювання ✓
                  </span>
                  <button
                    onClick={() => !tooLateToUnbook && unbookSlot(session.id).catch(console.error)}
                    disabled={unbooking || tooLateToUnbook}
                    title={tooLateToUnbook ? 'Скасування закрито менш ніж за 24г до сесії' : undefined}
                    className="text-[12px] text-white/40 hover:text-white/70 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Скасувати
                  </button>
                </div>
              ) : session.slotStatus === 'booked' ? (
                <span className="text-[12px] px-2 py-1 rounded-full bg-white/[0.05] text-white/30 self-start">
                  Зайнято
                </span>
              ) : (
                <button
                  onClick={() => bookSlot(session.id).catch(console.error)}
                  disabled={booking || (session.remainingSlots ?? 1) <= 0}
                  className="self-start px-4 py-2 rounded-lg border border-teal-500/30 bg-teal-500/10 text-teal-400 text-[13px] font-semibold hover:bg-teal-500/20 transition-all disabled:opacity-50"
                >
                  {booking ? 'Бронюємо...' : 'Забронювати слот'}
                </button>
              )}
            </div>
          )}

          {session.type === 'intensive' && !session.isMyBooking && (
            <button
              onClick={() => bookSlot(session.id).catch(console.error)}
              disabled={booking}
              className="px-4 py-2 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[13px] font-semibold hover:bg-blue-500/20 transition-all disabled:opacity-50"
            >
              {booking ? 'Реєстрація...' : '+ Зареєструватись'}
            </button>
          )}
          {session.type === 'intensive' && session.isMyBooking && (
            <span className="text-[12px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-400">
              Зареєстровано ✓
            </span>
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
          <span className="flex-1 text-center text-[12px] text-white/30 py-2">Посилання буде додано</span>
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

// ── ZoomCalendar ──────────────────────────────────────────────────────────────

export interface ZoomCalendarProps {
  mode: ZoomCalendarMode;
  userId: string;
  expertId?: string;
}

export default function ZoomCalendar({ mode, userId, expertId }: ZoomCalendarProps) {
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<ZoomCalendarSession | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [editingSession, setEditingSession] = useState<string | null>(null);

  const from = startOf(view, currentDate).toISOString();
  const to   = endOf(view, currentDate).toISOString();

  const { data: sessions = [] } = useGetCalendarSessionsQuery(
    { from, to, role: mode, userId },
    { pollingInterval: 30_000, refetchOnMountOrArgChange: true },
  );
  useGetAvailablePrivateSlotsQuery(
    { expertId: expertId ?? userId, from, to },
    { skip: !(expertId ?? userId) },
  );
  const [createSession, { isLoading: creating }] = useCreateZoomSessionMutation();
  const [updateSession] = useUpdateZoomSessionMutation();
  const [cancelSession] = useCancelZoomSessionMutation();

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
    if (daySessions.length > 0) {
      setSelectedSession(daySessions[0]);
      setCreateDate(null);
    } else if (mode === 'coach') {
      setCreateDate(day);
      setSelectedSession(null);
    }
  };

  const todaySession = sessions.find(s => isSameDay(new Date(s.scheduledAt), new Date()));

  const handleCreate = async (payload: CreateSessionPayload) => {
    await createSession(payload).unwrap();
    setCreateDate(null);
  };

  const handleCancel = async (id: string) => {
    await cancelSession(id).unwrap();
    setSelectedSession(null);
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
          {(['month', 'week'] as CalendarView[]).map(v => (
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
              return (
                <div
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className={[
                    'min-h-[80px] bg-[#0d1117] p-1.5',
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
                        className={['text-[10px] rounded px-1.5 py-1 cursor-pointer truncate', TYPE_BADGE[s.type]].join(' ')}
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

      {/* Session detail */}
      {selectedSession && (
        <SessionDetailCard
          session={selectedSession}
          mode={mode}
          userId={userId}
          onClose={() => setSelectedSession(null)}
          onEdit={id => { setEditingSession(id); setSelectedSession(null); }}
          onCancel={handleCancel}
        />
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

    </div>
  );
}
