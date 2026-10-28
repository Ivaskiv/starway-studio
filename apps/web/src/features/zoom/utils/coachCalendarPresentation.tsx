import { CalendarDays, User, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AvailabilityWeekDay, ZoomCalendarSession } from '../zoom.types'
import {
  getIndividualPresentation,
  getNormalizedSessionType,
  getSessionMeta,
  getUserZoomCommercePresentation,
  getZoomSessionPresentationState,
} from '../zoom.utils'
import {
  addKyivDays,
  getKyivDateKey,
  KYIV_TIMEZONE,
} from './zoomDateTime.utils'

export type CoachWeekDay = {
  key: string
  label: string
  dateLabel: string
  isToday: boolean
  date: Date
  sessions: ZoomCalendarSession[]
  availability: AvailabilityWeekDay | undefined
}

type CoachPrimaryStatus = {
  label: string
  badgeClass: string
}

const UK_DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

const SESSION_ICON: Record<string, ReactNode> = {
  group_practice: <Users className="h-3.5 w-3.5" />,
  group: <Users className="h-3.5 w-3.5" />,
  individual: <User className="h-3.5 w-3.5" />,
  private: <User className="h-3.5 w-3.5" />,
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
  if (session.challengerName && session.opponentName) return `${session.challengerName} vs ${session.opponentName}`
  if (session.participantNames && session.participantNames.length >= 2) return `${session.participantNames[0]} vs ${session.participantNames[1]}`
  return null
}

function getBattleGoal(session: ZoomCalendarSession): string | null {
  return session.goalA ?? session.goalB ?? session.goalText ?? session.questionPreviews?.[0] ?? null
}

export function getCoachSessionSecondaryLines(session: ZoomCalendarSession): string[] {
  const normalizedType = getNormalizedSessionType(session)
  if (normalizedType === 'battle_review') {
    return [getBattleParticipantLine(session), getBattleGoal(session)].filter((value): value is string => Boolean(value))
  }
  if (normalizedType === 'individual' || normalizedType === 'private') {
    const individualPresentation = getIndividualPresentation(session)
    const meta = getSessionMeta(session)
    if (individualPresentation?.kind === 'INDIVIDUAL_SLOT') {
      return session.topic && session.topic !== meta && session.topic !== 'Індивідуальна сесія' ? [session.topic] : []
    }
    return [session.topic && session.topic !== meta ? session.topic : null, session.participantNames?.[0] ?? session.attendees?.[0]?.name ?? null].filter((value): value is string => Boolean(value))
  }
  if (session.status === 'COMPLETED') return [session.topic].filter((value): value is string => Boolean(value))
  return [session.topic, getSessionCapacityLabel(session)].filter((value): value is string => Boolean(value))
}

export function getCoachPrimaryStatus(session: ZoomCalendarSession): CoachPrimaryStatus | null {
  const isGroupPractice = ['group_practice', 'group'].includes(getNormalizedSessionType(session))
  const lifecycle = getZoomSessionPresentationState(session)

  if (isGroupPractice && lifecycle === 'CANCELLED') return { label: 'СКАСОВАНО', badgeClass: 'border border-rose-300/30 bg-rose-500/15 text-rose-100' }
  if (isGroupPractice && lifecycle === 'COMPLETED') return { label: 'ЗАВЕРШЕНО', badgeClass: 'border border-emerald-300/30 bg-emerald-500/15 text-emerald-100' }
  if (isGroupPractice && lifecycle === 'PAST') return { label: 'МИНУЛА', badgeClass: 'border border-slate-300/20 bg-slate-500/15 text-slate-200' }
  if (isGroupPractice) return { label: 'ЗАПЛАНОВАНО', badgeClass: 'border border-sky-300/20 bg-sky-500/15 text-sky-100' }

  if (session.status === 'CANCELLED') return { label: 'СКАСОВАНО', badgeClass: 'border border-rose-300/30 bg-rose-500/15 text-rose-100' }
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
  const individualStatuses: Record<string, CoachPrimaryStatus> = {
    'ДОСТУПНИЙ': { label: 'ДОСТУПНИЙ', badgeClass: 'border border-emerald-300/30 bg-emerald-500/15 text-emerald-100' },
    'МИНУВ': { label: 'МИНУВ', badgeClass: 'border border-slate-300/20 bg-slate-500/15 text-slate-200' },
    'ПРОЙШЛА': { label: 'ПРОЙШЛА', badgeClass: 'border border-slate-300/20 bg-slate-500/15 text-slate-200' },
    'ПІДТВЕРДЖЕНО': { label: 'ПІДТВЕРДЖЕНО', badgeClass: 'border border-emerald-300/30 bg-emerald-500/15 text-emerald-100' },
  }
  if (individualPresentation?.statusLabel && individualStatuses[individualPresentation.statusLabel]) {
    return individualStatuses[individualPresentation.statusLabel]
  }
  return null
}

/**
 * The weekly diary uses the same domain facts as its status badge, but makes
 * the session category legible before the coach reads the card. Lifecycle
 * problems always win over a type colour.
 */
export function getCoachSessionCardTone(session: ZoomCalendarSession): string {
  if (
    session.status === 'CANCELLED'
    || ['REJECTED', 'EXPIRED', 'CANCELLED'].includes(session.commerceStatus ?? '')
  ) {
    return 'border-rose-400/35 bg-rose-500/[0.10]'
  }

  if (['REQUESTED', 'APPROVED_PENDING_PAYMENT'].includes(session.commerceStatus ?? '')) {
    return 'border-amber-400/40 bg-amber-500/[0.11]'
  }

  const type = getNormalizedSessionType(session)
  if (type === 'battle_review') return 'border-violet-400/40 bg-violet-500/[0.12]'
  if (session.status === 'COMPLETED') {
    return 'border-emerald-400/35 bg-emerald-500/[0.10]'
  }
  if (type === 'group_practice' || type === 'group') return 'border-emerald-400/35 bg-emerald-500/[0.10]'
  if (type === 'individual' || type === 'private') return 'border-sky-400/35 bg-sky-500/[0.11]'
  return 'border-white/[0.10] bg-white/[0.04]'
}

export function getCoachSessionIcon(session: ZoomCalendarSession): ReactNode {
  return SESSION_ICON[getNormalizedSessionType(session)] ?? <CalendarDays className="h-3.5 w-3.5" />
}

export function buildCoachWeekDays(
  sessions: ZoomCalendarSession[],
  weekFrom: string,
  effectiveAvailability: AvailabilityWeekDay[] = [],
  today = new Date(),
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
    return {
      key,
      label: UK_DAY_SHORT[index],
      dateLabel: `${day}.${String(month).padStart(2, '0')}`,
      isToday: key === todayKey,
      date,
      sessions: [...(sessionsByDay.get(key) ?? [])].sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime()),
      availability: effectiveAvailability.find((availability) => availability.date === key),
    }
  })
}
