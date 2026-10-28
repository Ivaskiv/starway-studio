import type { ReactNode } from 'react'
import { CalendarDays, Crosshair, Sparkles, User, Users } from 'lucide-react'
import type { AvailabilityWeekDay, ZoomCalendarSession } from '../../zoom.types'
import { getIndividualPresentation, getNormalizedSessionType, getSessionMeta, getUserZoomCommercePresentation } from '../../zoom.utils'
import { addKyivDays, getKyivDateKey, KYIV_TIMEZONE } from '../../utils/zoomDateTime.utils'

export type BattleOutcome = 'challenger' | 'opponent' | 'both' | 'none'

export interface BattleSession extends ZoomCalendarSession {
  challengerName?: string | null
  opponentName?: string | null
  progressA?: number
  progressB?: number
  explicitDay?: number
  goalA?: string | null
  goalB?: string | null
}

export type CoachWeekDay = {
  key: string
  label: string
  dateLabel: string
  isToday: boolean
  date: Date
  sessions: ZoomCalendarSession[]
  availability: AvailabilityWeekDay | undefined
}

const UK_DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
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

const SESSION_ICON: Record<string, ReactNode> = {
  group_practice: <Users className="h-3.5 w-3.5" />,
  group: <Users className="h-3.5 w-3.5" />,
  individual: <User className="h-3.5 w-3.5" />,
  private: <User className="h-3.5 w-3.5" />,
  intensive: <Sparkles className="h-3.5 w-3.5" />,
  battle_review: <Crosshair className="h-3.5 w-3.5" />,
}

// ── SectionLabel ──────────────────────────────────────────────────────────────

