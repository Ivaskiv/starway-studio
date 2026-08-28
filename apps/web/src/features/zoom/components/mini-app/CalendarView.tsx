import {
  getSessionDateLabel,
  getSessionMeta,
} from '@/features/zoom/zoom.utils'
import {
  ZoomCalendarCard as Card,
  CalendarSkeleton,
} from '../calendar/CalendarSkeleton'
import { QuestionPanel } from '../booking/QuestionPanel'
import type { CleanMiniAppZoomCalendarController } from '../../hooks/useMiniAppCalendar'
import {
  formatWeekDate,
  pluralizeParticipants,
  resolveBookingPrimaryActionLabel,
  resolveBookingSessionDateLabel,
  resolveNextSessionQuestionSummary,
  resolvePreviousZoomRecapAttendanceLabel,
  resolvePreviousZoomRecapDateLabel,
  resolvePreviousZoomRecapNextStep,
  resolvePreviousZoomRecapPreview,
  resolvePreviousZoomRecapTitle,
  resolveZoomHubPrimaryActionClassName,
  resolveZoomSessionTitle,
  shouldRenderPaymentGate,
} from '../../utils/zoomCalendar.utils'
import {
  MINIAPP_ACCENT_BUTTON_CLASSNAME,
  resolveNearestSessionDateLabel,
} from '../../utils/zoomCalendarRoute.utils'

type Props = {
  controller: CleanMiniAppZoomCalendarController
}

