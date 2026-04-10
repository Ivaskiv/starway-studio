type ContentStudioStepNavItem = {
  step: number
  title: string
  accent?: 'gold'
}

export function ContentStudioStepNav({
  steps,
  activeStep,
  onSelect,
}: {
  steps: ContentStudioStepNavItem[]
  activeStep: number
  onSelect: (step: number) => void
}) {
  return (
    <div className="border-b border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-3 py-2">
      <div className="overflow-x-auto overflow-y-visible pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-1.5">
        {steps.map((step) => (
          <button
            type="button"
            key={step.step}
            onClick={() => onSelect(step.step)}
            className={[
              'inline-flex shrink-0 items-center gap-2 rounded-[14px] px-2 py-1 text-left',
              step.accent === 'gold' ? 'animate-hook-pop' : '',
              step.accent === 'gold' ? 'bg-[rgba(250,204,21,0.08)]' : '',
            ].join(' ')}
          >
            <span
              className={[
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold transition-colors',
                step.accent === 'gold' && activeStep !== step.step
                  ? 'border-[rgba(250,204,21,0.34)] bg-[rgba(250,204,21,0.12)] text-[rgb(250,204,21)]'
                  : activeStep === step.step
                    ? step.accent === 'gold'
                      ? 'border-[rgba(250,204,21,0.46)] bg-[rgba(250,204,21,0.18)] text-[rgb(250,204,21)]'
                      : 'border-[rgba(var(--accent-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.16)] text-[rgb(var(--accent-soft-rgb))]'
                    : step.step < activeStep
                    ? 'border-emerald-400/28 bg-emerald-500/10 text-emerald-300'
                    : 'border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)]',
              ].join(' ')}
            >
              {step.step < activeStep ? '✓' : step.step}
            </span>
            <span
              className={activeStep === step.step
                ? 'min-w-0 text-[14px] font-semibold leading-[1.15] text-[var(--text-primary)]'
                : 'min-w-0 text-[14px] font-medium leading-[1.15] text-[var(--text-muted)]'}
            >
              {step.title}
            </span>
            {step.accent === 'gold' ? (
              <span className="rounded-full border border-[rgba(250,204,21,0.2)] bg-[rgba(250,204,21,0.1)] px-2 py-0.5 text-[10px] font-semibold text-[rgb(250,204,21)]">
                NEW
              </span>
            ) : null}
            {step.step !== steps[steps.length - 1]?.step ? (
              <span className="ml-0.5 text-[13px] text-[var(--text-muted)]">›</span>
            ) : null}
          </button>
        ))}
      </div>
      </div>
    </div>
  )
}
