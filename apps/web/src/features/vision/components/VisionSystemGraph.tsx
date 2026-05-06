import type { WebMapGoal, WebMapSystem } from '@/features/web-map/services/web-map.api'

type VisionSystemGraphProps = {
  system: WebMapSystem | null | undefined
  goals: WebMapGoal[]
}

function pickGoalItems(system: WebMapSystem | null | undefined, goals: WebMapGoal[]) {
  if (system?.goals?.length) return system.goals.slice(0, 4)
  return goals.slice(0, 4)
}

export function VisionSystemGraph({ system, goals }: VisionSystemGraphProps) {
  const items = pickGoalItems(system, goals)
  const centerLabel = system?.identityStatement || system?.statement || 'Твоя система переходу'

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col items-center gap-5">
        <div className="flex w-full justify-center">
          <div className="max-w-[420px] rounded-3xl border border-blue-400/25 bg-blue-500/10 px-5 py-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-blue-200/75">Vision core</p>
            <p className="mt-2 text-base font-semibold text-white">{centerLabel}</p>
          </div>
        </div>

        <div className="h-8 w-px bg-white/10" />

        <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items.map((goal, index) => (
            <div key={`${goal.sphere}-${index}`} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">{goal.sphere}</p>
                <h3 className="mt-2 text-sm font-semibold text-white">{goal.title}</h3>
                <p className="mt-2 text-xs leading-5 text-white/62">
                  {goal.description || 'Системний вузол переходу'}
                </p>

                <div className="mt-4 space-y-3">
                  {goal.factors?.length ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Фактори</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {goal.factors.slice(0, 2).map((item) => (
                          <span key={item} className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/60">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {goal.constraints?.length ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/65">Обмеження</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {goal.constraints.slice(0, 2).map((item) => (
                          <span key={item} className="rounded-full border border-amber-400/20 px-2 py-1 text-[11px] text-amber-200/80">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {goal.solutions?.length ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/65">Рішення</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {goal.solutions.slice(0, 2).map((item) => (
                          <span key={item} className="rounded-full border border-emerald-400/20 px-2 py-1 text-[11px] text-emerald-200/80">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
