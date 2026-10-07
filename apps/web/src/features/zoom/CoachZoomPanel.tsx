// apps/web/src/features/zoom/CoachZoomPanel.tsx

import { useAppSelector } from '@/app/hooks'
import { useGetUsersQuery } from '@/features/admin/services/ownership.api'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Info,
  MoreHorizontal,
  PencilLine,
  Plus,
  CalendarClock,
  Ban,
  CheckCircle2,
  Sparkles,
  User,
  Users,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BaseModal } from '@/features/modals/BaseModal'
import { BattleInstruction } from './components/BattleInstruction'
import { ZoomAvailabilityEditor } from './ZoomAvailabilityEditor'
import { SessionCard } from './components/calendar/SessionCard'
import { SessionForm } from './components/calendar/SessionForm'
import {
  useCreateZoomSessionMutation,
  useApproveZoomCommerceRequestMutation,
  useCancelZoomSessionMutation,
  useFinalizeBattleMutation,
  useGetCalendarSessionsQuery,
  useGetCoachParticipantsQuery,
  useGetAvailabilityWeekQuery,
  useRejectZoomCommerceRequestMutation,
  useUpdateZoomSessionMutation,
} from './zoom.api'
import type {
  AvailabilityWeekDay,
  CreateSessionPayload,
  ZoomCalendarSession,
} from './zoom.types'
import {
  getNormalizedSessionType,
  getSessionMeta,
} from './zoom.utils'
import { buildCalendarEvent } from './utils/calendar-event'
import {
  addKyivDays,
  getKyivDateKey,
  getKyivWeekRange,
  KYIV_TIMEZONE,
} from './utils/zoomDateTime.utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type BattleOutcome = 'challenger' | 'opponent' | 'both' | 'none'

interface BattleSession extends ZoomCalendarSession {
  challengerName?: string | null
  opponentName?: string | null
  progressA?: number
  progressB?: number
  explicitDay?: number
  goalA?: string | null
  goalB?: string | null
}

