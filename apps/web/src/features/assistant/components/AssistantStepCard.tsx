import { CheckCircle2, Lock, Sparkles } from 'lucide-react'
import type { AssistantStep } from '../types/assistant.types'

interface Props {
  step: AssistantStep
  onAction?: (step: AssistantStep) => void
}

const iconMap = {
  locked: Lock,
  ready: Sparkles,
  completed: CheckCircle2,
} as const

export function AssistantStepCard({ step, onAction }: Props) {
  const Icon = iconMap[step.status]
  const isReady = step.status === 'ready'
  const isCompleted = step.status === 'completed'

  return (
    <article
      className={
        `liquid-glass rounded-2xl p-5 space-y-3 border shadow-lg transition-all duration-200
          ${isCompleted ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10'}
          ${isReady ? 'ring-2 ring-offset-2 ring-[rgba(var(--accent-rgb),0.35)] shadow-[0_25px_55px_rgba(99,102,241,.18)]' : ''}`
      }
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
            {step.id}
          </span>
          <div>
            <p className="text-sm text-white/70">Крок {step.id}</p>
            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
          </div>
        </div>
        <Icon className={`h-6 w-6 ${isCompleted ? 'text-emerald-400' : isReady ? 'text-[var(--accent)]' : 'text-white/40'}`} />
      </div>

      <p className="text-sm text-white/70">{step.description}</p>

      {step.ctaLabel && (
        <button
          type="button"
          className={`btn-primary w-full rounded-xl text-sm ${isReady ? '' : 'opacity-50 cursor-not-allowed'}`}
          onClick={() => onAction?.(step)}
          disabled={!isReady}
        >
          {step.ctaLabel}
        </button>
      )}
    </article>
  )
}
