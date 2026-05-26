type UnifiedDailyJourneyStepStatus = 'done' | 'active' | 'locked'

export type UnifiedDailyJourneyStep = {
  id: string
  title: string
  description: string
  xp?: number
  status: UnifiedDailyJourneyStepStatus
  statusLabel?: string
  onClick: () => void
}

type Props = {
  dateLabel: string
  displayName: string
  streakCount: number
  totalXp: number
  trialLabel: string
  currentDay: number
  totalDays: number
  daysLeft: number
  steps: UnifiedDailyJourneyStep[]
}

const TRIAL_PROGRESS_WIDTH_CLASS: Record<number, string> = {
  0: 'w-0',
  1: 'w-[17%]',
  2: 'w-[33%]',
  3: 'w-[50%]',
  4: 'w-[67%]',
  5: 'w-[83%]',
  6: 'w-[91%]',
  7: 'w-full',
}

const STEP_ICON_CLASS: Record<UnifiedDailyJourneyStepStatus, string> = {
  done: 'border-[rgba(74,222,128,.3)] bg-[rgba(74,222,128,.1)] text-[#4ade80]',
  active: 'border-[rgba(99,160,255,.32)] bg-[rgba(99,160,255,.1)] text-[#63a0ff]',
  locked: 'border-white/7 bg-white/[0.03] text-white/20',
}

const STEP_TEXT_CLASS: Record<UnifiedDailyJourneyStepStatus, string> = {
  done: 'text-white',
  active: 'text-[#93c5fd]',
  locked: 'text-white/55',
}

const STEP_STATUS_CLASS: Record<UnifiedDailyJourneyStepStatus, string> = {
  done: 'text-[#4ade80]',
  active: 'text-[#93c5fd]',
  locked: 'text-white/35',
}

export default function UnifiedDailyJourneyCard({
  dateLabel,
  displayName,
  streakCount,
  totalXp,
  trialLabel,
  currentDay,
  totalDays,
  daysLeft,
  steps,
}: Props) {
  const clampedDay = Math.max(1, Math.min(totalDays, currentDay))
  const doneDays = Math.max(0, clampedDay - 1)
  const progressWidthClass = TRIAL_PROGRESS_WIDTH_CLASS[clampedDay] ?? 'w-0'

  return (
    <section className="rounded-[14px] border border-white/7 bg-[#111d30] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] text-white/30">{dateLabel}</p>
          <h1 className="mt-0.5 text-[19px] font-medium text-white">{displayName}</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(251,113,33,.35)] bg-[rgba(251,113,33,.08)] px-3 py-1.5 text-[11px] font-medium text-[#fb923c]">
            🔥 {streakCount} дні
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(99,160,255,.3)] bg-[rgba(99,160,255,.08)] px-3 py-1.5 text-[11px] font-medium text-[#7eb3ff]">
            ✦ {totalXp} XP
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(251,191,36,.35)] bg-[rgba(251,191,36,.08)] px-3 py-1.5 text-[11px] font-medium text-[#fbbf24]">
            {trialLabel}
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-white/7 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-white">Твій старт у Starway</span>
          <span className="rounded-full border border-[rgba(251,191,36,.28)] bg-[rgba(251,191,36,.08)] px-2.5 py-0.5 text-xs font-medium text-[#fbbf24]">
            Trial · день {clampedDay} з {totalDays}
          </span>
        </div>

        <div className="mb-1 h-1 rounded-full bg-white/10">
          <div className={['h-full rounded-full bg-[#4ade80]', progressWidthClass].join(' ')} />
        </div>
        <div className="mb-4 flex justify-between text-[11px] text-white/40">
          <span>{doneDays} дні пройдено</span>
          <span>{daysLeft} залишилось</span>
        </div>

        <div className="space-y-1">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={step.onClick}
              className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.04]"
            >
              <div className={['flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-medium', STEP_ICON_CLASS[step.status]].join(' ')}>
                {step.status === 'done' ? '✓' : step.status === 'locked' ? '🔒' : index + 1}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className={['truncate text-[13px] font-medium', STEP_TEXT_CLASS[step.status]].join(' ')}>
                    {step.title}
                  </div>
                  <div className="flex items-center gap-3">
                    {typeof step.xp === 'number' ? (
                      <span className="text-[11px] font-medium text-[#7eb3ff]">+{step.xp} XP</span>
                    ) : null}
                    <span className={['text-[11px] font-medium', STEP_STATUS_CLASS[step.status]].join(' ')}>
                      {step.statusLabel ?? (step.status === 'done' ? '✔' : step.status === 'active' ? 'Зараз' : '—')}
                    </span>
                  </div>
                </div>
                <div className="mt-0.5 truncate text-[11px] text-white/35">{step.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