export function CalendarView({ controller }: Props) {
  const {
    user,
    isBookingEntry,
    weekRange,
    sessionsCount,
    shouldShowCalendarSkeleton,
    shouldRenderBookingScreen,
    bookingPreviousSessionRecap,
    bookingNextSession,
    bookingSuccessSessionId,
    bookingQuestionSummary,
    activeSessionId,
    visiblePreviousSessionRecap,
    nextSession,
    primaryAction,
    directBookingState,
    isScheduleError,
    isAccessError,
    accessState,
    emptyState,
    hasZoomHubAccess,
    shouldShowDirectSessionOnly,
    visibleSessions,
    isDirectBooking,
    directSessionId,
    message,
    isOpeningPayment,
    isReportingPaymentIssue,
    register,
    handleBookingScreenPrimaryAction,
    handleNextZoomAction,
    handleRefreshAccess,
    openPayment,
    handleReportPaymentIssue,
  } = controller

  if (!user && !isBookingEntry) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-4 pb-24 text-white">
        <Card>
          <p className="font-semibold">Готуємо Zoom-календар.</p>
          <p className="mt-1 text-sm text-white/65">
            Відновлюємо доступ без повторного входу.
          </p>
        </Card>
      </main>
    )
  }

  const nextSessionQuestionSummary = nextSession
    ? resolveNextSessionQuestionSummary(nextSession)
    : null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-4 pb-24 text-white">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              Zoom Hub
            </p>
            <h1 className="mt-1 text-xl font-semibold">ФОКУС · Zoom</h1>

            {sessionsCount > 0 ? (
              <p className="mt-1 text-sm text-white/55">
                {formatWeekDate(weekRange.from)} —{' '}
                {formatWeekDate(weekRange.to)} · {weekRange.timezone}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {shouldShowCalendarSkeleton ? <CalendarSkeleton /> : null}

          {!shouldShowCalendarSkeleton &&
          shouldRenderBookingScreen &&
          bookingPreviousSessionRecap ? (
            <Card>
              <p className="text-sm text-white/65">
                {`Минула зустріч, ${formatWeekDate(
                  bookingPreviousSessionRecap.startsAt,
                )}`}
              </p>

              <p className="mt-3 text-2xl font-semibold">
                {resolvePreviousZoomRecapTitle(
                  bookingPreviousSessionRecap,
                )}
              </p>

              {resolvePreviousZoomRecapPreview(
                bookingPreviousSessionRecap,
              ) ? (
                <p className="mt-4 text-base leading-8 text-white/72">
                  {resolvePreviousZoomRecapPreview(
                    bookingPreviousSessionRecap,
                  )}
                </p>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {resolvePreviousZoomRecapAttendanceLabel(
                  bookingPreviousSessionRecap.attendanceCount ?? 0,
                ) ? (
                  <div className="rounded-2xl bg-white/[0.03] p-4">
                    <p className="text-sm text-white/55">
                      Було на сесії
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {bookingPreviousSessionRecap.attendanceCount ?? 0}
                    </p>
                  </div>
                ) : null}

                {resolvePreviousZoomRecapNextStep(
                  bookingPreviousSessionRecap,
                ) ? (
                  <div className="rounded-2xl bg-white/[0.03] p-4">
                    <p className="text-sm text-white/55">
                      Наступний крок
                    </p>
                    <p className="mt-2 text-xl font-semibold leading-8 text-white">
                      {resolvePreviousZoomRecapNextStep(
                        bookingPreviousSessionRecap,
                      )}
                    </p>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          {!shouldShowCalendarSkeleton &&
          shouldRenderBookingScreen &&
          bookingNextSession ? (
            bookingNextSession.isMyBooking ||
            bookingSuccessSessionId === bookingNextSession.id ? (
              <Card>
                <div className="space-y-5">
                  {user?.firstName ? (
                    <p className="text-xl font-semibold">
                      {user.firstName}
                    </p>
                  ) : null}

                  <div>
                    <p className="text-sm text-white/55">
                      Найближчий Zoom-розбір
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {resolveBookingSessionDateLabel(
                        bookingNextSession.scheduledAt,
                      )}
                    </p>
                  </div>

                  <div className="inline-flex rounded-2xl bg-emerald-400/15 px-4 py-2 text-base font-semibold text-emerald-200">
                    Ти вже записана
                  </div>

                  {bookingNextSession.myQuestion ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                        ТВОЄ ПИТАННЯ
                      </p>
                      <p className="mt-2 text-lg leading-7 text-white">
                        «{bookingNextSession.myQuestion.text}»
                      </p>

                      {bookingNextSession.myQuestion.position != null ? (
                        <p className="mt-2 text-xs text-white/45">
                          №{bookingNextSession.myQuestion.position} У ЧЕРЗІ
                        </p>
                      ) : null}

                      {bookingQuestionSummary?.questionsCount &&
                      bookingQuestionSummary.questionsCount > 0 ? (
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                          ПИТАНЬ ДО РОЗБОРУ:{' '}
                          {bookingQuestionSummary.questionsCount}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      {bookingQuestionSummary?.state === 'missing-own' ? (
                        <>
                          <p className="font-semibold">
                            ПИТАННЯ ДО РОЗБОРУ ВЖЕ Є:{' '}
                            {bookingQuestionSummary.questionsCount}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-white/65">
                            ТИ ЩЕ НЕ ДОДАЛА СВОЄ ПИТАННЯ.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold">
                            ПИТАНЬ ДО РОЗБОРУ ПОКИ НЕМАЄ.
                          </p>
                          <p className="mt-2 text-sm leading-6 text-white/65">
                            Сформулюй одну конкретну ситуацію або питання,
                            яке хочеш розібрати на Zoom.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                      Наступний крок
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-white">
                      {bookingNextSession.myQuestion
                        ? 'Підготуй одну конкретну ситуацію, яку хочеш розібрати на Zoom. Посилання на підключення з’явиться тут перед початком Zoom-розбору.'
                        : 'Сформулюй та запиши одну конкретну ситуацію для розбору.'}
                    </p>
                  </div>

                  <div className="text-sm text-white/55">
                    {`Записано учасників: ${bookingNextSession.attendeesCount}`}
                  </div>

                  <QuestionPanel
                    controller={controller}
                    session={bookingNextSession}
                    isDirectTargetSession={false}
                  />
                </div>
              </Card>
            ) : (
              <Card>
                <p className="text-2xl font-semibold">
                  {resolveBookingSessionDateLabel(
                    bookingNextSession.scheduledAt,
                  )}
                </p>

                <div className="mt-4 text-sm text-white/55">
                  {`Записано учасників: ${bookingNextSession.attendeesCount}`}
                </div>

                <button
                  data-testid="zoom-booking-primary"
                  type="button"
                  onClick={() => void handleBookingScreenPrimaryAction()}
                  disabled={activeSessionId === bookingNextSession.id}
                  className={`${resolveZoomHubPrimaryActionClassName(
                    'book',
                  )} mt-5 flex w-full items-center justify-center disabled:cursor-not-allowed`}
                >
                  {activeSessionId === bookingNextSession.id
                    ? 'Записуємо…'
                    : resolveBookingPrimaryActionLabel(
                        bookingNextSession,
                      )}
                </button>
              </Card>
            )
          ) : null}

          {!shouldShowCalendarSkeleton &&
          !isBookingEntry &&
          visiblePreviousSessionRecap ? (
            <Card>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                МИНУЛА ЗУСТРІЧ
              </p>
              <p className="mt-2 text-lg font-semibold">
                {resolvePreviousZoomRecapTitle(
                  visiblePreviousSessionRecap,
                )}
              </p>
              <p className="mt-1 text-sm text-white/65">
                {resolvePreviousZoomRecapDateLabel(
                  visiblePreviousSessionRecap.startsAt,
                )}
              </p>

              {resolvePreviousZoomRecapPreview(
                visiblePreviousSessionRecap,
              ) ? (
                <p className="mt-3 text-sm leading-6 text-white/70">
                  {resolvePreviousZoomRecapPreview(
                    visiblePreviousSessionRecap,
                  )}
                </p>
              ) : null}

              {resolvePreviousZoomRecapAttendanceLabel(
                visiblePreviousSessionRecap.attendanceCount ?? 0,
              ) ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/70">
                    {resolvePreviousZoomRecapAttendanceLabel(
                      visiblePreviousSessionRecap.attendanceCount ?? 0,
                    )}
                  </span>
                </div>
              ) : null}

              {resolvePreviousZoomRecapNextStep(
                visiblePreviousSessionRecap,
              ) ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                    Наступний крок
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white">
                    {resolvePreviousZoomRecapNextStep(
                      visiblePreviousSessionRecap,
                    )}
                  </p>
                </div>
              ) : null}
            </Card>
          ) : null}

          {!shouldShowCalendarSkeleton &&
          !isBookingEntry &&
          nextSession ? (
            <Card>
              <button
                type="button"
                onClick={() => void handleNextZoomAction()}
                disabled={primaryAction.action === 'none'}
                className={`${resolveZoomHubPrimaryActionClassName(
                  primaryAction.action,
                )} flex w-full items-center justify-center`}
              >
                {primaryAction.label}
              </button>
            </Card>
          ) : null}

          {!shouldShowCalendarSkeleton &&
          !isBookingEntry &&
          nextSession ? (
            <Card>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                Наступний Zoom-розбір
              </p>
              <p className="mt-2 text-lg font-semibold">
                {resolveZoomSessionTitle(nextSession.topic)}
              </p>
              <p className="mt-1 text-sm text-white/65">
                {resolveNearestSessionDateLabel(
                  nextSession.scheduledAt,
                )}{' '}
                · {getSessionMeta(nextSession)}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/70">
                  {nextSession.attendeesCount}{' '}
                  {pluralizeParticipants(nextSession.attendeesCount)}
                </span>

                {nextSession.isMyBooking ? (
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                    Записано
                  </span>
                ) : null}
              </div>

              {nextSessionQuestionSummary?.state === 'own' ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                    ТВОЄ ПИТАННЯ
                  </p>
                  <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm leading-6 text-white/78">
                    «{nextSession.myQuestion?.text}»
                  </p>

                  {nextSession.myQuestion?.position != null ? (
                    <p className="text-sm text-white/55">
                      №{nextSession.myQuestion.position} У ЧЕРЗІ
                    </p>
                  ) : null}

                  {nextSessionQuestionSummary.questionsCount > 0 ? (
                    <p className="text-sm text-white/55">
                      ПИТАНЬ ДО РОЗБОРУ:{' '}
                      {nextSessionQuestionSummary.questionsCount}
                    </p>
                  ) : null}
                </div>
              ) : nextSessionQuestionSummary?.state === 'missing-own' ? (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold text-white">
                    ПИТАННЯ ДО РОЗБОРУ ВЖЕ Є:{' '}
                    {nextSessionQuestionSummary.questionsCount}
                  </p>
                  <p className="text-sm text-white/55">
                    ТИ ЩЕ НЕ ДОДАЛА СВОЄ ПИТАННЯ.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/55">
                  ПИТАНЬ ДО РОЗБОРУ ПОКИ НЕМАЄ.
                </p>
              )}
            </Card>
          ) : null}

          {!shouldShowCalendarSkeleton &&
          directBookingState !== 'locked' &&
          (isBookingEntry
            ? isScheduleError
            : isAccessError || isScheduleError) ? (
            <Card>
              <p className="font-semibold">
                Не вдалося завантажити календар.
              </p>
              <button
                type="button"
                onClick={() => void handleRefreshAccess()}
                className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Спробувати ще раз
              </button>
            </Card>
          ) : null}

          {!isBookingEntry && shouldRenderPaymentGate(accessState) ? (
            <Card>
              <p className="font-semibold">
                Доступ до Zoom ще не підтверджено.
              </p>
              <p className="mt-1 text-sm text-white/65">
                Уже оплатила — спочатку онови статус. Не оплатила —
                відкрий оплату.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleRefreshAccess()}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold"
                >
                  ОНОВИТИ ДОСТУП
                </button>

                <button
                  type="button"
                  onClick={() => void openPayment()}
                  disabled={isOpeningPayment}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-300"
                >
                  {isOpeningPayment
                    ? 'ВІДКРИВАЄМО…'
                    : 'ОПЛАТИТИ ФОКУС'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handleReportPaymentIssue()}
                disabled={isReportingPaymentIssue}
                className="mt-2 w-full rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100"
              >
                {isReportingPaymentIssue
                  ? 'ФІКСУЄМО ПРОБЛЕМУ…'
                  : 'ПРОБЛЕМИ З ОПЛАТОЮ'}
              </button>
            </Card>
          ) : null}

          {!shouldShowCalendarSkeleton &&
          (!isBookingEntry || !shouldRenderBookingScreen) &&
          emptyState ? (
            <Card>
              <p className="font-semibold">{emptyState.title}</p>
              <p className="mt-1 text-sm text-white/65">
                {emptyState.description}
              </p>
              <p className="mt-3 text-sm text-emerald-100/90">
                {emptyState.accessNote}
              </p>
            </Card>
          ) : null}

          {!shouldShowCalendarSkeleton &&
          !isBookingEntry &&
          (hasZoomHubAccess || shouldShowDirectSessionOnly)
            ? visibleSessions.map((session) => {
                const isDirectTargetSession =
                  isDirectBooking && directSessionId === session.id

                return (
                  <Card key={session.id}>
                    <div
                      className="flex items-start justify-between gap-3"
                      data-session-card={session.id}
                    >
                      <div>
                        {isDirectTargetSession ? (
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                            Обрана Zoom-сесія
                          </p>
                        ) : null}

                        <p className="font-semibold">
                          {resolveZoomSessionTitle(session.topic)}
                        </p>

                        <p className="mt-1 text-xs text-white/55">
                          {getSessionDateLabel(session.scheduledAt)} ·{' '}
                          {getSessionMeta(session)}
                        </p>
                      </div>

                      {session.isMyBooking ? (
                        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                          Записано
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {!session.isMyBooking &&
                      !isDirectTargetSession ? (
                        <button
                          type="button"
                          onClick={() => void register(session.id)}
                          disabled={activeSessionId === session.id}
                          className={MINIAPP_ACCENT_BUTTON_CLASSNAME}
                        >
                          {activeSessionId === session.id
                            ? 'Відкриваємо…'
                            : 'Записатись'}
                        </button>
                      ) : null}

                      {session.zoomLink ? (
                        <a
                          href={session.zoomLink}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold"
                        >
                          Відкрити Zoom
                        </a>
                      ) : (
                        <span className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/50">
                          Посилання з’явиться перед Zoom-розбором
                        </span>
                      )}
                    </div>

                    <QuestionPanel
                      controller={controller}
                      session={session}
                      isDirectTargetSession={isDirectTargetSession}
                    />
                  </Card>
                )
              })
            : null}

          {message ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/80">
              {message}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
