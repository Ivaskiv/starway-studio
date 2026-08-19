import {
  useBookPrivateSlotMutation,
  useBookSlotMutation,
  useCancelPrivateBookingMutation,
  useCreateSwapRequestMutation,
  useUnbookSlotMutation,
} from '../../zoom.api'
import type {
  ZoomCalendarMode,
  ZoomCalendarSession,
} from '../../zoom.types'
import {
  formatPrice,
  formatUkrDate,
  getRemainingLabel,
  getSessionBadgeClass,
  getSessionMeta,
  isBattleReviewSession,
  isGroupPracticeSession,
  isIndividualSession,
  isIntensiveSession,
  isPastDate,
  isPrivateSession,
  isZoomLinkActive,
} from '../../zoom.utils'

import { BookingStatus } from './BookingStatus'
import { PRIMARY_BOOKING_BUTTON_CLASS } from './booking-ui'

export function SessionCard({
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
                <BookingStatus session={session} onAddToCalendar={onAddToCalendar} />
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
              <BookingStatus session={session} onAddToCalendar={onAddToCalendar} />
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
                <BookingStatus session={session} onAddToCalendar={onAddToCalendar} />
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
            <BookingStatus session={session} onAddToCalendar={onAddToCalendar} />
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
