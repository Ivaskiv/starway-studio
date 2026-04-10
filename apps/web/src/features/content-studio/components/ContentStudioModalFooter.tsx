export function ContentStudioModalFooter({
  activeStep,
  totalSteps,
  subtitle,
  instruction,
  onPrev,
  onNext,
  nextDisabled,
  nextLabel,
  progressClassName,
  progressTone = 'default',
}: {
  activeStep: number
  totalSteps: number
  subtitle?: string
  instruction?: string
  onPrev: () => void
  onNext: () => void
  nextDisabled?: boolean
  nextLabel: string
  progressClassName: string
  progressTone?: 'default' | 'gold'
}) {
  const progressGradient = progressTone === 'gold'
    ? 'bg-[linear-gradient(90deg,rgba(250,204,21,1),rgba(245,158,11,0.95))]'
    : 'bg-[linear-gradient(90deg,rgba(var(--accent-rgb),1),rgba(103,232,249,0.92))]'

  return (
    <div className="border-t border-[var(--border)] pt-3.5">
      <div className="mb-3 h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
        <div className={`h-full rounded-full transition-all ${progressGradient} ${progressClassName}`} />
      </div>
      <div className="mb-3">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
          {subtitle}
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          {instruction}
        </p>
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={activeStep === 1}
          className="rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-40"
        >
          ← Назад
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="btn-liquid-dashboard btn-liquid-dashboard--primary rounded-[18px] px-4 py-2 disabled:opacity-50"
        >
          {activeStep === totalSteps ? nextLabel : 'Далі →'}
        </button>
      </div>
    </div>
  )
}
