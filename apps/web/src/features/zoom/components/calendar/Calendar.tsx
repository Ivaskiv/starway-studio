import type { CalendarView } from '../../zoom.types'
import {
  getSessionBadgeClass,
  getSlotDotClass,
  isPastDate,
  isToday,
  isZoomLinkActive,
} from '../../zoom.utils'
import {
  useCalendar,
  type CalendarProps,
} from '../../hooks/useCalendar'

import { PreparationModal } from './PreparationModal'
import { QuestionModal } from './QuestionModal'
import { DaySessionsSheet } from './DaySessionsSheet'
import { SessionCard } from './SessionCard'
import { SessionForm } from './SessionForm'

const UK_DAY_SHORT = [
  'Пн',
  'Вт',
  'Ср',
  'Чт',
  'Пт',
  'Сб',
  'Нд',
]

export default function Calendar(
  props: CalendarProps,
) {
  const {
    mode,
    userId,

    view,
    setView,

    monthGrid,
    weekDays,
    periodLabel,
    todaySession,

    selectedSession,
    setSelectedSession,

    selectedDate,
    setSelectedDate,

    selectedSessions,
    setSelectedSessions,

    isDaySheetOpen,
    setIsDaySheetOpen,

    bookingQuestionSession,
    bookingQuestionText,
    setBookingQuestionText,
    bookingQuestionError,
    bookingConfirmation,

    bookingPreparationSessionId,
    bookingPreparationAnswer,
    setBookingPreparationAnswer,
    bookingPreparationError,
    bookingPreparationSuccess,

    createDate,
    setCreateDate,

    editingSession,
    setEditingSession,

    creating,

    isSubmittingBookingQuestion,
    isSubmittingBookingPreparation,

    updateSession,

    prevPeriod,
    nextPeriod,
    sessionsOnDay,
    handleDayClick,

    handleCreate,
    handleCancel,
    handleAddToCalendar,

    openBookingQuestion,
    closeBookingQuestion,
    handleBookingConfirm,

    openBookingPreparation,
    closeBookingPreparation,
    handleBookingPreparationConfirm,
  } = useCalendar(props)

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
        <SessionCard
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
        <SessionForm
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
        <QuestionModal
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
        <PreparationModal
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
