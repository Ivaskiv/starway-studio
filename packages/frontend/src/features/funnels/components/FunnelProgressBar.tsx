// features/funnels/components/FunnelProgressBar.tsx

import { Check } from 'lucide-react'
import { STEP_DEFINITIONS } from '../types/funnel.types'
import { Button } from '@/ui'

interface Props {
  currentStep: number
  completedSteps: number[]
  totalSteps: number
  onStepClick: (step: number) => void
}

export function FunnelProgressBar({ currentStep, completedSteps, totalSteps, onStepClick }: Props) {
  const progress = Math.round((completedSteps.length / totalSteps) * 100)

  return (
    <div className="glass-card p-6">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">Прогрес</span>
          <span className="text-white font-medium">{completedSteps.length}/{totalSteps}</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-8 gap-1">
        {STEP_DEFINITIONS.map((def) => {
          const isCompleted = completedSteps.includes(def.order)
          const isCurrent = currentStep === def.order
          const isClickable = isCompleted || def.order <= currentStep

          return (
            <Button
              key={def.order}
              onClick={() => isClickable && onStepClick(def.order)}
              disabled={!isClickable}
              className={`
                h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all
                ${isCompleted
                  ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                  : isCurrent
                    ? 'bg-gradient-to-br from-orange-500 to-pink-500 text-white ring-2 ring-orange-400'
                    : 'bg-slate-800 text-slate-500'
                }
                ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}
              `}
              title={def.title}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : def.order}
            </Button>
          )
        })}
      </div>
    </div>
  )
}