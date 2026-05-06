import { WHEEL_TEXTS } from '@/features/wheel/constants/texts'
import type { WheelInsights } from '@/features/wheel/utils/wheel.utils'

type Props = {
  insights: WheelInsights | null
  onOpenPlan: () => void
  ctaLabel: string
}

export default function AIBlock({ insights, onOpenPlan, ctaLabel }: Props) {
  if (!insights?.weakestSphere) {
    return null
  }

  const isRecoveryMode = insights.recoveryMode.length > 0
  const bulletItems = [
    insights.main.cause,
    insights.main.effect,
    insights.main.risk,
    insights.secondary?.insight ?? '',
  ]
  const bullets = Array.from(new Set(bulletItems.filter(Boolean))).slice(0, 3)

  return (
    <section className="card-surface liquid-glass rounded-2xl p-4 text-sm transition-all duration-200">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
          {WHEEL_TEXTS.analysis.completed}
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(236,72,153,0.10),rgba(59,130,246,0.08))] p-4 transition-all duration-200 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-rose-200 shadow-[0_0_30px_rgba(236,72,153,0.18)]">
            <span className="text-2xl font-semibold leading-none">
              {insights.weakestSphere.score}
            </span>
            <span className="mt-1 text-xs leading-none">{WHEEL_TEXTS.analysis.scoreSuffix}</span>
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-white">
              {insights.weakestSphere.name} — {isRecoveryMode ? WHEEL_TEXTS.analysis.recoveryMode : WHEEL_TEXTS.analysis.criticalZone}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {insights.main.insight}
            </p>
          </div>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5 text-sm text-[var(--text-secondary)]">
        {bullets.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-rose-300">→</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {isRecoveryMode ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-5 text-[var(--text-secondary)] backdrop-blur-xl">
          {WHEEL_TEXTS.analysis.recoveryProgressPrefix}
          <span className="ml-2 text-white">{WHEEL_TEXTS.analysis.recoveryProgressValue}</span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onOpenPlan}
        className="hero-cta-primary mt-3 h-10 w-full rounded-xl text-sm font-medium transition-all duration-200"
        aria-label={ctaLabel}
      >
        {ctaLabel}
      </button>
    </section>
  )
}
