import type { ReactNode } from 'react'
import { Check, X } from 'lucide-react'

import { getProgressWidthClass } from '../utils/contentTransforms'
import type { ContentStudioStep } from '../config/contentStudio.config'
import { SECTION_EYEBROW_CLASS, type ContentStudioStepDefinition } from '../config/contentStudio.config'
import { ContentStudioModalFooter } from './ContentStudioModalFooter'

type Props = {
  activeStep: ContentStudioStep
  itemsCount: number
  stepDefinitions: ContentStudioStepDefinition[]
  onClose: () => void
  onSelectStep: (step: ContentStudioStep) => void
  onPrev: () => void
  onNext: () => void
  nextDisabled?: boolean
  nextLabel?: string
  progressTone?: 'default' | 'gold'
  children: ReactNode
}

export function ContentStudioStepModal({
  activeStep,
  itemsCount,
  stepDefinitions,
  onClose,
  onSelectStep,
  onPrev,
  onNext,
  nextDisabled,
  nextLabel,
  progressTone = 'default',
  children,
}: Props) {
  const currentStep = stepDefinitions.find((step) => step.step === activeStep)
  const currentStepIndex = stepDefinitions.findIndex((step) => step.step === activeStep)
  const totalSteps = stepDefinitions.length
  const isLastStep = currentStepIndex >= 0 && currentStepIndex === totalSteps - 1
  const footerNextLabel = nextLabel ?? (isLastStep ? 'Готово' : 'Далі →')
  const isGoldStep = currentStep?.accent === 'gold'

  return (
    <div className="fixed inset-0 z-[81] flex items-start justify-center bg-black/80 px-4 py-6">
      <div className="dashboard-liquid-card relative flex max-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-[var(--border)]">
        <div className="dashboard-liquid-edge--top flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <span className={[
                'rounded-full border px-3 py-1 text-xs font-semibold',
                isGoldStep
                  ? 'border-[rgba(250,204,21,0.28)] bg-[rgba(250,204,21,0.12)] text-[rgb(250,204,21)]'
                  : 'border-[rgba(var(--accent-rgb),0.22)] bg-[rgba(var(--accent-rgb),0.12)] text-[rgb(var(--accent-soft-rgb))]',
              ].join(' ')}>
                Крок {activeStep} · {totalSteps}
              </span>
              <p className={SECTION_EYEBROW_CLASS}>Content Machine</p>
            </div>
            <h3 className={[
              'mt-3 text-[1.35rem] font-semibold',
              isGoldStep ? 'text-[rgb(250,204,21)]' : 'text-[var(--text-primary)]',
            ].join(' ')}>
              {`Крок ${activeStep} · ${currentStep?.heading ?? currentStep?.title ?? ''}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            aria-label="Закрити Content Machine step"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)]">
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
                className={`h-full rounded-full transition-all ${progressTone === 'gold' ? 'bg-[linear-gradient(90deg,rgba(250,204,21,1),rgba(245,158,11,0.95))]' : 'bg-[linear-gradient(90deg,rgba(var(--accent-rgb),1),rgba(103,232,249,0.92))]'}`}
                style={{ width: `${Math.max(0, ((currentStepIndex + 1) / totalSteps) * 100)}%` }}
              />
            </div>

            <div className="mt-4 space-y-2">
              {stepDefinitions.map((step) => {
                const isActive = activeStep === step.step
                const isPast = currentStepIndex >= 0 && step.step < activeStep
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
                          : isPast
                            ? 'border-emerald-400/24 bg-emerald-500/10 text-emerald-300'
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

          <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            {children}
            <ContentStudioModalFooter
              activeStep={activeStep}
              totalSteps={totalSteps}
              subtitle={currentStep?.subtitle}
              instruction={currentStep?.instruction}
              progressClassName={getProgressWidthClass(((currentStepIndex + 1) / totalSteps) * 100)}
              progressTone={progressTone}
              onPrev={onPrev}
              onNext={onNext}
              nextDisabled={nextDisabled ?? (isLastStep && itemsCount === 0)}
              nextLabel={isLastStep ? (itemsCount === 0 ? 'Спочатку згенеруй пакет' : footerNextLabel) : footerNextLabel}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
