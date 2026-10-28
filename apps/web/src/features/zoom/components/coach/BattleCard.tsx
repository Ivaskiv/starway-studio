import { useEffect, useRef } from 'react'
import { Crosshair } from 'lucide-react'
import { getBattleDayLabel, getBattleGoal } from './coachPanelPresentation'
import type { BattleSession, BattleOutcome } from './coachPanelPresentation'

const BATTLE_STATUS_LABELS: Record<string, string> = {
  pending: 'Очікує підтвердження',
  active: 'Активний',
  completed: 'Завершено',
  cancelled: 'Скасовано',
}

// ── BattleCard ────────────────────────────────────────────────────────────────

export function BattleCard({
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
