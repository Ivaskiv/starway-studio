import type { ZoomWeekOverview } from '@/features/zoom/types/zoom.types'
import type { CleanMiniAppZoomCalendarController } from '../hooks/useMiniAppCalendar'

type Props = {
  controller: CleanMiniAppZoomCalendarController
  session: ZoomWeekOverview['sessions'][number]
  isDirectTargetSession: boolean
}

export function QuestionPanel({
  controller,
  session,
  isDirectTargetSession,
}: Props) {
  const {
    showQuestionInput,
    questionSessionId,
    questionSubmittedSessionId,
    questionSkippedSessionId,
    bookingQuestionText,
    bookingQuestionError,
    isSubmittingBookingQuestion,
    activeSessionId,
    setBookingQuestionText,
    setQuestionSessionId,
    setQuestionSkippedSessionId,
    setBookingQuestionError,
    setShowQuestionInput,
    handleSubmitBookingQuestion,
    handleSkipBookingQuestion,
  } = controller

  const isQuestionVisible =
    showQuestionInput && questionSessionId === session.id

  const shouldRender =
    isQuestionVisible ||
    (!showQuestionInput &&
      questionSubmittedSessionId === session.id) ||
    (!showQuestionInput &&
      questionSkippedSessionId === session.id)

  if (!shouldRender) {
    return null
  }

  return (
    <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-50">
      {isQuestionVisible ? (
        <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-black/10 p-3">
          <p className="font-semibold text-emerald-50">
            З яким питанням ти приходиш?
          </p>

          <textarea
            value={bookingQuestionText}
            onChange={(event) =>
              setBookingQuestionText(event.target.value)
            }
            placeholder="Напиши питання або ситуацію..."
            rows={3}
            className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
          />

          {bookingQuestionError ? (
            <p className="mt-2 text-xs text-amber-100">
              {bookingQuestionError}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void handleSubmitBookingQuestion()
              }
              disabled={
                isSubmittingBookingQuestion ||
                activeSessionId === session.id
              }
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50 disabled:opacity-60"
            >
              {isSubmittingBookingQuestion ||
              activeSessionId === session.id
                ? 'Надсилаємо…'
                : 'Надіслати'}
            </button>

            {!isDirectTargetSession ? (
              <button
                type="button"
                onClick={() =>
                  void handleSkipBookingQuestion()
                }
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Пропустити
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!showQuestionInput &&
      questionSubmittedSessionId === session.id ? (
        <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-black/10 p-3 text-emerald-100/90">
          Питання збережено. Повернемось до нього на Zoom.
        </div>
      ) : null}

      {!showQuestionInput &&
      questionSkippedSessionId === session.id ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/10 p-3">
          <p className="text-emerald-100/90">
            Можеш додати питання пізніше.
          </p>

          <button
            type="button"
            onClick={() => {
              setQuestionSessionId(session.id)
              setQuestionSkippedSessionId(null)
              setBookingQuestionError(null)
              setShowQuestionInput(true)
            }}
            className="mt-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Додати питання
          </button>
        </div>
      ) : null}
    </div>
  )
}
