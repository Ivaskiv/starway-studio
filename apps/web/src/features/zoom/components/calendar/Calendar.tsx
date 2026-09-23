import type { CalendarView, ZoomCalendarSession } from '../../zoom.types'
import { useEffect } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Swords,
  UserRound,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  getNormalizedSessionType,
  getSessionMeta,
  getSlotDotClass,
  isPastDate,
  isToday,
  isZoomLinkActive,
  sessionStatusVariant,
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

const UK_MONTH_GENITIVE = [
  'січня',
  'лютого',
  'березня',
  'квітня',
  'травня',
  'червня',
  'липня',
  'серпня',
  'вересня',
  'жовтня',
  'листопада',
  'грудня',
]

function getSessionCapacityLabel(session: ZoomCalendarSession): string | null {
  if (session.attendeesCount === undefined) return null
  const capacity = session.remainingSlots !== undefined
    ? session.attendeesCount + session.remainingSlots
    : undefined
  return capacity !== undefined
    ? `${session.attendeesCount}/${capacity} учасників`
    : `${session.attendeesCount} учасників`
}

function getBattleResultLabel(session: ZoomCalendarSession): string | null {
  if (session.battleStatus !== 'completed') return null
  if (!session.winnerId) return 'Результат: без переможця'
  if (session.winnerId === session.challengerId) {
    return `Результат: ${session.challengerName ?? 'Учасник 1'}`
  }
  if (session.winnerId === session.opponentId) {
    return `Результат: ${session.opponentName ?? 'Учасник 2'}`
  }
  if (session.winnerId === 'both') return 'Результат: обидва учасники'
  return null
}

function getWeekSessionDetails(session: ZoomCalendarSession): string[] {
  const normalizedType = getNormalizedSessionType(session)

  if (normalizedType === 'group_practice' || normalizedType === 'group') {
    return [getSessionCapacityLabel(session)].filter(Boolean) as string[]
  }

  if (normalizedType === 'individual' || normalizedType === 'private') {
    const sessionMeta = getSessionMeta(session)
    return [
      session.topic && session.topic !== sessionMeta ? session.topic : null,
      session.participantNames?.[0] ?? null,
      session.questionPreviews?.[0] ?? session.goalText ?? null,
    ].filter(Boolean) as string[]
  }

  if (normalizedType === 'battle_review') {
    const participantLine = session.challengerName && session.opponentName
      ? `${session.challengerName} vs ${session.opponentName}`
      : session.participantNames && session.participantNames.length >= 2
        ? `${session.participantNames[0]} vs ${session.participantNames[1]}`
        : null
    const goals = [
      session.goalA ? `Ціль 1: ${session.goalA}` : null,
      session.goalB ? `Ціль 2: ${session.goalB}` : null,
    ].filter(Boolean) as string[]
    return [
      participantLine,
      ...goals,
      getBattleResultLabel(session),
    ].filter(Boolean) as string[]
  }

  return [getSessionCapacityLabel(session)].filter(Boolean) as string[]
}

function getUserWeekSessionTitle(session: ZoomCalendarSession): string {
  const normalizedType = getNormalizedSessionType(session)
  if (normalizedType === 'individual' || normalizedType === 'private') {
    return 'Індивідуальна сесія'
  }
  if (normalizedType === 'battle_review') return 'Zoom Battle'
  return session.topic || getSessionMeta(session)
}

function getUserWeekSessionIcon(session: ZoomCalendarSession): LucideIcon {
  const normalizedType = getNormalizedSessionType(session)
  if (normalizedType === 'group_practice' || normalizedType === 'group') return UsersRound
  if (normalizedType === 'battle_review') return Swords
  return UserRound
}

function getUserWeekSessionTime(session: ZoomCalendarSession): string {
  const startsAt = new Date(session.scheduledAt)
  const start = startsAt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
  if (!session.durationMinutes) return start
  const endsAt = new Date(startsAt.getTime() + session.durationMinutes * 60 * 1000)
  const end = endsAt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
  return `${start} – ${end}`
}

