// features/funnels/components/FunnelStepCard.tsx

import { Button, GlassCard, Textarea } from '@/ui'
import { Check, RefreshCw, Sparkles } from 'lucide-react'
import type { FunnelAttempt, FunnelStepDefinition } from '../types/funnel.types'

interface Props {
  step: FunnelStepDefinition
  userInput: string
  onInputChange: (value: string) => void
  onGenerate: () => void
  attempts: FunnelAttempt[]
  remainingAttempts: number
  onSelectVariant: (id: string) => void
  isGenerating: boolean
}

export function FunnelStepCard({
  step,
  userInput,
  onInputChange,
  onGenerate,
  attempts,
  remainingAttempts,
  onSelectVariant,
  isGenerating,
}: Props) {
  const can_generate = userInput.trim() && remainingAttempts > 0 && !isGenerating

  return (
    <GlassCard className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg">
          <span className="text-2xl font-bold text-white">{step.order}</span>
        </div>
        <div className="flex-1">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1">{step.title}</h2>
          <p className="text-slate-400">{step.description}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-purple-300">{remainingAttempts}</span>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-4 mb-6">
        {step.options ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {step.options.map((opt) => (
              <button
                key={opt}
                onClick={() => onInputChange(opt)}
                className={`p-4 rounded-xl text-left transition-all ${
                  userInput === opt
                    ? 'ring-2 ring-orange-500 bg-slate-800/80'
                    : 'glass-card hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    userInput === opt ? 'border-orange-500 bg-orange-500' : 'border-slate-600'
                  }`}>
                    {userInput === opt && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-white text-sm">{opt}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Textarea
            value={userInput}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={step.placeholder || 'Введи відповідь...'}
            rows={4}
            className="w-full"
          />
        )}

        <Button
          onClick={onGenerate}
          disabled={!can_generate}
          data-color="purple"
          data-size="lg"
          className="w-full"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Генерація...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Згенерувати ({remainingAttempts})
            </>
          )}
        </Button>
      </div>

      {/* Variants */}
      {attempts.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white">AI-варіанти</h3>
            <span className="text-xs text-slate-400">{attempts.length} згенеровано</span>
          </div>
          
          <div className="space-y-3">
            {attempts.map((attempt) => (
              <Button
                key={attempt.id}
                onClick={() => onSelectVariant(attempt.id)}
                className={`w-full text-left p-4 rounded-xl transition-all ${
                  attempt.isSelected
                    ? 'ring-2 ring-green-500 bg-slate-800/80'
                    : 'glass-card hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    attempt.isSelected ? 'border-green-500 bg-green-500' : 'border-slate-600'
                  }`}>
                    {attempt.isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <p className="text-sm text-white leading-relaxed">{attempt.content}</p>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  )
}