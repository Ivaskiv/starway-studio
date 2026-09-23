// apps/web/src/features/zoom/CoachZoomPanel.tsx

import { useAppSelector } from '@/app/hooks'
import { useGetUsersQuery } from '@/features/admin/services/ownership.api'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  ExternalLink,
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
  useFinalizeBattleMutation,
  useGetCalendarSessionsQuery,
  useGetCoachParticipantsQuery,
  useRejectZoomCommerceRequestMutation,
  useUpdateZoomSessionMutation,
} from './zoom.api'
import type {
  CreateSessionPayload,
  ZoomCalendarSession,
} from './zoom.types'
import {
  getNormalizedSessionType,
  getSessionMeta,
  getZoomPaymentBadgeLabel,
  isZoomLinkActive,
  sessionStatusVariant,
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

function formatWeekRange(from: string): string {
  const fromKey = getKyivDateKey(new Date(from))
  const toKey = addKyivDays(fromKey, 6)
  const [, fromMonth, fromDay] = fromKey.split('-').map(Number)
  const [, toMonth, toDay] = toKey.split('-').map(Number)

  if (fromMonth === toMonth) {
    return `${fromDay}–${toDay} ${UK_MONTH_GENITIVE[toMonth - 1]}`
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

function isIncompletePastSession(session: ZoomCalendarSession): boolean {
  return (
    session.status !== 'COMPLETED' &&
    session.status !== 'CANCELLED' &&
    new Date(session.scheduledAt).getTime() <= Date.now()
  )
}

function hasCompletedSessionOutcome(session: ZoomCalendarSession): boolean {
  return (
    session.status === 'COMPLETED' &&
    (session.actualAttendeeCount !== undefined ||
      Boolean(session.outcomeTopic) ||
      Boolean(session.summary) ||
      Boolean(session.recordingUrl))
  )
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
      session.participantNames?.[0] ?? null,
      session.questionPreviews?.[0] ?? session.goalText ?? null,
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

function getPaymentLabel(session: ZoomCalendarSession): string | null {
  return getZoomPaymentBadgeLabel(session)
}

function getSessionCardClassName(session: ZoomCalendarSession): string {
  const normalizedType = getNormalizedSessionType(session)
  if (normalizedType === 'battle_review') {
    return 'border-violet-400/45 bg-violet-500/[0.12] shadow-[0_0_0_1px_rgba(167,139,250,0.12)]'
  }
  if (normalizedType === 'individual' || normalizedType === 'private') {
    return 'border-sky-400/45 bg-sky-500/[0.12] shadow-[0_0_0_1px_rgba(56,189,248,0.12)]'
  }
  if (normalizedType === 'group_practice' || normalizedType === 'group') {
    return 'border-emerald-400/45 bg-emerald-500/[0.12] shadow-[0_0_0_1px_rgba(52,211,153,0.12)]'
  }
  return 'border-white/10 bg-white/[0.045]'
}

function getSessionIcon(session: ZoomCalendarSession): ReactNode {
  return SESSION_ICON[getNormalizedSessionType(session)] ?? <CalendarDays className="h-3.5 w-3.5" />
}

function buildCoachWeekDays(
  sessions: ZoomCalendarSession[],
  weekFrom: string,
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
  canManageZoom,
  onSelect,
  onComplete,
  onApproveRequest,
  onRejectRequest,
  commerceActionPending,
}: {
  session: ZoomCalendarSession
  canManageZoom: boolean
  onSelect: (session: ZoomCalendarSession) => void
  onComplete: (session: ZoomCalendarSession) => void
  onApproveRequest: (requestId: string) => void
  onRejectRequest: (requestId: string) => void
  commerceActionPending: boolean
}) {
  const normalizedType = getNormalizedSessionType(session)
  const statusVariant = sessionStatusVariant(session.battleStatus ?? session.status)
  const needsCompletion = canManageZoom && Boolean(session.canEdit) && isIncompletePastSession(session)
  const paymentLabel = getPaymentLabel(session)
  const battleDayLabel = normalizedType === 'battle_review' ? getBattleDayLabel(session) : null
  const secondaryLines = getSessionSecondaryLines(session)
  const zoomEnabled = Boolean(session.zoomLink) && isZoomLinkActive(session.scheduledAt)
  const completedOutcomeVisible = hasCompletedSessionOutcome(session)

  return (
    <article
      className={`group w-full rounded-xl border px-2.5 py-2 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.07] ${getSessionCardClassName(session)}`}
      data-coach-session-id={session.id}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => onSelect(session)}
          className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/85 transition hover:bg-white/15"
          aria-label="Відкрити сесію"
        >
          {getSessionIcon(session)}
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onSelect(session)}
            className="block w-full min-w-0 text-left"
          >
            <p className="min-w-0 text-[13px] font-semibold leading-tight text-white">
              <span className="mr-2 text-white/85">{formatKyivTime(session.scheduledAt)}</span>
              <span>{getSessionMeta(session)}</span>
            </p>
          </button>
          {secondaryLines.length > 0 && (
            <p className="mt-1 text-[12px] leading-snug text-white/68">
              {secondaryLines.join(' · ')}
            </p>
          )}
          {completedOutcomeVisible && (
            <div className="mt-2 rounded-lg border border-emerald-400/15 bg-emerald-500/[0.06] px-2.5 py-2 text-[12px] leading-snug text-white/72">
              <p className="font-semibold text-emerald-200">✅ Завершено</p>
              {session.actualAttendeeCount !== undefined && (
                <p className="mt-1">{session.actualAttendeeCount} були присутні</p>
              )}
              {session.attendeesCount !== undefined && session.actualAttendeeCount !== undefined && (
                <p className="mt-0.5 text-white/45">{session.actualAttendeeCount} фактично · {session.attendeesCount} зареєстровано</p>
              )}
              {session.outcomeTopic && <p className="mt-1">Тема: «{session.outcomeTopic}»</p>}
              {session.summary && <p className="mt-1">Підсумок: «{session.summary}»</p>}
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
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${needsCompletion ? 'border border-amber-300/30 bg-amber-400/15 text-amber-100' : statusVariant.badgeClass}`}>
              {needsCompletion ? 'Потребує завершення' : statusVariant.label}
            </span>
            {paymentLabel && (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                {paymentLabel}
              </span>
            )}
            {battleDayLabel && (
              <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2 py-0.5 text-[10px] font-semibold text-violet-100">
                {battleDayLabel}
              </span>
            )}
            {session.zoomLink && (
              <span
                className={[
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                  zoomEnabled
                    ? 'border-sky-300/30 bg-sky-400/15 text-sky-100'
                    : 'border-white/10 bg-white/[0.04] text-white/45',
                ].join(' ')}
              >
                Увійти в Zoom
                <ExternalLink className="h-3 w-3" />
              </span>
            )}
            {needsCompletion && (
              <button
                type="button"
                onClick={() => onComplete(session)}
                className="rounded-full border border-emerald-300/25 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/24"
              >
                Завершити сесію
              </button>
            )}
            {canManageZoom && session.commerceStatus === 'REQUESTED' && session.commerceRequestId && (
              <>
                <button
                  type="button"
                  onClick={() => onApproveRequest(session.commerceRequestId!)}
                  disabled={commerceActionPending}
                  className="rounded-full border border-emerald-300/25 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/24 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Підтвердити
                </button>
                <button
                  type="button"
                  onClick={() => onRejectRequest(session.commerceRequestId!)}
                  disabled={commerceActionPending}
                  className="rounded-full border border-rose-300/25 bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-100 transition hover:bg-rose-500/24 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Відхилити
                </button>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSelect(session)}
          className="mt-1 text-white/45 transition group-hover:text-white/80"
          aria-label="Відкрити деталі сесії"
        >
          ›
        </button>
      </div>
    </article>
  )
}

function CoachWeeklyDiary({
  days,
  onSelectSession,
  onCompleteSession,
  onCreateSession,
  onApproveRequest,
  onRejectRequest,
  commerceActionPending,
  canManageZoom,
}: {
  days: CoachWeekDay[]
  onSelectSession: (session: ZoomCalendarSession) => void
  onCompleteSession: (session: ZoomCalendarSession) => void
  onCreateSession: (date: Date) => void
  onApproveRequest: (requestId: string) => void
  onRejectRequest: (requestId: string) => void
  commerceActionPending: boolean
  canManageZoom: boolean
}) {
  return (
    <div className="space-y-2.5" data-coach-weekly-diary="true">
      {days.map((day) => (
        <section
          key={day.key}
          className={[
            'rounded-2xl border px-2.5 py-2.5',
            day.isToday
              ? 'border-sky-300/30 bg-sky-400/[0.08] shadow-[0_0_30px_rgba(56,189,248,0.12)]'
              : 'border-white/[0.08] bg-white/[0.025]',
          ].join(' ')}
          data-coach-week-day={day.label}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <p className={['text-sm font-semibold', day.isToday ? 'text-sky-200' : 'text-white/85'].join(' ')}>
                {day.label}
              </p>
              <p className={['text-sm font-semibold', day.isToday ? 'text-sky-200' : 'text-white/65'].join(' ')}>
                {day.dateLabel}
              </p>
              {day.isToday && <span className="text-[11px] text-sky-200/75">· Сьогодні</span>}
            </div>
            {day.sessions.length > 0 && (
              <span className="text-[11px] text-white/45">{day.sessions.length} сес.</span>
            )}
          </div>

          {day.sessions.length > 0 ? (
            <div className="space-y-2">
              {day.sessions.map((session) => (
                <CoachWeekSessionCard
                  key={session.id}
                  session={session}
                  canManageZoom={canManageZoom}
                  onSelect={onSelectSession}
                  onComplete={onCompleteSession}
                  onApproveRequest={onApproveRequest}
                  onRejectRequest={onRejectRequest}
                  commerceActionPending={commerceActionPending}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-white/10 bg-black/10 px-3 py-2 text-[12px] text-white/42">
              <span>Немає запланованих сесій</span>
              {canManageZoom && (
                <button
                  type="button"
                  onClick={() => onCreateSession(day.date)}
                  className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                >
                  + Додати сесію
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
      containerClassName="z-[80] items-end px-3 py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4"
      overlayClassName="bg-black/70 backdrop-blur-sm"
      panelClassName="relative z-10 flex max-h-[calc(100vh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,8,23,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.48)] sm:max-h-[calc(100vh-2rem)]"
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

export function CoachZoomPanel({ expertId }: CoachZoomPanelProps) {
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
  const [finalize] = useFinalizeBattleMutation()
  const [approveCommerceRequest, { isLoading: isApprovingCommerce }] =
    useApproveZoomCommerceRequestMutation()
  const [rejectCommerceRequest, { isLoading: isRejectingCommerce }] =
    useRejectZoomCommerceRequestMutation()
  const [createSession, { isLoading: isCreating }] =
    useCreateZoomSessionMutation()

  const [battlesOpen, setBattlesOpen] = useState(true)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [createDate, setCreateDate] = useState<Date | null>(null)
  const [createInitialValues, setCreateInitialValues] = useState<
    Partial<CreateSessionPayload> | undefined
  >(undefined)
  const [selectedSession, setSelectedSession] = useState<ZoomCalendarSession | null>(null)
  const [completionSessionId, setCompletionSessionId] = useState<string | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingFocus, setEditingFocus] = useState<'zoomLink' | null>(null)

  const weekDays = buildCoachWeekDays(sessions, weekRange.from)
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
  const paymentSessions = sessions.filter((session) => typeof session.priceCents === 'number')
  const paidSessions = paymentSessions.filter((session) => (session.priceCents ?? 0) > 0).length
  const paymentsMetric = paymentSessions.length > 0
    ? `${Math.round((paidSessions / paymentSessions.length) * 100)}%`
    : '—'
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
    setCompletionSessionId(null)
    setEditingSessionId(null)
    setEditingFocus(null)
    setCreateDate(null)
    setCreateInitialValues(undefined)
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
      <div className="rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,8,23,0.95))] p-3 shadow-[0_16px_42px_rgba(0,0,0,0.24)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-300/25 bg-sky-500/15 text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.16)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-tight text-white">Панель коуча</h1>
              <p className="mt-0.5 text-xs text-white/56">Vira · Starway Studio</p>
            </div>
          </div>
          {canManageZoom && calendarMode === 'calendar' && (
            <button
              type="button"
              onClick={() => handleCreateForDate(new Date())}
              className="rounded-xl border border-sky-300/35 bg-sky-500/20 px-3 py-2 text-[12px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-sky-500/28"
            >
              + Нова сесія
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 rounded-xl border border-white/10 bg-black/15 p-1">
          <button type="button" onClick={() => setCalendarMode('calendar')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${calendarMode === 'calendar' ? 'bg-sky-500/20 text-white' : 'text-white/55'}`}>КАЛЕНДАР</button>
          <button type="button" onClick={() => setCalendarMode('availability')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${calendarMode === 'availability' ? 'bg-sky-500/20 text-white' : 'text-white/55'}`}>МОЯ ДОСТУПНІСТЬ</button>
        </div>

        {calendarMode === 'calendar' && <>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <CoachMetricCard label="Сесій" value={sessions.length} caption="на тиждень" />
          <CoachMetricCard label="Учасників" value={totalAttendees} caption="всього" />
          <CoachMetricCard label="Активних" value={displayBattles.length} caption="battle" />
          <CoachMetricCard label="Оплат" value={paymentsMetric} caption={paymentSessions.length ? `${paidSessions}/${paymentSessions.length}` : 'немає даних'} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/15 p-1.5">
          <button
            type="button"
            onClick={goToPreviousWeek}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Попередній тиждень"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-sm font-semibold text-white">{formatWeekRange(weekRange.from)} {new Date(weekRange.from).getUTCFullYear()}</p>
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

      {calendarMode === 'availability' ? (
        <ZoomAvailabilityEditor
          weekAnchor={weekAnchor}
          sessions={sessions}
          onPreviousWeek={goToPreviousWeek}
          onNextWeek={goToNextWeek}
          onCurrentWeek={goToCurrentWeek}
        />
      ) : <>
      <CoachWeeklyDiary
        days={weekDays}
        onSelectSession={(session) => {
          setSelectedSession(session)
          setCompletionSessionId(null)
          setCreateDate(null)
        }}
        onCompleteSession={(session) => {
          setSelectedSession(session)
          setCompletionSessionId(session.id)
          setCreateDate(null)
        }}
        onCreateSession={handleCreateForDate}
        onApproveRequest={(requestId) => {
          void approveCommerceRequest(requestId)
        }}
        onRejectRequest={(requestId) => {
          void rejectCommerceRequest(requestId)
        }}
        commerceActionPending={isApprovingCommerce || isRejectingCommerce}
        canManageZoom={canManageZoom}
      />

      <section id="battle" className="scroll-mt-4">
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
      </section>
      <CoachParticipantsSummary />
      <CoachAnalyticsSummary sessions={sessions} attendeeCount={totalAttendees} activeBattles={displayBattles.length} />
      <CoachMoreSummary />
      </>}

      {selectedSessionData && (
        <CoachActionModal
          title={completionSessionId === selectedSessionData.id ? 'Завершити сесію' : 'Сесія'}
          onClose={closeCoachActionModal}
        >
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
            onCancel={closeCoachActionModal}
          />
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
        <CoachActionModal title="Редагування сесії" onClose={closeCoachActionModal}>
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
            title="Редагування сесії"
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
