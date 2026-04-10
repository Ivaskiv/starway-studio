import { Check } from 'lucide-react'

import type { ContentStudioStep } from '../config/contentStudio.config'
import type { ContentStudioStepDefinition } from '../config/contentStudio.config'

type Props = {
  activeStep: ContentStudioStep
  stepDefinitions: ContentStudioStepDefinition[]
  onSelectStep: (step: ContentStudioStep) => void
}

export function ContentStudioStepRail({ activeStep, stepDefinitions, onSelectStep }: Props) {
  const activeStepIndex = stepDefinitions.findIndex((step) => step.step === activeStep)
  const totalSteps = stepDefinitions.length
  const progress = totalSteps > 0 ? ((activeStepIndex >= 0 ? activeStepIndex + 1 : 0) / totalSteps) * 100 : 0

  return (
    <aside className="min-h-0 overflow-y-auto border-b border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4 lg:border-b-0 lg:border-r">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--text-muted)]">Content Machine</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Технічний flow · {totalSteps} кроків</p>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">
          {activeStep ? `Крок ${activeStep}` : 'Обери крок'}
        </span>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
        <div
          className={`h-full rounded-full transition-all bg-[linear-gradient(90deg,rgba(var(--accent-rgb),1),rgba(103,232,249,0.92))]`}
          style={{ width: `${Math.max(0, progress)}%` }}
        />
      </div>

      <div className="mt-4 space-y-2">
        {stepDefinitions.map((step) => {
          const isActive = activeStep === step.step
          const isGold = step.accent === 'gold'
          return (
            <button
              key={step.step}
              type="button"
              onClick={() => onSelectStep(step.step as ContentStudioStep)}
              className={[
                'flex w-full items-start gap-3 rounded-[18px] border px-3 py-3 text-left transition-colors',
                isActive
                  ? isGold
                    ? 'border-[rgba(250,204,21,0.4)] bg-[rgba(250,204,21,0.1)]'
                    : 'border-[rgba(var(--accent-rgb),0.34)] bg-[rgba(var(--accent-rgb),0.08)]'
                  : isGold
                    ? 'border-[rgba(250,204,21,0.18)] bg-[rgba(250,204,21,0.04)] hover:border-[rgba(250,204,21,0.28)]'
                    : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(var(--accent-rgb),0.18)]',
              ].join(' ')}
            >
              <span
                className={[
                  'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                  isActive
                    ? isGold
                      ? 'border-[rgba(250,204,21,0.4)] bg-[rgba(250,204,21,0.16)] text-[rgb(250,204,21)]'
                      : 'border-[rgba(var(--accent-rgb),0.32)] bg-[rgba(var(--accent-rgb),0.14)] text-[rgb(var(--accent-soft-rgb))]'
                    : 'border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)]',
                ].join(' ')}
              >
                {isActive ? <Check className="h-4 w-4" /> : step.step}
              </span>
              <span className="min-w-0">
                <span className={[
                  'block text-sm font-semibold leading-5',
                  isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                ].join(' ')}>
                  {step.title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{step.subtitle}</span>
              </span>
              {isGold ? (
                <span className="ml-auto rounded-full border border-[rgba(250,204,21,0.2)] bg-[rgba(250,204,21,0.1)] px-2 py-0.5 text-[10px] font-semibold text-[rgb(250,204,21)]">
                  NEW
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