function getUserWeekStatusClass(session: ZoomCalendarSession, fallback: string): string {
  if (session.commerceStatus === 'REQUESTED') {
    return 'border border-sky-300/25 bg-sky-500/15 text-sky-100'
  }
  if (session.commerceStatus === 'APPROVED_PENDING_PAYMENT') {
    return 'border border-amber-300/30 bg-amber-400/15 text-amber-100'
  }
  if (session.commerceStatus === 'PAID') {
    return 'border border-emerald-300/25 bg-emerald-500/15 text-emerald-100'
  }
  if (session.commerceStatus === 'EXPIRED') {
    return 'border border-white/10 bg-white/[0.05] text-white/55'
  }
  return fallback
}

function isExpiredIndividualReservation(session: ZoomCalendarSession): boolean {
  const normalizedType = getNormalizedSessionType(session)
  return (normalizedType === 'individual' || normalizedType === 'private')
    && session.commerceStatus === 'EXPIRED'
}

function getUserWeekSessionSurface(session: ZoomCalendarSession): string {
  if (isExpiredIndividualReservation(session)) {
    return 'border-white/10 bg-white/[0.025] opacity-55'
  }

  const normalizedType = getNormalizedSessionType(session)
  if (normalizedType === 'group_practice' || normalizedType === 'group') {
    return 'border-emerald-400/35 bg-emerald-500/[0.11]'
  }
  if (normalizedType === 'individual' || normalizedType === 'private') {
    return 'border-sky-400/35 bg-sky-500/[0.11]'
  }
  if (normalizedType === 'battle_review') {
    return 'border-violet-400/40 bg-violet-500/[0.12]'
  }
  return 'border-white/10 bg-white/[0.04]'
}

