import WheelChart from '@/features/wheel/components/WheelChart'
import { WHEEL_TEXTS } from '@/features/wheel/constants/texts'
import type { WheelSphere } from '@/features/wheel/types/wheel.types'

type Props = {
  spheres: WheelSphere[]
  activeSphereId: WheelSphere['id'] | null
  onFocusChange: (id: WheelSphere['id'] | null) => void
  avgScore: string
  weakestSphere: WheelSphere | null
  strongest?: WheelSphere
  onRestart: () => void
}

export default function WheelChartSection({
  spheres,
  activeSphereId,
  onFocusChange,
  avgScore,
  weakestSphere,
  strongest,
  onRestart,
}: Props) {
  return (
    <section className="card-surface liquid-glass min-h-0 h-full flex flex-col justify-between rounded-2xl p-5 xl:min-h-[560px]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
            {WHEEL_TEXTS.chart.title}
          </p>
        </div>
        <button
          type="button"
          onClick={onRestart}
          aria-label={WHEEL_TEXTS.chart.restartAria}
          className="glass-button rounded-lg px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          {WHEEL_TEXTS.chart.restart}
        </button>
      </div>

      <WheelChart
        spheres={spheres}
        activeCategoryId={activeSphereId}
        onFocusChange={onFocusChange}
        size={380}
      />

      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="rounded-lg bg-[rgba(245,190,55,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(245,190,55)]">
            {WHEEL_TEXTS.chart.averageScore}
          </span>
          <span className="text-3xl font-semibold text-[var(--text-primary)]">
            {avgScore}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {weakestSphere ? (
            <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-2.5">
              <p className="text-sm font-medium text-white">
                <span className="mr-2 text-base font-semibold text-rose-300">
                  {weakestSphere.score}
                </span>
                {weakestSphere.name} — {WHEEL_TEXTS.chart.criticalZone}
              </p>
              <span className="h-2 w-2 shrink-0 rounded-full bg-rose-400" />
            </div>
          ) : null}
          {strongest ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2.5">
              <p className="text-sm font-medium text-white">
                <span className="mr-2 text-base font-semibold text-emerald-300">
                  {strongest.score}
                </span>
                {strongest.name} — {WHEEL_TEXTS.chart.strongSphere}
              </p>
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
