import { CalendarDays, ChevronRight, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { useState, type DragEvent, type TouchEvent } from 'react'
import type { ZoomCalendarSession } from '../../zoom.types'
import {
  getCoachPrimaryStatus,
  getCoachSessionCardTone,
  getCoachSessionIcon,
  getCoachSessionSecondaryLines,
  formatCoachSessionRange,
  type CoachWeekDay,
} from '../../utils/coachCalendarPresentation'
import { getIndividualPresentation, getSessionMeta } from '../../zoom.utils'
import {
  createUtcDateForTimeZone,
  getTimeZoneDateParts,
  KYIV_TIME_LABEL,
  KYIV_TIMEZONE,
} from '../../utils/zoomDateTime.utils'

function canProposeReschedule(session: ZoomCalendarSession): boolean {
  return session.isDisposableIndividualSlot === true
    && session.status === 'SCHEDULED'
    && !session.commerceRequestId
    && !session.commerceStatus
    && new Date(session.scheduledAt).getTime() > Date.now()
}

function rescheduleAtKyivDate(session: ZoomCalendarSession, date: Date): string {
  const source = getTimeZoneDateParts(new Date(session.scheduledAt), KYIV_TIMEZONE)
  const target = getTimeZoneDateParts(date, KYIV_TIMEZONE)
  return createUtcDateForTimeZone({
    year: target.year,
    month: target.month,
    day: target.day,
    hour: source.hour,
    minute: source.minute,
    timeZone: KYIV_TIMEZONE,
  }).toISOString()
}

function canDropOnDay(session: ZoomCalendarSession, day: CoachWeekDay): boolean {
  const scheduledAt = rescheduleAtKyivDate(session, day.date)
  if (scheduledAt === session.scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) return false

  const source = getTimeZoneDateParts(new Date(session.scheduledAt), KYIV_TIMEZONE)
  const startMinutes = source.hour * 60 + source.minute
  const durationMinutes = session.durationMinutes ?? 60
  return Boolean(day.availability?.windows.some((slot) => {
    const isIndividual = slot.sessionType === 'individual' || slot.sessionType === 'PRIVATE'
    const windowStart = slot.hour * 60 + slot.minute
    const windowEnd = (slot.endHour ?? slot.hour + 1) * 60 + (slot.endMinute ?? slot.minute)
    return slot.active && isIndividual && startMinutes >= windowStart && startMinutes + durationMinutes <= windowEnd
  }))
}

function CoachWeekSessionCard({ session, onSelect, onDeleteSlot, onDragStart, onTouchDrop, isDragging, canManage }: {
  session: ZoomCalendarSession
  onSelect: (session: ZoomCalendarSession) => void
  onDeleteSlot: (session: ZoomCalendarSession) => void
  onDragStart: (session: ZoomCalendarSession) => void
  onTouchDrop: (session: ZoomCalendarSession, point: { x: number; y: number }) => void
  isDragging: boolean
  canManage: boolean
}) {
  const secondaryLines = getCoachSessionSecondaryLines(session)
  const compactStatus = getCoachPrimaryStatus(session)
  const showCompactStatus = compactStatus
    && !(['group_practice', 'group'].includes(session.type) && session.status === 'SCHEDULED')
  const compactSecondary = secondaryLines.slice(0, 2).join(' · ') || session.topic
  const previousScheduledAt = session.type === 'group_practice' ? session.previousScheduledAt : undefined
  const individualPresentation = getIndividualPresentation(session)
  const cardTone = getCoachSessionCardTone(session)
  const canDeleteSlot = individualPresentation?.kind === 'INDIVIDUAL_SLOT'
    && session.isDisposableIndividualSlot === true
    && (session.status === 'SCHEDULED' || session.status === 'CANCELLED')
    && !session.commerceRequestId
  const canReschedule = canManage && canProposeReschedule(session)

  const handleDragStart = (event: DragEvent<HTMLElement>) => {
    if (!canReschedule) return
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', session.id)
    onDragStart(session)
  }

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (!canReschedule) return
    const touch = event.changedTouches[0]
    if (touch) onTouchDrop(session, { x: touch.clientX, y: touch.clientY })
  }

  return (
    <article
      draggable={canReschedule}
      onDragStart={handleDragStart}
      onTouchStart={() => canReschedule && onDragStart(session)}
      onTouchEnd={handleTouchEnd}
      className={`rounded-xl border px-2 py-2 ${cardTone} ${canReschedule ? 'touch-pan-y cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-55 ring-1 ring-sky-300/70' : ''}`}
      data-coach-session-id={session.id}
      data-reschedule-draggable={canReschedule || undefined}
    >
      <div className="flex min-h-12 items-center gap-2.5">
      <button type="button" onClick={() => onSelect(session)} aria-label={`Дії з сесією: ${session.topic}`} className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-700/40 text-slate-100">{getCoachSessionIcon(session)}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] leading-4">
            <span className="shrink-0 text-sky-100/85">{formatCoachSessionRange(session)}</span>
            <span className="font-semibold text-white">{individualPresentation?.title ?? getSessionMeta({ type: session.type })}</span>
          </span>
          <span className="mt-0.5 block text-xs leading-4 text-sky-100/70">{compactSecondary}</span>
          {previousScheduledAt && <span className="mt-1 block text-[10px] font-semibold text-sky-200">ПЕРЕНЕСЕНО · Було: {new Intl.DateTimeFormat('uk-UA', { timeZone: KYIV_TIMEZONE, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(previousScheduledAt))} ({KYIV_TIME_LABEL})</span>}
          {showCompactStatus && <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${compactStatus.badgeClass}`}>{compactStatus.label}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-center gap-1 text-sky-100/70"><MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" /><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
      </button>
      {canDeleteSlot && <button type="button" onClick={() => onDeleteSlot(session)} aria-label={`Видалити слот: ${session.topic}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-400/45 bg-rose-500/10 text-rose-200 transition hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
      </div>
    </article>
  )
}

export function CoachWeeklyDiary({ days, onSelectSession, onCreateSession, onDeleteSlot, onProposeReschedule, canManageZoom }: {
  days: CoachWeekDay[]
  onSelectSession: (session: ZoomCalendarSession) => void
  onCreateSession: (date: Date) => void
  onDeleteSlot: (session: ZoomCalendarSession) => void
  onProposeReschedule: (session: ZoomCalendarSession, scheduledAt: string) => void
  canManageZoom: boolean
}) {
  const [expandedEmptyDay, setExpandedEmptyDay] = useState<string | null>(null)
  const [draggingSession, setDraggingSession] = useState<ZoomCalendarSession | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const proposeReschedule = (session: ZoomCalendarSession, date: Date) => {
    const scheduledAt = rescheduleAtKyivDate(session, date)
    if (scheduledAt === session.scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) return
    onProposeReschedule(session, scheduledAt)
  }
  const handleTouchDrop = (session: ZoomCalendarSession, point: { x: number; y: number }) => {
    const target = document.elementFromPoint(point.x, point.y)?.closest<HTMLElement>('[data-coach-week-date]')
    const day = days.find((item) => item.key === target?.dataset.coachWeekDate)
    setDraggingSession(null)
    setDragOverDate(null)
    if (day && canDropOnDay(session, day)) proposeReschedule(session, day.date)
  }
  return (
    <div className="space-y-2.5" data-coach-weekly-diary="true">
      <p className="text-right text-[10px] font-medium text-white/40">{KYIV_TIME_LABEL}</p>
      {days.map((day) => {
        const canReceiveDrop = Boolean(draggingSession && canDropOnDay(draggingSession, day))
        return (
        <section
          key={day.key}
          onDragOver={(event) => {
            if (!draggingSession || !canReceiveDrop) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            setDragOverDate(day.key)
          }}
          onDragLeave={() => dragOverDate === day.key && setDragOverDate(null)}
          onDrop={(event) => {
            event.preventDefault()
            if (draggingSession && canReceiveDrop) proposeReschedule(draggingSession, day.date)
            setDraggingSession(null)
            setDragOverDate(null)
          }}
          className={['rounded-xl border px-2.5 py-2', dragOverDate === day.key ? 'border-sky-300 bg-sky-500/10 ring-1 ring-sky-300/70' : draggingSession && !canReceiveDrop ? 'border-rose-400/35 bg-rose-500/[0.05]' : day.sessions.length || day.availability?.windows.length ? 'border-sky-500/30 bg-gradient-to-br from-slate-950 to-sky-950/40' : 'border-slate-700/60 bg-slate-900/35'].join(' ')}
          data-coach-week-day={day.label}
          data-coach-week-date={day.key}
        >
          <div className="flex min-h-10 items-center gap-2.5">
            <div className="w-10 shrink-0 text-left"><p className="text-xs font-semibold text-white">{day.label}</p><p className="text-xs font-semibold text-white">{day.dateLabel.padStart(5, '0')}</p></div>
            <span className={`rounded-xl px-2.5 py-1.5 text-[11px] font-semibold ${day.availability?.windows.length ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white' : 'bg-gradient-to-b from-slate-600 to-slate-800 text-slate-100'}`}>{day.availability?.windows.length ? 'ON' : 'OFF'}</span>
            <p className={`min-w-0 flex-1 text-[11px] leading-4 ${day.availability?.windows.length ? 'text-sky-100/85' : 'text-slate-400'}`}>{day.availability?.windows.length ? day.availability.windows.map((slot) => `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}–${String(slot.endHour ?? slot.hour + 1).padStart(2, '0')}:${String(slot.endMinute ?? slot.minute).padStart(2, '0')}`).join(', ') : 'ВИХІДНИЙ'}</p>
            {canManageZoom && (day.sessions.length > 0 || Boolean(day.availability?.windows.length)) ? <button type="button" onClick={() => onCreateSession(day.date)} aria-label={`Додати сесію ${day.key}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-400 bg-gradient-to-b from-sky-400 to-sky-700 text-white shadow-[inset_0_1px_5px_rgba(255,255,255,0.35)]"><Plus className="h-5 w-5" /></button> : <button type="button" aria-label={`Переглянути день ${day.key}`} aria-expanded={expandedEmptyDay === day.key} onClick={() => setExpandedEmptyDay(expandedEmptyDay === day.key ? null : day.key)} className="flex h-8 w-8 shrink-0 items-center justify-center text-sky-100/70"><ChevronRight className="h-4 w-4" /></button>}
          </div>
          {day.sessions.length > 0 ? <div className="ml-[50px] mt-1 border-t border-white/[0.08]">{day.sessions.map((session) => <CoachWeekSessionCard key={session.id} session={session} onSelect={onSelectSession} onDeleteSlot={onDeleteSlot} onDragStart={setDraggingSession} onTouchDrop={handleTouchDrop} isDragging={draggingSession?.id === session.id} canManage={canManageZoom} />)}</div> : expandedEmptyDay === day.key && <div className="mt-2 flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-700/70 bg-slate-950/30 px-4 py-4 text-center text-xs leading-5 text-white/85"><CalendarDays className="h-5 w-5 text-slate-200" /><span className="max-w-44">На цей день немає запланованих зустрічей</span>{canManageZoom && <button type="button" onClick={() => onCreateSession(day.date)} className="rounded-lg border border-sky-400 bg-gradient-to-b from-sky-600 to-sky-800 px-3 py-2 text-[11px] font-semibold text-white transition hover:brightness-110">+ НОВА СЕСІЯ</button>}</div>}
        </section>
        )
      })}
    </div>
  )
}