type CoachWeekDay = {
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

const BATTLE_STATUS_LABELS: Record<string, string> = {
  pending: 'Очікує підтвердження',
  active: 'Активний',
  completed: 'Завершено',
  cancelled: 'Скасовано',
}

const SESSION_ICON: Record<string, ReactNode> = {
  group_practice: <Users className="h-3.5 w-3.5" />,
  group: <Users className="h-3.5 w-3.5" />,
  individual: <User className="h-3.5 w-3.5" />,
  private: <User className="h-3.5 w-3.5" />,
  intensive: <Sparkles className="h-3.5 w-3.5" />,
  battle_review: <Crosshair className="h-3.5 w-3.5" />,
}

// ── SectionLabel ──────────────────────────────────────────────────────────────

function SectionLabel({
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

function formatCoachSessionRange(session: ZoomCalendarSession): string {
  const start = new Date(session.scheduledAt)
  return `${formatKyivTime(session.scheduledAt)}–${formatKyivTime(new Date(start.getTime() + (session.durationMinutes ?? 60) * 60_000).toISOString())}`
}

function formatWeekRange(from: string): string {
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

function getBattleDayLabel(session: ZoomCalendarSession): string | null {
  if (typeof session.progressA === 'number') return `День ${Math.min(Math.max(session.progressA, 1), 7)}/7`
  if (session.battleProgress?.length) {
    const day = Math.max(...session.battleProgress.map((entry) => entry.day))
    return `День ${Math.min(Math.max(day, 1), 7)}/7`
  }
  return null
}

function getBattleGoal(session: ZoomCalendarSession): string | null {
  return session.goalA ?? session.goalB ?? session.goalText ?? session.questionPreviews?.[0] ?? null
}

function getSessionSecondaryLines(session: ZoomCalendarSession): string[] {
  const normalizedType = getNormalizedSessionType(session)
  if (normalizedType === 'battle_review') {
    return [
      getBattleParticipantLine(session),
      getBattleGoal(session),
    ].filter((value): value is string => Boolean(value))
  }

  if (normalizedType === 'individual' || normalizedType === 'private') {
    const meta = getSessionMeta(session)
    return [
      session.topic && session.topic !== meta ? session.topic : null,
      session.participantNames?.[0] ?? session.attendees?.[0]?.name ?? 'Учасник не призначений',
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

function getCoachPrimaryStatus(
  session: ZoomCalendarSession,
): CoachPrimaryStatus | null {
  if (session.status === 'CANCELLED') {
    return {
      label: 'СКАСОВАНО',
      badgeClass: 'border border-rose-300/30 bg-rose-500/15 text-rose-100',
    }
  }

  if (session.status === 'COMPLETED') return null

  if (session.commerceStatus === 'APPROVED_PENDING_PAYMENT') {
    return {
      label: 'ОЧІКУЄ ОПЛАТИ',
      badgeClass: 'border border-amber-300/30 bg-amber-400/15 text-amber-100',
    }
  }
  if (session.commerceStatus === 'REQUESTED') {
    return {
      label: 'ОЧІКУЄ РІШЕННЯ',
      badgeClass: 'border border-sky-300/30 bg-sky-500/15 text-sky-100',
    }
  }
  return null
}

function getSessionIcon(session: ZoomCalendarSession): ReactNode {
  return SESSION_ICON[getNormalizedSessionType(session)] ?? <CalendarDays className="h-3.5 w-3.5" />
}

function buildCoachWeekDays(
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

function CoachMetricCard({
  label,
  value,
  caption,
}: {
  label: string
  value: ReactNode
  caption?: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <p className="text-[9px] text-white/55">{label}</p>
      <p className="mt-1 text-xl font-semibold leading-none text-white">{value}</p>
      {caption && <p className="mt-1 truncate text-[9px] text-white/45">{caption}</p>}
    </div>
  )
}

function CoachWeekSessionCard({
  session,
  onSelect,
}: {
  session: ZoomCalendarSession
  onSelect: (session: ZoomCalendarSession) => void
}) {
  const secondaryLines = getSessionSecondaryLines(session)
  const compactStatus = getCoachPrimaryStatus(session)
  const compactSecondary = secondaryLines.slice(0, 2).join(' · ') || session.topic

  return (
    <article
      className="border-t border-white/[0.08] py-2.5 first:border-t-0"
      data-coach-session-id={session.id}
    >
      <button type="button" onClick={() => onSelect(session)} aria-label={`Дії з сесією: ${session.topic}`} className="group flex min-h-12 w-full items-center gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-700/40 text-slate-100">
          {getSessionIcon(session)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] leading-4">
            <span className="shrink-0 text-sky-100/85">{formatCoachSessionRange(session)}</span>
            <span className="font-semibold text-white">{['individual', 'private'].includes(getNormalizedSessionType(session)) ? 'Індивідуальна сесія' : getSessionMeta({ type: session.type })}</span>
          </span>
          <span className="mt-0.5 block text-xs leading-4 text-sky-100/70">{compactSecondary}</span>
          {compactStatus && <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${compactStatus.badgeClass}`}>{compactStatus.label}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-center gap-1 text-sky-100/70"><MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" /><ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
      </button>
    </article>
  )
}

export function CoachSessionActions({ session, canManage, busy, error, onDetails, onEdit, onCancel, onComplete, onApprove, onReject }: {
  session: ZoomCalendarSession
  canManage: boolean
  busy: boolean
  error: string | null
  onDetails: () => void
  onEdit: (reschedule: boolean) => void
  onCancel: () => void
  onComplete: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const terminal = session.status === 'COMPLETED' || session.status === 'CANCELLED'
  const pendingRequest = Boolean(session.commerceRequestId && session.commerceStatus === 'REQUESTED')
  const pendingCommerce = Boolean(session.commerceRequestId && ['REQUESTED', 'APPROVED_PENDING_PAYMENT'].includes(session.commerceStatus ?? ''))
  const canEdit = canManage && session.canEdit && !terminal && !pendingCommerce
  const future = new Date(session.scheduledAt).getTime() > Date.now()
  const status = getCoachPrimaryStatus(session)
  const day = new Intl.DateTimeFormat('uk-UA', { timeZone: KYIV_TIMEZONE, weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(session.scheduledAt))
  const actionClass = 'flex w-full items-center gap-3 border-t border-white/10 py-2.5 text-left text-xs text-white/90 disabled:opacity-40'
  return <div data-coach-session-actions className="pt-2">
    <div className="mb-3 flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-700/40">{getSessionIcon(session)}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{['individual', 'private'].includes(getNormalizedSessionType(session)) ? 'Індивідуальна сесія' : getSessionMeta({ type: session.type })}</p>
        <p className="mt-0.5 text-xs text-sky-100/70">{day} · {formatCoachSessionRange(session)}</p>
        <p className="mt-0.5 text-xs text-sky-100/60">{getSessionSecondaryLines(session).join(' · ')}</p>
        {status && <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] ${status.badgeClass}`}>{status.label}</span>}
      </div>
    </div>
    <button type="button" onClick={onDetails} className={actionClass}><Info className="h-4 w-4" />ВІДКРИТИ ДЕТАЛІ</button>
    {canEdit && <>
      <button type="button" onClick={() => onEdit(false)} className={actionClass}><PencilLine className="h-4 w-4" />{getNormalizedSessionType(session) === 'group_practice' ? 'РЕДАГУВАТИ НАЛАШТУВАННЯ' : 'РЕДАГУВАТИ ТЕМУ'}</button>
      <button type="button" onClick={() => onEdit(true)} className={actionClass}><CalendarClock className="h-4 w-4" />ПЕРЕНЕСТИ СЕСІЮ</button>
      {future ? <button type="button" onClick={onCancel} className={actionClass}><Ban className="h-4 w-4 text-rose-400" />{getNormalizedSessionType(session) === 'group_practice' ? 'СКАСУВАТИ ПРАКТИКУ' : 'СКАСУВАТИ СЕСІЮ'}</button> : <button type="button" onClick={onComplete} className={actionClass}><CheckCircle2 className="h-4 w-4 text-emerald-400" />ЗАВЕРШИТИ СЕСІЮ</button>}
    </>}
    {canManage && pendingRequest && !terminal && <>
      <button type="button" disabled={busy} onClick={onApprove} className={actionClass}><CheckCircle2 className="h-4 w-4 text-emerald-400" />ПІДТВЕРДИТИ ЗАПИТ</button>
      <button type="button" disabled={busy} onClick={onReject} className={actionClass}><Ban className="h-4 w-4 text-rose-400" />ВІДХИЛИТИ ЗАПИТ</button>
    </>}
    {error && <p role="alert" className="mt-2 text-xs text-red-200">{error}</p>}
  </div>
}

function CoachWeeklyDiary({
  days,
  onSelectSession,
  onCreateSession,
  canManageZoom,
}: {
  days: CoachWeekDay[]
  onSelectSession: (session: ZoomCalendarSession) => void
  onCreateSession: (date: Date) => void
  canManageZoom: boolean
}) {
  const [expandedEmptyDay, setExpandedEmptyDay] = useState<string | null>(null)
  return (
    <div className="space-y-2.5" data-coach-weekly-diary="true">
      {days.map((day) => (
        <section
          key={day.key}
          className={[
            'rounded-xl border px-2.5 py-2',
            day.sessions.length || day.availability?.windows.length ? 'border-sky-500/30 bg-gradient-to-br from-slate-950 to-sky-950/40' : 'border-slate-700/60 bg-slate-900/35',
          ].join(' ')}
          data-coach-week-day={day.label}
        >
          <div className="flex min-h-10 items-center gap-2.5">
            <div className="w-10 shrink-0 text-left">
              <p className="text-xs font-semibold text-white">{day.label}</p>
              <p className="text-xs font-semibold text-white">{day.dateLabel.padStart(5, '0')}</p>
            </div>
            <span className={`rounded-xl px-2.5 py-1.5 text-[11px] font-semibold ${day.availability?.windows.length ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white' : 'bg-gradient-to-b from-slate-600 to-slate-800 text-slate-100'}`}>{day.availability?.windows.length ? 'ON' : 'OFF'}</span>
            <p className={`min-w-0 flex-1 text-[11px] leading-4 ${day.availability?.windows.length ? 'text-sky-100/85' : 'text-slate-400'}`}>{day.availability?.windows.length ? day.availability.windows.map((slot) => `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}–${String(slot.endHour ?? slot.hour + 1).padStart(2, '0')}:${String(slot.endMinute ?? slot.minute).padStart(2, '0')}`).join(', ') : 'ВИХІДНИЙ'}</p>
            {canManageZoom && (day.sessions.length > 0 || Boolean(day.availability?.windows.length)) ? <button type="button" onClick={() => onCreateSession(day.date)} aria-label={`Додати сесію ${day.key}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-400 bg-gradient-to-b from-sky-400 to-sky-700 text-white shadow-[inset_0_1px_5px_rgba(255,255,255,0.35)]"><Plus className="h-5 w-5" /></button> : <button type="button" aria-label={`Переглянути день ${day.key}`} aria-expanded={expandedEmptyDay === day.key} onClick={() => setExpandedEmptyDay(expandedEmptyDay === day.key ? null : day.key)} className="flex h-8 w-8 shrink-0 items-center justify-center text-sky-100/70"><ChevronRight className="h-4 w-4" /></button>}
          </div>

          {day.sessions.length > 0 ? (
            <div className="ml-[50px] mt-1 border-t border-white/[0.08]">
              {day.sessions.map((session) => (
                <CoachWeekSessionCard
                  key={session.id}
                  session={session}
                  onSelect={onSelectSession}
                />
              ))}
            </div>
          ) : (Boolean(day.availability?.windows.length) || expandedEmptyDay === day.key) && (
            <div className="mt-2 flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-700/70 bg-slate-950/30 px-6 py-6 text-center text-xs leading-5 text-white/85">
              <CalendarDays className="h-6 w-6 text-slate-200" />
              <span className="max-w-44">На цей день немає запланованих зустрічей</span>
              {canManageZoom && (
                <button
                  type="button"
                  onClick={() => onCreateSession(day.date)}
                  className="rounded-lg border border-sky-400 bg-gradient-to-b from-sky-600 to-sky-800 px-3 py-2 text-[11px] font-semibold text-white transition hover:brightness-110"
                >
                  + НОВА СЕСІЯ
                </button>
              )}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}


function CoachActionModal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      containerClassName="z-[80] items-center justify-center px-3 py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      overlayClassName="bg-black/70 backdrop-blur-sm"
      panelClassName="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,8,23,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.48)]"
    >
      <div role="dialog" aria-modal="true" aria-labelledby="coach-action-modal-title" className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h3 id="coach-action-modal-title" className="text-base font-semibold text-white">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-lg leading-none text-white/70 transition hover:bg-white/[0.08] hover:text-white"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 pb-4 pt-1">
          {children}
        </div>
      </div>
    </BaseModal>
  )
}

// ── BattleCard ────────────────────────────────────────────────────────────────

function BattleCard({
  session,
  onFinalize,
}: {
  session: BattleSession
  onFinalize: (id: string, outcome: BattleOutcome) => void
}) {
  const progARef = useRef<HTMLDivElement>(null)
  const progBRef = useRef<HTMLDivElement>(null)

  const startedAt =
    new Date(session.scheduledAt).getTime() - 7 * 24 * 60 * 60 * 1000
  const elapsed = Math.min(Date.now() - startedAt, 7 * 24 * 60 * 60 * 1000)
  const timePct = Math.round((elapsed / (7 * 24 * 60 * 60 * 1000)) * 100)

  const pctA = session.progressA ?? timePct
  const pctB = session.progressB ?? timePct
  const day = getBattleDayLabel(session) ??
    `День ${session.explicitDay ?? Math.min(Math.ceil(elapsed / (24 * 60 * 60 * 1000)), 7)}/7`
  const labelA = session.challengerName ?? session.participantNames?.[0] ?? 'A'
  const labelB = session.opponentName ?? session.participantNames?.[1] ?? 'Б'
  const goalText = getBattleGoal(session)

  useEffect(() => {
    progARef.current?.style.setProperty('--prog-a', `${pctA}%`)
  }, [pctA])

  useEffect(() => {
    progBRef.current?.style.setProperty('--prog-b', `${pctB}%`)
  }, [pctB])

  return (
    <div className="rounded-2xl border border-violet-300/25 bg-violet-500/[0.08] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="mb-2 flex items-start gap-2">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-violet-400/15 text-violet-100">
          <Crosshair className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{goalText ?? session.topic}</p>
          <p className="mt-0.5 text-[12px] text-white/60">{labelA} vs {labelB}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2 py-0.5 text-[10px] font-semibold text-violet-100">
              {BATTLE_STATUS_LABELS[session.battleStatus ?? 'active'] ?? session.battleStatus ?? 'Активний'}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-white/65">
              {day}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 truncate text-[11px] text-white/55">{labelA}</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              ref={progARef}
              className="h-full rounded-full bg-violet-400 [width:var(--prog-a,0%)] transition-all duration-500"
            />
          </div>
        </div>
        <div>
          <p className="mb-1 truncate text-[11px] text-white/55">{labelB}</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              ref={progBRef}
              className="h-full rounded-full bg-sky-400 [width:var(--prog-b,0%)] transition-all duration-500"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {(['challenger', 'opponent', 'both', 'none'] as BattleOutcome[]).map(
          (outcome) => (
            <button
              key={outcome}
              onClick={() => onFinalize(session.id, outcome)}
              className="rounded-lg border border-white/10 bg-white/[0.035] px-2 py-1.5 text-[11px] font-semibold text-white/68 transition hover:bg-white/[0.08] hover:text-white"
            >
              {outcome === 'challenger'
                ? labelA
                : outcome === 'opponent'
                  ? labelB
                  : outcome === 'both'
                    ? 'Обидва'
                    : 'Ніхто'}
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ── CoachZoomPanel ────────────────────────────────────────────────────────────

export interface CoachZoomPanelProps {
  expertId: string | null
  activeScreen?: 'calendar' | 'participants' | 'battle' | 'analytics' | 'more'
}

function CoachParticipantsSummary() {
  const { data, isLoading, isError } = useGetCoachParticipantsQuery()
  const [search, setSearch] = useState('')
  const participants = data?.participants.filter((participant) => participant.displayName.toLowerCase().includes(search.trim().toLowerCase())) ?? []
  return <section id="participants" className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4 scroll-mt-4">
    <h2 className="text-lg font-semibold text-white">УЧАСНИКИ</h2>
    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Пошук" className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-white" />
    {isLoading ? <p className="mt-4 text-sm text-white/55">Завантажуємо учасників…</p> : isError ? <p className="mt-4 text-sm text-red-200">Не вдалося завантажити учасників.</p> : <><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/65"><span>Активні у ФОКУСІ: {data?.summary.activeFocusCount ?? 0}</span><span>Нові цього тижня: {data?.summary.newThisWeekCount ?? 0}</span></div>{participants.length ? <div className="mt-4 space-y-2">{participants.map((participant) => <div key={participant.id} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3"><p className="font-medium text-white">{participant.displayName}</p><p className="mt-1 text-xs text-white/55">ФОКУС: {participant.focusActive ? 'активний' : 'неактивний'}<br />Zoom: {participant.zoomStatus}<br />Остання точка: {participant.lastPoint ?? '—'}</p></div>)}</div> : <p className="mt-4 text-sm text-white/45">Учасників не знайдено.</p>}</>}
  </section>
}

function CoachAnalyticsSummary({ sessions, attendeeCount, activeBattles }: { sessions: ZoomCalendarSession[]; attendeeCount: number; activeBattles: number }) {
  return <section id="analytics" className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4 scroll-mt-4">
    <h2 className="text-lg font-semibold text-white">АНАЛІТИКА</h2>
    <p className="mt-1 text-sm text-white/55">Поточний тиждень Zoom</p>
    <div className="mt-4 grid grid-cols-3 gap-2"><CoachMetricCard label="Сесій" value={sessions.length} caption="у календарі" /><CoachMetricCard label="Учасників" value={attendeeCount} caption="у сесіях" /><CoachMetricCard label="Battle" value={activeBattles} caption="активні" /></div>
  </section>
}

function CoachMoreSummary() {
  return <section id="more" className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4 scroll-mt-4">
    <h2 className="text-lg font-semibold text-white">ЩЕ</h2>
    <p className="mt-2 text-sm leading-6 text-white/55">Додаткові робочі інструменти коуча доступні у Telegram-меню. Календар і доступність залишаються в цьому Mini App.</p>
  </section>
}

export function getCoachSessionInitialValues(
  session: ZoomCalendarSession,
  participantUserIds: string[] = []
): Partial<CreateSessionPayload> {
  return {
    scheduledAt: session.scheduledAt,
    topic: session.topic,
    type: session.type,
    zoomLink: session.zoomLink,
    maxAttendees:
      session.attendeesCount !== undefined &&
      session.remainingSlots !== undefined
        ? session.attendeesCount + session.remainingSlots
        : session.type === 'individual'
          ? 1
          : undefined,
    participantUserId:
      session.type === 'individual' ? participantUserIds[0] : undefined,
    participantUserIds:
      session.type === 'battle_review' ? participantUserIds : undefined,
  }
}

export function CoachZoomPanel({ expertId, activeScreen: activeCoachScreen = 'calendar' }: CoachZoomPanelProps) {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [calendarMode, setCalendarMode] = useState<'calendar' | 'availability'>('calendar')
  const weekRange = getKyivWeekRange(weekAnchor)

  const { data: sessions = [] } = useGetCalendarSessionsQuery(
    {
      from: weekRange.from,
      to: weekRange.to,
      role: 'coach',
      userId: expertId ?? 'staff',
      expertId: expertId ?? undefined,
    },
    {}
  )
  const availabilityWeekFrom = getKyivDateKey(new Date(weekRange.from))
  const { data: effectiveAvailability = [] } = useGetAvailabilityWeekQuery(availabilityWeekFrom)
  const [finalize] = useFinalizeBattleMutation()
  const [approveCommerceRequest, { isLoading: isApprovingCommerce }] =
    useApproveZoomCommerceRequestMutation()
  const [rejectCommerceRequest, { isLoading: isRejectingCommerce }] =
    useRejectZoomCommerceRequestMutation()
  const [createSession, { isLoading: isCreating }] =
    useCreateZoomSessionMutation()
  const [cancelZoomSession, { isLoading: isCancellingSession }] =
    useCancelZoomSessionMutation()

  const [battlesOpen, setBattlesOpen] = useState(true)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [createDate, setCreateDate] = useState<Date | null>(null)
  const [createInitialValues, setCreateInitialValues] = useState<
    Partial<CreateSessionPayload> | undefined
  >(undefined)
  const [selectedSession, setSelectedSession] = useState<ZoomCalendarSession | null>(null)
  const [selectedSessionView, setSelectedSessionView] = useState<'actions' | 'details'>('actions')
  const [requestActionError, setRequestActionError] = useState<string | null>(null)
  const [completionSessionId, setCompletionSessionId] = useState<string | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingFocus, setEditingFocus] = useState<'zoomLink' | 'schedule' | null>(null)
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null)
  const [cancelSessionError, setCancelSessionError] = useState<string | null>(null)

  const weekDays = buildCoachWeekDays(sessions, weekRange.from, effectiveAvailability)
  const activeBattles = sessions.filter(
    (session) =>
      getNormalizedSessionType(session) === 'battle_review' &&
      session.status !== 'COMPLETED' &&
      session.status !== 'CANCELLED'
  )
  const totalAttendees = sessions.reduce(
    (sum, session) => sum + (session.attendeesCount ?? 0),
    0
  )
  const displayBattles: BattleSession[] = activeBattles as BattleSession[]
  const user = useAppSelector((state) => state.auth.user)
  const previewRole = user?.activeRole ?? user?.role ?? 'USER'
  const canManageZoom =
    previewRole === 'EXPERT' ||
    previewRole === 'ADMIN' ||
    previewRole === 'SUPERADMIN'
  const { data: coachUsers = [] } = useGetUsersQuery(undefined, {
    skip: !canManageZoom,
  })
  const selectedSessionData = selectedSession
    ? (sessions.find((session) => session.id === selectedSession.id) ?? selectedSession)
    : null
  const editingSessionData = editingSessionId
    ? (sessions.find((session) => session.id === editingSessionId) ?? null)
    : null
  const [updateSession, { isLoading: isUpdating }] =
    useUpdateZoomSessionMutation()

  const handleFinalize = (sessionId: string, outcome: BattleOutcome) => {
    finalize({ sessionId, outcome }).catch(console.error)
  }

  const handleCreate = async (payload: CreateSessionPayload) => {
    await createSession(payload).unwrap()
    closeCoachActionModal()
  }

  const handleUpdate = async (payload: CreateSessionPayload) => {
    if (!editingSessionData) {
      return
    }

    await updateSession({ id: editingSessionData.id, patch: payload }).unwrap()
    closeCoachActionModal()
  }

  const closeCoachActionModal = () => {
    setSelectedSession(null)
    setSelectedSessionView('actions')
    setRequestActionError(null)
    setCompletionSessionId(null)
    setEditingSessionId(null)
    setEditingFocus(null)
    setCreateDate(null)
    setCreateInitialValues(undefined)
    setCancellingSessionId(null)
    setCancelSessionError(null)
  }

  const requestSessionCancellation = (sessionId: string) => {
    setCancellingSessionId(sessionId)
    setCancelSessionError(null)
  }

  const handleRequestDecision = async (approve: boolean) => {
    if (!selectedSessionData?.commerceRequestId) return
    setRequestActionError(null)
    try {
      const decide = approve ? approveCommerceRequest : rejectCommerceRequest
      await decide(selectedSessionData.commerceRequestId).unwrap()
      closeCoachActionModal()
    } catch {
      setRequestActionError('Не вдалося оновити запит. Спробуй ще раз.')
    }
  }

  const confirmSessionCancellation = async () => {
    if (!cancellingSessionId || isCancellingSession) return

    setCancelSessionError(null)
    try {
      await cancelZoomSession(cancellingSessionId).unwrap()
      closeCoachActionModal()
    } catch {
      setCancelSessionError('Не вдалося скасувати Zoom-сесію. Спробуй ще раз.')
    }
  }

  const handleCreateForDate = (date: Date) => {
    if (!canManageZoom) return
    setSelectedSession(null)
    setCompletionSessionId(null)
    setEditingSessionId(null)
    setEditingFocus(null)
    setCreateInitialValues(undefined)
    setCreateDate(date)
  }

  const handleAddToCalendar = (session: ZoomCalendarSession) => {
    const icsContent = buildCalendarEvent(session)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'focus-zoom-practice.ics'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const goToPreviousWeek = () => {
    setWeekAnchor((current) => new Date(current.getTime() - 7 * 24 * 60 * 60 * 1000))
  }

  const goToNextWeek = () => {
    setWeekAnchor((current) => new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000))
  }

  const goToCurrentWeek = () => {
    setWeekAnchor(new Date())
  }

  return (
    <div className="flex flex-col gap-3 text-white" data-coach-zoom-panel="weekly-diary">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
              <h1 className="text-xl font-semibold leading-tight text-white">Панель коуча</h1>
              <p className="mt-0.5 text-xs text-white/56">Vira · Starway Studio</p>
          </div>
          {canManageZoom && activeCoachScreen === 'calendar' && (
            <button
              type="button"
              onClick={() => handleCreateForDate(new Date())}
              className="rounded-lg border border-sky-400 bg-gradient-to-b from-sky-700/50 to-sky-950/50 px-3 py-2 text-[11px] font-semibold text-white"
            >
              + НОВА СЕСІЯ
            </button>
          )}
        </div>

        {activeCoachScreen === 'calendar' && <div className="mt-3 grid grid-cols-2 rounded-lg border border-slate-700/60">
          <button type="button" aria-pressed={calendarMode === 'calendar'} onClick={() => setCalendarMode('calendar')} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${calendarMode === 'calendar' ? 'border-sky-400 bg-gradient-to-b from-sky-700/50 to-sky-950/50 text-white' : 'border-transparent text-sky-100/80'}`}>КАЛЕНДАР</button>
          <button type="button" aria-pressed={calendarMode === 'availability'} onClick={() => setCalendarMode('availability')} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${calendarMode === 'availability' ? 'border-sky-400 bg-gradient-to-b from-sky-700/50 to-sky-950/50 text-white' : 'border-transparent text-sky-100/80'}`}>МОЯ ДОСТУПНІСТЬ</button>
        </div>}

        {activeCoachScreen === 'calendar' && calendarMode === 'calendar' && <>
        <div className="mt-4 flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            onClick={goToPreviousWeek}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Попередній тиждень"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-xs font-semibold text-white">{formatWeekRange(weekRange.from)} {new Date(weekRange.from).getUTCFullYear()}</p>
          </div>
          <button
            type="button"
            onClick={goToCurrentWeek}
            className="rounded-xl border border-sky-300/20 bg-sky-500/10 px-3 py-2 text-[12px] font-semibold text-sky-100 transition hover:bg-sky-500/16"
          >
            Сьогодні
          </button>
          <button
            type="button"
            onClick={goToNextWeek}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Наступний тиждень"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        </>}
      </div>

      {activeCoachScreen === 'calendar' && calendarMode === 'availability' ? (
        <ZoomAvailabilityEditor
          weekAnchor={weekAnchor}
          sessions={sessions}
          onPreviousWeek={goToPreviousWeek}
          onNextWeek={goToNextWeek}
          onCurrentWeek={goToCurrentWeek}
        />
      ) : <>
      {activeCoachScreen === 'calendar' && <CoachWeeklyDiary
        days={weekDays}
        onSelectSession={(session) => {
          setSelectedSession(session)
          setSelectedSessionView('actions')
          setRequestActionError(null)
          setCompletionSessionId(null)
          setCreateDate(null)
        }}
        onCreateSession={handleCreateForDate}
        canManageZoom={canManageZoom}
      />}

      {activeCoachScreen === 'battle' && <section id="battle" className="scroll-mt-4">
        <SectionLabel
          label="АКТИВНІ BATTLES"
          count={displayBattles.length}
          collapsible
          open={battlesOpen}
          onToggle={() => setBattlesOpen((open) => !open)}
          action={
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setInstructionsOpen(true)
              }}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold normal-case tracking-normal text-white/75 transition hover:bg-white/[0.08] hover:text-white"
            >
              Інструкція
            </button>
          }
        />
        {battlesOpen && (
          displayBattles.length > 0 ? (
            <div className="flex flex-col gap-2">
              {displayBattles.map((session) => (
                <BattleCard
                  key={session.id}
                  session={session}
                  onFinalize={handleFinalize}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-3 py-3 text-sm text-white/45">
              Активних battles немає
            </div>
          )
        )}
      </section>}
      {activeCoachScreen === 'participants' && <CoachParticipantsSummary />}
      {activeCoachScreen === 'analytics' && <CoachAnalyticsSummary sessions={sessions} attendeeCount={totalAttendees} activeBattles={displayBattles.length} />}
      {activeCoachScreen === 'more' && <CoachMoreSummary />}
      </>}

      {selectedSessionData && (
        <CoachActionModal
          title={cancellingSessionId === selectedSessionData.id
            ? 'Скасувати сесію'
            : completionSessionId === selectedSessionData.id ? 'Завершити сесію'
            : selectedSessionView === 'details' ? 'Деталі сесії'
            : selectedSessionData.commerceRequestId && ['REQUESTED', 'APPROVED_PENDING_PAYMENT'].includes(selectedSessionData.commerceStatus ?? '') ? 'Дії з запитом користувача'
            : getNormalizedSessionType(selectedSessionData) === 'group_practice' ? 'Дії з груповою практикою' : 'Дії з сесією'}
          onClose={closeCoachActionModal}
        >
          {cancellingSessionId === selectedSessionData.id ? (
            <div className="space-y-4">
              <p className="text-sm text-white/75">Скасувати цю Zoom-сесію?</p>
              {cancelSessionError && (
                <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-100">
                  {cancelSessionError}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void confirmSessionCancellation()}
                  disabled={isCancellingSession}
                  className="rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-2.5 text-[12px] font-semibold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCancellingSession ? 'СКАСОВУЄМО…' : 'СКАСУВАТИ СЕСІЮ'}
                </button>
                <button
                  type="button"
                  onClick={() => setCancellingSessionId(null)}
                  disabled={isCancellingSession}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-semibold text-white/70 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  НАЗАД
                </button>
              </div>
            </div>
          ) : selectedSessionView === 'actions' ? (
            <CoachSessionActions
              session={selectedSessionData} canManage={canManageZoom}
              busy={isApprovingCommerce || isRejectingCommerce} error={requestActionError}
              onDetails={() => setSelectedSessionView('details')}
              onEdit={(reschedule) => { setEditingSessionId(selectedSessionData.id); setEditingFocus(reschedule ? 'schedule' : null); setSelectedSession(null) }}
              onCancel={() => requestSessionCancellation(selectedSessionData.id)}
              onComplete={() => { setCompletionSessionId(selectedSessionData.id); setSelectedSessionView('details') }}
              onApprove={() => void handleRequestDecision(true)} onReject={() => void handleRequestDecision(false)}
            />
          ) : (
            <>
              <SessionCard
                session={selectedSessionData}
                mode="coach"
                userId={expertId ?? 'staff'}
                initialCompletionOpen={completionSessionId === selectedSessionData.id}
                onClose={closeCoachActionModal}
                onAddToCalendar={handleAddToCalendar}
                onEdit={(id) => {
                  setEditingSessionId(id)
                  setSelectedSession(null)
                  setCompletionSessionId(null)
                }}
                onCancel={requestSessionCancellation}
              />
              {canManageZoom && selectedSessionData.commerceStatus === 'REQUESTED' && selectedSessionData.commerceRequestId && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRequestDecision(true)}
                    disabled={isApprovingCommerce || isRejectingCommerce}
                    className="rounded-xl border border-emerald-300/25 bg-emerald-500/15 px-4 py-2.5 text-[12px] font-semibold text-emerald-100 transition hover:bg-emerald-500/24 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ПІДТВЕРДИТИ
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRequestDecision(false)}
                    disabled={isApprovingCommerce || isRejectingCommerce}
                    className="rounded-xl border border-rose-300/25 bg-rose-500/15 px-4 py-2.5 text-[12px] font-semibold text-rose-100 transition hover:bg-rose-500/24 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ВІДХИЛИТИ
                  </button>
                </div>
              )}
              {requestActionError && <p role="alert" className="mt-2 text-xs text-red-200">{requestActionError}</p>}
            </>
          )}
        </CoachActionModal>
      )}

      {canManageZoom && createDate && (
        <CoachActionModal title="Нова ZOOM-практика" onClose={closeCoachActionModal}>
          <SessionForm
            defaultDate={createDate}
            participants={coachUsers}
            initialValues={createInitialValues}
            onSubmit={handleCreate}
            onClose={closeCoachActionModal}
            isLoading={isCreating}
            title="Нова ZOOM-практика"
          />
        </CoachActionModal>
      )}
      {canManageZoom && editingSessionData && (
        <CoachActionModal title={editingFocus === 'schedule' ? 'Перенести сесію' : 'Редагування сесії'} onClose={closeCoachActionModal}>
          <SessionForm
            defaultDate={new Date(editingSessionData.scheduledAt)}
            sessionId={editingSessionData.id}
            participants={coachUsers}
            initialValues={{
              scheduledAt: editingSessionData.scheduledAt,
              topic: editingSessionData.topic,
              type: editingSessionData.type,
              zoomLink: editingSessionData.zoomLink,
              ...getCoachSessionInitialValues(editingSessionData),
            }}
            onSubmit={handleUpdate}
            onClose={closeCoachActionModal}
            isLoading={isUpdating}
            title={editingFocus === 'schedule' ? 'Перенести сесію' : 'Редагування сесії'}
            submitLabel="Зберегти"
            loadingLabel="Збереження..."
            autoFocusZoomLink={editingFocus === 'zoomLink'}
          />
        </CoachActionModal>
      )}

      {instructionsOpen && (
        <BattleInstruction onClose={() => setInstructionsOpen(false)} />
      )}
    </div>
  )
}
