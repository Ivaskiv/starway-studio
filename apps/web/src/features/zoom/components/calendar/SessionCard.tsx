import { useEffect, useState } from 'react'
import { openExternalPaymentUrl } from '@/features/subscription/utils/openExternalPaymentUrl'

import {
  useBookPrivateSlotMutation,
  useBookSlotMutation,
  useCancelPrivateBookingMutation,
  useCompleteZoomSessionMutation,
  useLazyGetZoomCompletionDraftQuery,
  useCreateSwapRequestMutation,
  useUnbookSlotMutation,
} from '../../zoom.api'
import type {
  ZoomCalendarMode,
  ZoomCalendarSession,
  ZoomCompletionPayload,
} from '../../zoom.types'
import {
  formatUkrDate,
  getRemainingLabel,
  getSessionBadgeClass,
  getSessionMeta,
  getUserZoomCommercePresentation,
  getZoomPaymentBadgeLabel,
  isBattleReviewSession,
  isGroupPracticeSession,
  isIndividualSession,
  isIntensiveSession,
  isPastDate,
  isPrivateSession,
  isZoomLinkActive,
  sessionStatusVariant,
} from '../../zoom.utils'

import { BookingStatus } from './BookingStatus'
import { PRIMARY_BOOKING_BUTTON_CLASS } from './booking-ui'

type CompletionPayloadInput = {
  actualParticipantUserIds: string[]
  attendeeCount: string
  maxAttendeeCount?: number
  outcomeTopic: string
  summary: string
  recordingRef: string
}

export function buildZoomCompletionPayload({
  actualParticipantUserIds,
  attendeeCount,
  maxAttendeeCount,
  outcomeTopic,
  summary,
  recordingRef,
}: CompletionPayloadInput): ZoomCompletionPayload {
  const payload: ZoomCompletionPayload = {}

  if (actualParticipantUserIds.length > 0) {
    payload.actualParticipantUserIds = actualParticipantUserIds
  }

  const parsedCount = Number(attendeeCount)
  if (Number.isFinite(parsedCount) && parsedCount >= 0) {
    const normalizedCount = Math.floor(parsedCount)
    payload.attendeeCount = maxAttendeeCount !== undefined
      ? Math.min(normalizedCount, maxAttendeeCount)
      : normalizedCount
  }

  if (outcomeTopic.trim()) payload.topic = outcomeTopic.trim()
  if (summary.trim()) payload.summary = summary.trim()
  if (recordingRef.trim()) payload.recordingRef = recordingRef.trim()

  return payload
}

