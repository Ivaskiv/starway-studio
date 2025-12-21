// src/features/funnel/components/FunnelLeftMap.tsx
import React from 'react'
import { DEMO_FUNNEL_STEPS } from '../data/demoFunnelTemplate'
import { FunnelStep } from '@starway/shared'
import { Button } from '@/components/ui'

type FunnelLeftMapProps = {
  onAddStep?: (step: FunnelStep) => void
}

export default function FunnelLeftMap({ onAddStep }: FunnelLeftMapProps) {
  return (
    <aside className="space-y-4">
      {DEMO_FUNNEL_STEPS.map(step => (
        <div
          key={step.id}
          className="border border-gray-800 rounded-xl p-4 bg-gray-900/60"
        >
          <div className="text-xs text-purple-400">
            {step.order}. {step.phase}
          </div>
          <div className="font-semibold">{step.title}</div>
          <p className="text-sm text-gray-400">{step.description}</p>
          {onAddStep && (
            <Button
              onClick={() => onAddStep(step)}
              className="mt-2 px-3 py-1 bg-purple-600 rounded text-xs"
            >
              Клонувати
            </Button>
          )}
        </div>
      ))}
    </aside>
  )
}
