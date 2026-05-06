import type { NavigateFunction } from 'react-router-dom'

type DailyCycleUnavailableStateProps = {
  embedded: boolean
  title: string
  description: string
  buttonLabel: string
  onAction: () => void
  summaryTitle?: string
  summaryText?: string
}

export function DailyCycleUnavailableState({
  embedded,
  title,
  description,
  buttonLabel,
  onAction,
  summaryTitle,
  summaryText,
}: DailyCycleUnavailableStateProps) {
  return (
    <div className={embedded ? 'p-4' : 'flex min-h-[60vh] flex-col items-center justify-center p-6'}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="bg-[var(--accent-bg,var(--bg-secondary))] p-5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--accent-soft-rgb))]">
            ЩОДЕННИЙ ЦИКЛ
          </p>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
        </div>
        <div className="space-y-3 p-4">
          {summaryTitle && summaryText ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">
                {summaryTitle}
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {summaryText}
              </p>
            </div>
          ) : null}
          <button
            type="button"
            className="hero-cta-primary w-full py-3 text-sm font-medium"
            onClick={onAction}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function openDashboardRoute(navigate: NavigateFunction, path: string) {
  navigate(path)
}
