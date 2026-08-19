import type { ZoomCalendarSession } from '../../zoom.types'
import {
  getNormalizedSessionType,
  getSessionMeta,
  isPastDate,
} from '../../zoom.utils'

import { BookingStatus } from './BookingStatus'
import { PRIMARY_BOOKING_BUTTON_CLASS } from './booking-ui'

export function DaySessionsSheet({
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
                          <BookingStatus session={session} onAddToCalendar={onAddToCalendar} />
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
                          <BookingStatus session={session} onAddToCalendar={onAddToCalendar} />
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