export default function Calendar(
  props: CalendarProps & {
    requestedUserSession?: ZoomCalendarSession | null
    onRequestedUserSessionHandled?: () => void
  },
) {
  const {
    mode,
    userId,

    view,
    setView,
    sessions,

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
    editingParticipantUserId,

    creating,
    coachUsers,

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
  const editingSessionData = editingSession
    ? sessions.find((session) => session.id === editingSession) ?? null
    : null
  const firstWeekDay = weekDays[0]
  const lastWeekDay = weekDays[6]
  const userWeekLabel = firstWeekDay && lastWeekDay
    ? firstWeekDay.getMonth() === lastWeekDay.getMonth()
      ? `${firstWeekDay.getDate()}–${lastWeekDay.getDate()} ${UK_MONTH_GENITIVE[lastWeekDay.getMonth()]} ${lastWeekDay.getFullYear()}`
      : `${firstWeekDay.getDate()} ${UK_MONTH_GENITIVE[firstWeekDay.getMonth()]} – ${lastWeekDay.getDate()} ${UK_MONTH_GENITIVE[lastWeekDay.getMonth()]} ${lastWeekDay.getFullYear()}`
    : periodLabel

  const closeDaySheet = () => {
    setIsDaySheetOpen(false)
    setSelectedDate(null)
    setSelectedSessions([])
  }

  const openUserBooking = (session: ZoomCalendarSession) => {
    closeDaySheet()
    setSelectedSession(null)
    setCreateDate(null)
    openBookingQuestion(session)
  }

  const openUserSession = (session: ZoomCalendarSession) => {
    if (isExpiredIndividualReservation(session)) return

    const normalizedType = getNormalizedSessionType(session)
    const isIndividual = normalizedType === 'individual' || normalizedType === 'private'
    const isConnectedToUser = Boolean(
      session.isMyBooking || session.isMyPendingPayment || session.commerceLabel,
    )
    const isOccupied = session.slotStatus === 'booked' || (session.remainingSlots ?? 1) <= 0

    if (
      isIndividual &&
      !isConnectedToUser &&
      !isOccupied &&
      !isPastDate(session.scheduledAt) &&
      session.status !== 'CANCELLED' &&
      session.status !== 'COMPLETED'
    ) {
      openUserBooking(session)
      return
    }

    closeDaySheet()
    setCreateDate(null)
    setSelectedSession(session)
  }

  useEffect(() => {
    if (mode !== 'user' || !props.requestedUserSession) return

    openUserSession(props.requestedUserSession)
    props.onRequestedUserSessionHandled?.()
  }, [mode, props.requestedUserSession, props.onRequestedUserSessionHandled])

  return (
    <div className={mode === 'user' ? 'flex flex-col gap-2.5' : 'flex flex-col gap-4'}>

      {/* Today banner */}
      {mode === 'coach' && todaySession && (
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
      {mode === 'coach' ? (
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
      ) : (
        <div className="flex items-center gap-1.5 border-b border-white/[0.07] pb-2">
          <button
            type="button"
            onClick={prevPeriod}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white"
            aria-label="Попередній тиждень"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-0 flex-1 truncate text-center text-[12px] font-semibold text-white/85">
            {userWeekLabel}
          </span>
          <button
            type="button"
            onClick={nextPeriod}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white"
            aria-label="Наступний тиждень"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDayClick(new Date())}
            className="flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg border border-sky-300/25 bg-sky-500/12 px-2.5 text-[11px] font-semibold text-sky-100 transition-colors hover:bg-sky-500/18"
          >
            Сьогодні
            <CalendarDays className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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

      {/* Coach week list */}
      {view === 'week' && mode === 'coach' && (
        <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.07]" data-zoom-week-view="coach-vertical">
          {weekDays.map((d, i) => {
            const today = isToday(d);
            const daySessions = sessionsOnDay(d);
            return (
              <div
                key={i}
                data-zoom-week-day={UK_DAY_SHORT[i]}
                onClick={() => handleDayClick(d)}
                className={[
                  'min-h-[64px] cursor-pointer border-b border-white/[0.05] bg-[#0d1117] px-3 py-2 transition-colors last:border-b-0 hover:bg-white/[0.03]',
                  today ? 'bg-purple-500/[0.05]' : '',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-white/35">{UK_DAY_SHORT[i]}</span>
                  <span className={['text-[15px] font-semibold', today ? 'text-purple-400' : 'text-white/70'].join(' ')}>
                    {d.getDate()}
                  </span>
                </div>
                {daySessions.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {daySessions.map(s => {
                      const statusVariant = sessionStatusVariant(s.battleStatus ?? s.status)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={e => { e.stopPropagation(); setSelectedSession(s); setCreateDate(null); }}
                          className={[
                            'w-full rounded border px-2 py-1.5 text-left text-[12px] transition-colors',
                            statusVariant.surfaceClass,
                          ].join(' ')}
                        >
                          <span className={['block font-semibold', statusVariant.textClass].join(' ')}>
                            {new Date(s.scheduledAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                            {' '}
                            {s.topic}
                          </span>
                          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusVariant.badgeClass}`}>
                            {statusVariant.label}
                          </span>
                          {getWeekSessionDetails(s).map((detail) => (
                            <span key={detail} className="block text-[11px] font-normal text-[var(--text-muted)]">
                              {detail}
                            </span>
                          ))}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* User week list */}
      {view === 'week' && mode !== 'coach' && (
        <div className="flex flex-col" data-zoom-week-view="user-vertical">
          {weekDays.map((d, i) => {
            const today = isToday(d)
            const daySessions = sessionsOnDay(d)
            return (
              <section
                key={i}
                className="border-b border-white/[0.07] px-0.5 py-2 last:border-b-0"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className={['text-[12px] font-semibold', today ? 'text-sky-200' : 'text-white/80'].join(' ')}>
                      {UK_DAY_SHORT[i]}
                    </span>
                    <span className={['text-[12px] font-semibold', today ? 'text-sky-200' : 'text-white/50'].join(' ')}>
                      {d.getDate()}.{String(d.getMonth() + 1).padStart(2, '0')}
                    </span>
                    {today && <span className="text-[10px] text-sky-200/70">· Сьогодні</span>}
                  </div>
                  {daySessions.length > 0 && (
                    <span className="text-[10px] text-white/35">{daySessions.length} сес.</span>
                  )}
                </div>

                {daySessions.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {daySessions.map(s => {
                      const statusVariant = sessionStatusVariant(s.battleStatus ?? s.status)
                      const details = getWeekSessionDetails(s)
                      const SessionIcon = getUserWeekSessionIcon(s)
                      const isDisabledReservation = isExpiredIndividualReservation(s)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={isDisabledReservation}
                          onClick={isDisabledReservation ? undefined : () => openUserSession(s)}
                          className={[
                            'w-full rounded-xl border px-2.5 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors',
                            isDisabledReservation
                              ? 'cursor-not-allowed'
                              : 'group hover:brightness-110',
                            getUserWeekSessionSurface(s),
                          ].join(' ')}
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/15 text-white/80">
                              <SessionIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[10px] font-medium leading-none text-white/55">
                                {getUserWeekSessionTime(s)}
                              </span>
                              <span className="mt-1 block truncate text-[12px] font-semibold leading-tight text-white">
                                {getUserWeekSessionTitle(s)}
                              </span>
                              {details.length > 0 && (
                                <span className="mt-0.5 block truncate text-[10px] leading-snug text-white/55">
                                  {details.join(' · ')}
                                </span>
                              )}
                            </span>
                            <span className={`max-w-[38%] flex-shrink-0 rounded-full px-2 py-1 text-center text-[9px] font-semibold leading-tight ${getUserWeekStatusClass(s, statusVariant.badgeClass)}`}>
                              {s.commerceLabel ?? statusVariant.label}
                            </span>
                            {!isDisabledReservation && (
                              <span className="flex-shrink-0 text-sm leading-none text-white/35 transition-colors group-hover:text-white/70" aria-hidden="true">›</span>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-white/10 bg-black/10 px-2.5 py-1.5 text-[11px] text-white/35">
                    Немає запланованих сесій
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {mode === 'user' && isDaySheetOpen && selectedDate && (
        <DaySessionsSheet
          selectedDate={selectedDate}
          selectedSessions={selectedSessions}
          onRequestBooking={openUserSession}
          onAddToCalendar={handleAddToCalendar}
          onClose={closeDaySheet}
        />
      )}

      {/* Session detail */}
      {selectedSession && mode === 'user' && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] sm:p-4">
          <button
            type="button"
            aria-label="Закрити деталі сесії"
            onClick={() => setSelectedSession(null)}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />
          <div className="relative z-10 max-h-[calc(100dvh-9rem-env(safe-area-inset-bottom))] w-full max-w-lg overflow-y-auto overscroll-contain rounded-[24px] border border-white/10 bg-[#0d1117] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.48)] sm:max-h-[calc(100vh-2rem)]">
            <SessionCard
              session={selectedSession}
              mode={mode}
              userId={userId}
              onClose={() => setSelectedSession(null)}
              onRequestBooking={openUserBooking}
              onAddToCalendar={handleAddToCalendar}
              onEdit={id => { setEditingSession(id); setSelectedSession(null); }}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}

      {selectedSession && mode !== 'user' && (
        <SessionCard
          session={selectedSession}
          mode={mode}
          userId={userId}
          onClose={() => setSelectedSession(null)}
          onRequestBooking={openUserBooking}
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
          participants={coachUsers}
          onSubmit={handleCreate}
          onClose={() => setCreateDate(null)}
          isLoading={creating}
        />
      )}

      {/* Edit form */}
      {mode === 'coach' && editingSessionData && (
        <SessionForm
          defaultDate={new Date(editingSessionData.scheduledAt)}
          sessionId={editingSessionData.id}
          participants={coachUsers}
          initialValues={{
            scheduledAt: editingSessionData.scheduledAt,
            topic: editingSessionData.topic,
            type: editingSessionData.type,
            zoomLink: editingSessionData.zoomLink,
            maxAttendees:
              editingSessionData.type === 'individual'
                ? 1
                : (editingSessionData.attendeesCount !== undefined && editingSessionData.remainingSlots !== undefined
                    ? editingSessionData.attendeesCount + editingSessionData.remainingSlots
                    : undefined),
            participantUserId: editingParticipantUserId ?? undefined,
          }}
          onSubmit={async (payload) => {
            await updateSession({ id: editingSessionData.id, patch: payload });
            setEditingSession(null);
          }}
          onClose={() => setEditingSession(null)}
          isLoading={creating}
          title="Редагування сесії"
          submitLabel="Зберегти"
          loadingLabel="Збереження..."
        />
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