export function SessionCard({
  session,
  mode,
  userId,
  onClose,
  onEdit,
  onCancel,
  onRequestBooking,
  onAddToCalendar,
  initialCompletionOpen = false,
}: {
  session: ZoomCalendarSession;
  mode: ZoomCalendarMode;
  userId: string;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRequestBooking?: (session: ZoomCalendarSession) => void;
  onAddToCalendar: (session: ZoomCalendarSession) => void;
  initialCompletionOpen?: boolean;
}) {
  const linkActive = isZoomLinkActive(session.scheduledAt) && !!session.zoomLink;
  const [bookSlot, { isLoading: booking }] = useBookSlotMutation();
  const [unbookSlot, { isLoading: unbooking }] = useUnbookSlotMutation();
  const [bookPrivateSlot, { isLoading: bookingPrivate }] = useBookPrivateSlotMutation();
  const [cancelPrivateBooking, { isLoading: cancelingPrivate }] = useCancelPrivateBookingMutation();
  const [createSwapRequest, { isLoading: creatingSwap }] = useCreateSwapRequestMutation();
  const [completeZoomSession, { isLoading: completing }] = useCompleteZoomSessionMutation();
  const [loadCompletionDraft, { isFetching: loadingCompletionDraft }] = useLazyGetZoomCompletionDraftQuery();
  const initialActualIds = session.attendees?.filter((attendee) => attendee.attended).map((attendee) => attendee.userId) ?? [];
  const [completionOpen, setCompletionOpen] = useState(initialCompletionOpen);
  const [actualParticipantUserIds, setActualParticipantUserIds] = useState<string[]>(initialActualIds);
  const [attendeeCount, setAttendeeCount] = useState(String(session.actualAttendeeCount ?? initialActualIds.length));
  const [outcomeTopic, setOutcomeTopic] = useState(session.outcomeTopic ?? '');
  const [summary, setSummary] = useState(session.summary ?? '');
  const [recordingRef, setRecordingRef] = useState(session.recordingUrl ?? '');
  const [completionDraftMessage, setCompletionDraftMessage] = useState<string | null>(null);
  const [completionDraftFailed, setCompletionDraftFailed] = useState(false);

  const maxSlots = (session.remainingSlots !== undefined && session.attendeesCount !== undefined)
    ? session.remainingSlots + session.attendeesCount
    : undefined;
  const isBattleReview = isBattleReviewSession(session);
  const isPrivate = isPrivateSession(session);
  const isGroupPractice = isGroupPracticeSession(session);
  const isIndividual = isIndividualSession(session);
  const isIntensive = isIntensiveSession(session);
  const statusVariant = sessionStatusVariant(session.battleStatus ?? session.status)

  const tooLateToUnbook = new Date(session.scheduledAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
  const canUnbook = session.isMyBooking && !tooLateToUnbook && (isPrivate || isGroupPractice);
  const canComplete = mode === 'coach' && Boolean(session.canEdit) && session.status !== 'COMPLETED' && session.status !== 'CANCELLED' && new Date(session.scheduledAt).getTime() <= Date.now();
  const hasCompletionOutcome = session.status === 'COMPLETED' && (session.actualAttendeeCount !== undefined || Boolean(session.summary) || Boolean(session.outcomeTopic) || Boolean(session.recordingUrl));
  const canLoadCompletionDraft = Boolean(session.recordingAvailable || session.recordingUrl || session.audioFileId);
  const commercePresentation = getUserZoomCommercePresentation(session);
  const paymentBadgeLabel = session.commerceLabel ?? getZoomPaymentBadgeLabel(session);
  const hasCommerceState = Boolean(session.commerceLabel);
  const isOccupiedForUser = session.slotStatus === 'booked' || (session.remainingSlots ?? 1) <= 0;
  const isPendingIndividualPayment =
    mode === 'user'
    && (isIndividual || isPrivate)
    && session.commerceStatus === 'APPROVED_PENDING_PAYMENT'
    && session.isMyPendingPayment === true
    && Boolean(session.checkoutUrl);

  const pendingPaymentAmount = session.priceCents !== undefined
    ? `${new Intl.NumberFormat('uk-UA', {
        minimumFractionDigits: session.priceCents % 100 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(session.priceCents / 100)} ${session.currency === 'UAH' ? 'ГРН' : session.currency ?? 'EUR'}`
    : null;

  const pendingPaymentDeadlineLabel = session.paymentDeadline
    ? new Date(session.paymentDeadline).toLocaleTimeString('uk-UA', {
        timeZone: 'Europe/Kyiv',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  useEffect(() => {
    if (initialCompletionOpen && canComplete) {
      setCompletionOpen(true);
    }
  }, [canComplete, initialCompletionOpen, session.id]);


  const handleLoadCompletionDraft = async () => {
    if (!canLoadCompletionDraft || loadingCompletionDraft) return;

    setCompletionDraftMessage(null);
    setCompletionDraftFailed(false);
    try {
      const draft = await loadCompletionDraft(session.id).unwrap();
      if (!draft.available) {
        setCompletionDraftMessage(
          draft.reason === 'transcript_missing'
            ? 'Обробляємо запис...'
            : draft.reason === 'recording_missing'
              ? 'Запис ще не готовий.'
              : 'AI draft недоступний для цієї сесії.',
        );
        return;
      }

      let applied = false;
      if (!outcomeTopic.trim() && draft.topic?.trim()) {
        setOutcomeTopic(draft.topic.trim());
        applied = true;
      }

      if (!recordingRef.trim() && draft.recordingUrl?.trim()) {
        setRecordingRef(draft.recordingUrl.trim());
        applied = true;
      }

      if (!summary.trim()) {
        const keyPoints = draft.keyPoints
          .map((point) => point.trim())
          .filter(Boolean);
        const nextSummary = [
          draft.summary?.trim() ?? '',
          keyPoints.length ? `Ключові пункти:\n${keyPoints.map((point) => `• ${point}`).join('\n')}` : '',
        ].filter(Boolean).join('\n\n');

        if (nextSummary) {
          setSummary(nextSummary);
          applied = true;
        }
      }

      setCompletionDraftMessage(
        applied
          ? 'AI draft заповнив порожні поля. Перевір і відредагуй перед збереженням.'
          : 'Поля вже заповнені вручну. AI draft не перезаписав їх.',
      );
    } catch {
      setCompletionDraftFailed(true);
      setCompletionDraftMessage('Не вдалося обробити запис');
    }
  };

  const handleComplete = async () => {
    const payload = buildZoomCompletionPayload({
      actualParticipantUserIds,
      attendeeCount,
      maxAttendeeCount: isGroupPractice ? maxSlots : undefined,
      outcomeTopic,
      summary,
      recordingRef,
    });

    await completeZoomSession({ id: session.id, payload }).unwrap();
    setCompletionOpen(false);
  };

  const handleUnbook = async () => {
    if (!canUnbook) {
      return;
    }

    if (isPrivate) {
      await cancelPrivateBooking(session.id).unwrap();
      return;
    }

    if (isGroupPractice) {
      await unbookSlot(session.id).unwrap();
    }
  };

  if (isPendingIndividualPayment) {
    return (
      <div className="rounded-2xl border border-amber-300/25 bg-[#0d1117] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.38)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-300">
              Індивідуальна сесія
            </p>
            <h3 className="mt-1 truncate text-[16px] font-semibold text-white">
              {session.topic || 'Zoom-сесія'}
            </h3>
            <p className="mt-1 text-[12px] text-white/55">
              {formatUkrDate(session.scheduledAt)}
              {session.durationMinutes ? ` · ${session.durationMinutes} хв` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-lg text-white/50 transition hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-400/[0.08] p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-semibold text-amber-200">
              🟠 {commercePresentation.label}
            </span>

            {pendingPaymentAmount && (
              <span className="text-[14px] font-bold text-white">
                {pendingPaymentAmount}
              </span>
            )}
          </div>

          <p className="mt-2 text-[12px] leading-relaxed text-white/70">
            Цей час тимчасово заброньований за тобою.
          </p>

          <p className="mt-1 text-[11px] leading-relaxed text-amber-100/75">
            Після цього бронювання автоматично скасується, а час стане доступним для інших.
          </p>

          {pendingPaymentDeadlineLabel && (
            <p className="mt-2 text-[11px] font-semibold text-amber-100">
              Заверши оплату до {pendingPaymentDeadlineLabel}.
            </p>
          )}
        </div>

        {session.goalText && (
          <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.1em] text-white/35">
              Твоє питання
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/70">
              {session.goalText}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => openExternalPaymentUrl(session.checkoutUrl!)}
          className={`mt-4 w-full text-[13px] transition-all ${PRIMARY_BOOKING_BUTTON_CLASS}`}
        >
          {pendingPaymentAmount
            ? `ОПЛАТИТИ ${pendingPaymentAmount}`
            : 'ОПЛАТИТИ СЕСІЮ'}
        </button>

        <p className="mt-2 text-center text-[10px] text-white/35">
          Zoom-посилання стане доступним після підтвердження оплати.
        </p>
      </div>
    );
  }

  return (
    <div className={['mt-2 rounded-2xl border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]', statusVariant.surfaceClass].join(' ')}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getSessionBadgeClass(session)}`}>
            {getSessionMeta(session)}
          </span>
          <span className={`ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusVariant.badgeClass}`}>
            {mode === 'user' && (isIndividual || isPrivate || isBattleReview) ? session.commerceLabel ?? statusVariant.label : statusVariant.label}
          </span>
          <h3 className={['mt-2 text-[15px] font-semibold leading-snug', statusVariant.textClass].join(' ')}>
            {session.topic}
          </h3>
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
        <div className="mb-3 flex flex-wrap gap-2">
          {session.attendeesCount !== undefined && maxSlots !== undefined && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50">
              {session.attendeesCount} / {maxSlots} заброньовано
            </span>
          )}
          {paymentBadgeLabel && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/70">
              {paymentBadgeLabel}
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

      {hasCompletionOutcome && (
        <div className="mb-3 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.06] px-3 py-2 text-[12px] leading-snug text-white/70">
          <p className="font-semibold text-emerald-200">✅ Завершено</p>
          {session.actualAttendeeCount !== undefined && (
            <p className="mt-1">{session.actualAttendeeCount} були присутні</p>
          )}
          {session.outcomeTopic && <p className="mt-1">Тема: {session.outcomeTopic}</p>}
          {session.summary && <p className="mt-1">Підсумок: {session.summary}</p>}
          {session.recordingUrl && session.canViewRecording && (
            <a
              href={session.recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex rounded-lg border border-sky-300/25 bg-sky-500/15 px-2.5 py-1 font-semibold text-sky-100 transition hover:bg-sky-500/25"
            >
              Відкрити запис
            </a>
          )}
        </div>
      )}

      {mode === 'user' && !isPastDate(session.scheduledAt) && (
        <>
          {isBattleReview && session.commerceStatus === 'APPROVED_PENDING_PAYMENT'
            && session.isMyPendingPayment && session.checkoutUrl && (
              <button
                onClick={() => openExternalPaymentUrl(session.checkoutUrl!)}
                className={`mb-2 text-[13px] transition-all ${PRIMARY_BOOKING_BUTTON_CLASS}`}
              >
                ОПЛАТИТИ
              </button>
            )}
        </>
      )}

      {/* Booking UI — user mode only */}
      {mode === 'user' && !isPastDate(session.scheduledAt) && !isBattleReview && (
        <div className="mb-3">
          {isPrivate && (
            <div className="flex flex-col gap-2">
              {session.isMyBooking ? (
                <BookingStatus
                  session={session}
                  onAddToCalendar={onAddToCalendar}
                  onUnbook={canUnbook ? () => void handleUnbook() : undefined}
                  unbookDisabled={!canUnbook || unbooking || cancelingPrivate}
                />
              ) : session.isMyPendingPayment || hasCommerceState ? (
                <span className="self-start rounded-full bg-amber-500/10 px-2 py-1 text-[12px] text-amber-200">
                  {paymentBadgeLabel}
                </span>
              ) : isOccupiedForUser ? (
                <span className="self-start rounded-full bg-white/[0.05] px-2 py-1 text-[12px] text-white/35">
                  Зайнято
                </span>
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
              <div className="flex flex-col gap-2">
                <BookingStatus
                  session={session}
                  onAddToCalendar={onAddToCalendar}
                  onUnbook={canUnbook ? () => void handleUnbook() : undefined}
                  unbookDisabled={!canUnbook || unbooking}
                />
                {session.myQuestion ? (
                  <div className="rounded-lg border border-emerald-400/15 bg-emerald-500/[0.06] px-3 py-2 text-[12px] text-emerald-100">
                    <p className="font-semibold">Твоє питання: {session.myQuestion.text}</p>
                    <p className="mt-1 text-emerald-100/70">№{session.myQuestion.position} у черзі</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRequestBooking?.(session)}
                    className={`self-start text-[13px] transition-all ${PRIMARY_BOOKING_BUTTON_CLASS}`}
                  >
                    Додати питання
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => onRequestBooking?.(session)}
                disabled={booking}
                className={`text-[13px] transition-all ${PRIMARY_BOOKING_BUTTON_CLASS}`}
              >
                {booking ? 'Додаємо...' : 'Записатися'}
              </button>
            )
          )}

          {isIndividual && (
            <div className="flex flex-col gap-2">
              {session.commerceStatus === 'APPROVED_PENDING_PAYMENT' && session.priceCents !== undefined && (
                <div className="flex items-center justify-between text-[12px] text-white/50">
                  <span>Оплата</span>
                  <span className="font-semibold text-amber-200">
                    {pendingPaymentAmount}
                  </span>
                </div>
              )}
              {session.isMyBooking ? (
                <BookingStatus
                  session={session}
                  onAddToCalendar={onAddToCalendar}
                  onUnbook={canUnbook ? () => void handleUnbook() : undefined}
                  unbookDisabled={!canUnbook || unbooking || cancelingPrivate}
                />
              ) : !(session.isMyPendingPayment || hasCommerceState) && (
                isOccupiedForUser ? (
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
                )
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
            <BookingStatus
              session={session}
              onAddToCalendar={onAddToCalendar}
              onUnbook={canUnbook ? () => void handleUnbook() : undefined}
              unbookDisabled={!canUnbook || unbooking || cancelingPrivate}
            />
          )}
        </div>
      )}

      {canComplete && (
        <div className="mb-3">
          {!completionOpen ? (
            <button
              type="button"
              onClick={() => setCompletionOpen(true)}
              className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-[12px] font-semibold text-emerald-100 transition hover:bg-emerald-500/18"
            >
              Завершити сесію
            </button>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="grid gap-3">
                {session.attendees && session.attendees.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Фактичні присутні</p>
                    <div className="grid gap-2">
                      {session.attendees.map((attendee) => {
                        const checked = actualParticipantUserIds.includes(attendee.userId);
                        return (
                          <label key={attendee.userId} className="flex items-center gap-2 text-[12px] text-white/70">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                setActualParticipantUserIds((current) => event.target.checked
                                  ? [...new Set([...current, attendee.userId])]
                                  : current.filter((userIdValue) => userIdValue !== attendee.userId));
                              }}
                            />
                            <span>{attendee.name ?? attendee.userId}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleLoadCompletionDraft()}
                    disabled={!canLoadCompletionDraft || loadingCompletionDraft}
                    className="rounded-lg border border-sky-300/25 bg-sky-500/14 px-3 py-2 text-[12px] font-semibold text-sky-100 transition hover:bg-sky-500/24 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {loadingCompletionDraft ? 'Обробляємо запис...' : completionDraftFailed ? 'Повторити' : 'Заповнити з запису'}
                  </button>
                  {completionDraftMessage && (
                    <p className="text-[11px] text-white/50">{completionDraftMessage}</p>
                  )}
                  {!canLoadCompletionDraft && (
                    <p className="text-[11px] text-white/50">Запис ще не готовий.</p>
                  )}
                </div>
                <label className="grid gap-1 text-[12px] text-white/60">
                  Фактично були присутні
                  <input
                    type="number"
                    min="0"
                    max={isGroupPractice ? maxSlots : undefined}
                    step={1}
                    value={attendeeCount}
                    onChange={(event) => setAttendeeCount(event.target.value)}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white outline-none"
                  />
                </label>
                <label className="grid gap-1 text-[12px] text-white/60">
                  Тема / що обговорювали
                  <input
                    value={outcomeTopic}
                    onChange={(event) => setOutcomeTopic(event.target.value)}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white outline-none"
                  />
                </label>
                <label className="grid gap-1 text-[12px] text-white/60">
                  Короткий підсумок
                  <textarea
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                    className="min-h-20 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white outline-none"
                  />
                </label>
                <label className="grid gap-1 text-[12px] text-white/60">
                  Посилання на запис
                  <input
                    value={recordingRef}
                    onChange={(event) => setRecordingRef(event.target.value)}
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white outline-none"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleComplete()}
                    disabled={completing}
                    className="rounded-lg border border-emerald-400/25 bg-emerald-500/14 px-3 py-2 text-[12px] font-semibold text-emerald-100 transition hover:bg-emerald-500/24 disabled:opacity-50"
                  >
                    {completing ? 'Збереження...' : 'Зберегти та завершити'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompletionOpen(false)}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white/60 transition hover:text-white"
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
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