export function SectionLabel({
  label,
  count,
  collapsible = false,
  open = false,
  onToggle,
  action,
}: {
  label: string
  count?: number
  collapsible?: boolean
  open?: boolean
  onToggle?: () => void
  action?: ReactNode
}) {
  return (
    <div
      className={[
        'mb-3 flex items-center justify-between',
        collapsible ? 'cursor-pointer select-none' : '',
      ].join(' ')}
      onClick={collapsible ? onToggle : undefined}
    >
      <p className="flex items-center text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--accent-soft-rgb))]">
        {label}
        {count !== undefined ? ` · ${count}` : ''}
      </p>
      <div className="flex items-center gap-2">
        {action}
        {collapsible && (
          <svg
            viewBox="0 0 16 16"
            className={[
              'h-4 w-4 text-[rgb(var(--accent-soft-rgb))]/40 transition-transform duration-200',
              open ? 'rotate-180' : '',
            ].join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  )
}

function createDateFromKyivKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
}

function formatKyivTime(value: string): string {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: KYIV_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatCoachSessionRange(session: ZoomCalendarSession): string {
  const start = new Date(session.scheduledAt)
  return `${formatKyivTime(session.scheduledAt)}–${formatKyivTime(new Date(start.getTime() + (session.durationMinutes ?? 60) * 60_000).toISOString())}`
}

export function formatWeekRange(from: string): string {
  const fromKey = getKyivDateKey(new Date(from))
  const toKey = addKyivDays(fromKey, 6)
  const [, fromMonth, fromDay] = fromKey.split('-').map(Number)
  const [, toMonth, toDay] = toKey.split('-').map(Number)

  if (fromMonth === toMonth) {
    return `${fromDay} – ${toDay} ${UK_MONTH_GENITIVE[toMonth - 1]}`
  }

  return `${fromDay} ${UK_MONTH_GENITIVE[fromMonth - 1]} – ${toDay} ${UK_MONTH_GENITIVE[toMonth - 1]}`
}

function getSessionCapacityLabel(session: ZoomCalendarSession): string | null {
  if (session.attendeesCount === undefined) return null
  const capacity = session.remainingSlots !== undefined
    ? session.attendeesCount + session.remainingSlots
    : undefined
  return capacity !== undefined
    ? `${session.attendeesCount}/${capacity} учасників`
    : `${session.attendeesCount} учасників`
}

function getBattleParticipantLine(session: ZoomCalendarSession): string | null {
  if (session.challengerName && session.opponentName) {
    return `${session.challengerName} vs ${session.opponentName}`
  }
  if (session.participantNames && session.participantNames.length >= 2) {
    return `${session.participantNames[0]} vs ${session.participantNames[1]}`
  }
  return null
}

export function getBattleDayLabel(session: ZoomCalendarSession): string | null {
  if (typeof session.progressA === 'number') return `День ${Math.min(Math.max(session.progressA, 1), 7)}/7`
  if (session.battleProgress?.length) {
    const day = Math.max(...session.battleProgress.map((entry) => entry.day))
    return `День ${Math.min(Math.max(day, 1), 7)}/7`
  }
  return null
}

export function getBattleGoal(session: ZoomCalendarSession): string | null {
  return session.goalA ?? session.goalB ?? session.goalText ?? session.questionPreviews?.[0] ?? null
}

export function getSessionSecondaryLines(session: ZoomCalendarSession): string[] {
  const normalizedType = getNormalizedSessionType(session)
  if (normalizedType === 'battle_review') {
    return [
      getBattleParticipantLine(session),
      getBattleGoal(session),
    ].filter((value): value is string => Boolean(value))
  }

  if (normalizedType === 'individual' || normalizedType === 'private') {
    const individualPresentation = getIndividualPresentation(session)
    const meta = getSessionMeta(session)
    if (individualPresentation?.kind === 'INDIVIDUAL_SLOT') {
      return session.topic && session.topic !== meta && session.topic !== 'Індивідуальна сесія'
        ? [session.topic]
        : []
    }

    return [
      session.topic && session.topic !== meta ? session.topic : null,
      session.participantNames?.[0] ?? session.attendees?.[0]?.name ?? null,
    ].filter((value): value is string => Boolean(value))
  }

  if (session.status === 'COMPLETED') {
    return [session.topic].filter((value): value is string => Boolean(value))
  }

  return [
    session.topic,
    getSessionCapacityLabel(session),
  ].filter((value): value is string => Boolean(value))
}

type CoachPrimaryStatus = {
  label: string
  badgeClass: string
}

export function getCoachPrimaryStatus(
  session: ZoomCalendarSession,
): CoachPrimaryStatus | null {
  if (session.status === 'CANCELLED') {
    return {
      label: 'СКАСОВАНО',
      badgeClass: 'border border-rose-300/30 bg-rose-500/15 text-rose-100',
    }
  }

  if (session.status === 'COMPLETED') return null

  if (session.commerceStatus === 'REQUESTED') {
    return {
      label: 'ОЧІКУЄ КОУЧА',
      badgeClass: 'border border-sky-300/20 bg-sky-500/15 text-sky-100',
    }
  }

  if (session.commerceStatus) {
    const commerce = getUserZoomCommercePresentation(session)
    return { label: commerce.label, badgeClass: commerce.badgeClass }
  }

  const individualPresentation = getIndividualPresentation(session)
  if (individualPresentation?.statusLabel === 'ДОСТУПНИЙ') {
    return {
      label: 'ДОСТУПНИЙ',
      badgeClass: 'border border-emerald-300/30 bg-emerald-500/15 text-emerald-100',
    }
  }
  if (individualPresentation?.statusLabel === 'МИНУВ') {
    return {
      label: 'МИНУВ',
      badgeClass: 'border border-slate-300/20 bg-slate-500/15 text-slate-200',
    }
  }
  if (individualPresentation?.statusLabel === 'ПРОЙШЛА') {
    return {
      label: 'ПРОЙШЛА',
      badgeClass: 'border border-slate-300/20 bg-slate-500/15 text-slate-200',
    }
  }
  if (individualPresentation?.statusLabel === 'ПІДТВЕРДЖЕНО') {
    return {
      label: 'ПІДТВЕРДЖЕНО',
      badgeClass: 'border border-emerald-300/30 bg-emerald-500/15 text-emerald-100',
    }
  }

  return null
}

export function getSessionIcon(session: ZoomCalendarSession): ReactNode {
  return SESSION_ICON[getNormalizedSessionType(session)] ?? <CalendarDays className="h-3.5 w-3.5" />
}

export function buildCoachWeekDays(
  sessions: ZoomCalendarSession[],
  weekFrom: string,
  effectiveAvailability: AvailabilityWeekDay[] = [],
  today = new Date()
): CoachWeekDay[] {
  const todayKey = getKyivDateKey(today)
  const fromKey = getKyivDateKey(new Date(weekFrom))
  const sessionsByDay = new Map<string, ZoomCalendarSession[]>()

  for (const session of sessions) {
    const key = getKyivDateKey(new Date(session.scheduledAt))
    sessionsByDay.set(key, [...(sessionsByDay.get(key) ?? []), session])
  }

  return Array.from({ length: 7 }, (_, index) => {
    const key = addKyivDays(fromKey, index)
    const date = createDateFromKyivKey(key)
    const [, month, day] = key.split('-').map(Number)
    const daySessions = [...(sessionsByDay.get(key) ?? [])].sort(
      (left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime()
    )

    return {
      key,
      label: UK_DAY_SHORT[index],
      dateLabel: `${day}.${String(month).padStart(2, '0')}`,
      isToday: key === todayKey,
      date,
      sessions: daySessions,
      availability: effectiveAvailability.find((availability) => availability.date === key),
    }
  })
}

export function isDisposableIndividualInventory(session: ZoomCalendarSession) {
  return session.isDisposableIndividualSlot === true
    && getIndividualPresentation(session)?.kind === 'INDIVIDUAL_SLOT'
}
