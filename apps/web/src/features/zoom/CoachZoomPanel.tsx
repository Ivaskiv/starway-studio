// apps/web/src/features/zoom/CoachZoomPanel.tsx

import { useAppSelector } from '@/app/hooks'
import { useGetUsersQuery } from '@/features/admin/services/ownership.api'
import {
  CalendarDays,
  Crosshair,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import ZoomCalendar from './components/calendar/Calendar'
import { SessionForm } from './components/calendar/SessionForm'
import { BattleInstruction } from './components/BattleInstruction'
import {
  useCreateZoomSessionMutation,
  useFinalizeBattleMutation,
  useGetCalendarSessionsQuery,
  useGetLeaderboardQuery,
  useUpdateZoomSessionMutation,
} from './zoom.api'
import type {
  CreateSessionPayload,
  LeaderboardEntry,
  ZoomCalendarSession,
} from './zoom.types'

// ── Types ─────────────────────────────────────────────────────────────────────

type BattleOutcome = 'challenger' | 'opponent' | 'both' | 'none'

interface BattleSession extends ZoomCalendarSession {
  challengerName?: string
  opponentName?: string
  progressA?: number
  progressB?: number
  explicitDay?: number
  goalA?: string
  goalB?: string
}

const RANK_EMOJI = ['🥇', '🥈', '🥉']

// ── SectionLabel ──────────────────────────────────────────────────────────────

function SectionLabel({
  label,
  count,
  collapsible = false,
  open = false,
  onToggle,
  action,
  demo = false,
}: {
  label: string
  count?: number
  collapsible?: boolean
  open?: boolean
  onToggle?: () => void
  action?: ReactNode
  demo?: boolean
}) {
  return (
    <div
      className={[
        'flex items-center justify-between mb-3',
        collapsible ? 'cursor-pointer select-none' : '',
      ].join(' ')}
      onClick={collapsible ? onToggle : undefined}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--accent-soft-rgb))] flex items-center">
        {label}
        {count !== undefined ? ` · ${count}` : ''}
        {demo && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 ml-2 normal-case tracking-normal font-medium">
            демо
          </span>
        )}
      </p>
      <div className="flex items-center gap-2">
        {action}
        {collapsible && (
          <svg
            viewBox="0 0 16 16"
            className={[
              'w-4 h-4 text-[rgb(var(--accent-soft-rgb))]/40 transition-transform duration-200',
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
  const day =
    session.explicitDay ??
    Math.min(Math.ceil(elapsed / (24 * 60 * 60 * 1000)), 7)
  const labelA = session.challengerName ?? 'A'
  const labelB = session.opponentName ?? 'Б'
  const goalAText = session.goalA ?? session.goalText
  const goalBText = session.goalB

  useEffect(() => {
    progARef.current?.style.setProperty('--prog-a', `${pctA}%`)
  }, [pctA])

  useEffect(() => {
    progBRef.current?.style.setProperty('--prog-b', `${pctB}%`)
  }, [pctB])

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 flex-shrink-0">
            <Crosshair className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {session.topic}
          </p>
          <span className="inline-flex text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium flex-shrink-0">
            battle
          </span>
          <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0">
            День {day}/7
          </span>
        </div>
        <button
          onClick={() => onFinalize(session.id, 'challenger')}
          className="btn-liquid-primary inline-flex items-center text-[11px] font-semibold px-3 py-1 rounded-[var(--btn-radius)] flex-shrink-0"
        >
          Фінал
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
        <div>
          <p className="text-[11px] text-[var(--text-muted)] mb-1 truncate">
            {labelA}
            {goalAText ? ` — ${goalAText}` : ''}
          </p>
          <div className="h-1.5 rounded-full bg-[var(--border-primary)] overflow-hidden">
            <div
              ref={progARef}
              className="h-full rounded-full bg-purple-500 [width:var(--prog-a,0%)] transition-all duration-500"
            />
          </div>
        </div>
        <div>
          <p className="text-[11px] text-[var(--text-muted)] mb-1 truncate">
            {labelB}
            {goalBText ? ` — ${goalBText}` : ''}
          </p>
          <div className="h-1.5 rounded-full bg-[var(--border-primary)] overflow-hidden">
            <div
              ref={progBRef}
              className="h-full rounded-full bg-red-500 [width:var(--prog-b,0%)] transition-all duration-500"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 mt-2 flex-wrap">
        {(['challenger', 'opponent', 'both', 'none'] as BattleOutcome[]).map(
          (o) => (
            <button
              key={o}
              onClick={() => onFinalize(session.id, o)}
              className="py-1 px-2.5 rounded-lg border border-[var(--border-primary)] bg-transparent text-[11px] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)] transition-all"
            >
              {o === 'challenger'
                ? `${labelA} виконала`
                : o === 'opponent'
                  ? `${labelB} виконала`
                  : o === 'both'
                    ? 'Обидва'
                    : 'Ніхто'}
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ── LeaderboardRow ────────────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  rank,
}: {
  entry: LeaderboardEntry
  rank: number
}) {
  const rankLabel = rank < 3 ? RANK_EMOJI[rank] : `${rank + 1}`
  const initials = entry.userId.slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-2 py-2 border-b border-[var(--border-primary)] last:border-b-0">
      <span className="text-[13px] w-6 text-center flex-shrink-0">
        {rankLabel}
      </span>
      <span className="w-7 h-7 rounded-full bg-purple-500/15 text-purple-300 text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
        {initials}
      </span>
      <span className="flex-1 text-sm text-[var(--text-secondary)] truncate">
        @{entry.userId.slice(0, 10)}…
      </span>
      <span className="text-xs text-[rgb(var(--accent-soft-rgb))] font-semibold flex-shrink-0">
        {entry.battleWins} · {entry.mindXP} XP
      </span>
    </div>
  )
}

// ── CoachZoomPanel ────────────────────────────────────────────────────────────

export interface CoachZoomPanelProps {
  expertId: string | null
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
  const now = new Date()
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString()
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  ).toISOString()

  const { data: sessions = [] } = useGetCalendarSessionsQuery(
    {
      from: monthStart,
      to: monthEnd,
      role: 'coach',
      userId: expertId ?? 'staff',
    },
    { pollingInterval: 30_000, refetchOnMountOrArgChange: true }
  )
  const { data: leaderboard = [] } = useGetLeaderboardQuery()
  const [finalize] = useFinalizeBattleMutation()
  const [createSession, { isLoading: isCreating }] =
    useCreateZoomSessionMutation()

  const [battlesOpen, setBattlesOpen] = useState(true)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [createDate, setCreateDate] = useState<Date | null>(null)
  const [createInitialValues, setCreateInitialValues] = useState<
    Partial<CreateSessionPayload> | undefined
  >(undefined)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingFocus, setEditingFocus] = useState<'zoomLink' | null>(null)

  const activeBattles = sessions.filter(
    (s) =>
      s.type === 'battle_review' &&
      s.status !== 'COMPLETED' &&
      s.status !== 'CANCELLED'
  )
  const scheduledSessionsCount = sessions.filter(
    (s) =>
      s.type !== 'battle_review' &&
      s.status !== 'COMPLETED' &&
      s.status !== 'CANCELLED'
  ).length
  const displayBattles: BattleSession[] = activeBattles as BattleSession[]
  const displayLeaderboard: LeaderboardEntry[] = leaderboard
  const user = useAppSelector((s) => s.auth.user)
  const previewRole = user?.activeRole ?? user?.role ?? 'USER'
  const canManageZoom =
    previewRole === 'EXPERT' ||
    previewRole === 'ADMIN' ||
    previewRole === 'SUPERADMIN'
  const { data: coachUsers = [] } = useGetUsersQuery(undefined, {
    skip: !canManageZoom,
  })
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
    setCreateDate(null)
    setCreateInitialValues(undefined)
  }

  const handleUpdate = async (payload: CreateSessionPayload) => {
    if (!editingSessionData) {
      return
    }

    await updateSession({ id: editingSessionData.id, patch: payload }).unwrap()
    setEditingSessionId(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-[var(--text-primary)]">
            <CalendarDays className="h-5 w-5" />
            Панель коуча
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Nadya · Starway Studio
          </p>
        </div>
        <a
          href="#coach-create-form"
          onClick={() => {
            setEditingSessionId(null)
            setCreateInitialValues(undefined)
            setCreateDate(new Date())
          }}
          className="btn-liquid-primary inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-[var(--btn-radius)] flex-shrink-0"
        >
          + Нова сесія
        </a>
      </div>

      {/* 2. Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: 'СЕСІЙ / МІСЯЦЬ',
            value: scheduledSessionsCount,
          },
          { label: 'АКТИВНИХ BATTLES', value: displayBattles.length },
          { label: 'TOP XP', value: displayLeaderboard[0]?.mindXP ?? '—' },
          { label: 'УЧАСНИКИ', value: displayLeaderboard.length },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-[var(--glass-bg)] rounded-xl p-4 border border-[var(--border-primary)]"
          >
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
              {label}
            </p>
            <p className="text-3xl font-semibold text-[var(--text-primary)] leading-none">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* 3. Calendar */}
      <section>
        <SectionLabel label="КАЛЕНДАР СЕСІЙ" />
        <ZoomCalendar
          mode="coach"
          userId={expertId ?? 'staff'}
          expertId={expertId ?? undefined}
        />
      </section>

      <section>
        <SectionLabel
          label="АКТИВНІ BATTLES"
          count={displayBattles.length}
          collapsible
          open={battlesOpen}
          onToggle={() => setBattlesOpen((o) => !o)}
          action={
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setInstructionsOpen(true)
              }}
              className="rounded-full border border-[var(--border-primary)] bg-transparent px-2.5 py-1 text-[11px] font-semibold normal-case tracking-normal text-[var(--text-primary)] transition-all hover:bg-[var(--glass-bg-hover)]"
            >
              Правила
            </button>
          }
        />
        {displayBattles.length > 0 && battlesOpen && (
          <div className="flex flex-col gap-2">
            {displayBattles.map((s) => (
              <BattleCard
                key={s.id}
                session={s}
                onFinalize={handleFinalize}
              />
            ))}
          </div>
        )}
      </section>

      {displayLeaderboard.length > 0 && (
        <section>
          <SectionLabel
            label="LEADERBOARD — BATTLE WINS"
            collapsible
            open={leaderboardOpen}
            onToggle={() => setLeaderboardOpen((o) => !o)}
          />
          {leaderboardOpen && (
            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] px-3 py-1">
              {displayLeaderboard.map((e, i) => (
                <LeaderboardRow key={e.userId} entry={e} rank={i} />
              ))}
            </div>
          )}
        </section>
      )}
      {/* 8. Create / edit session form */}
      {canManageZoom && createDate && (
        <section id="coach-create-form">
          <SessionForm
            defaultDate={createDate}
            participants={coachUsers}
            initialValues={createInitialValues}
            onSubmit={handleCreate}
            onClose={() => {
              setCreateDate(null)
              setCreateInitialValues(undefined)
            }}
            isLoading={isCreating}
            title="Нова ZOOM-практика"
          />
        </section>
      )}
      {canManageZoom && editingSessionData && (
        <section id="coach-edit-form">
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
            onClose={() => {
              setEditingSessionId(null)
              setEditingFocus(null)
            }}
            isLoading={isUpdating}
            title="Редагування сесії"
            submitLabel="Зберегти"
            loadingLabel="Збереження..."
            autoFocusZoomLink={editingFocus === 'zoomLink'}
          />
        </section>
      )}

      {instructionsOpen && (
        <BattleInstruction onClose={() => setInstructionsOpen(false)} />
      )}
    </div>
  )
}
