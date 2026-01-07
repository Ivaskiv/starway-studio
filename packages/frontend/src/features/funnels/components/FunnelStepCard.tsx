// packages/frontend/src/features/funnels/components/FunnelStepCard.tsx

import { Sparkles, RefreshCw, Check } from 'lucide-react'
import { Button, GlassCard, Textarea } from '@/ui'
import { Props, type FunnelStepDefinition } from '@/features/funnels/types/funnel.types'
import { useGenerateFunnelVariantsMutation } from '@/services'

export function FunnelStepCard({
  step,
  userInput,
  onUserInputChange,
  onGenerate,
  remainingAttempts,
  attempts,
  onSelectVariant,
  isGenerating = false,
}: Props) {
  const [generateVariants, { isLoading: isMutationLoading }] = useGenerateFunnelVariantsMutation()

  const isLoading = isGenerating || isMutationLoading
  const canGenerate = !!userInput.trim() && remainingAttempts > 0 && !isLoading

  const handleGenerate = async () => {
    if (!canGenerate) return

    try {
      const res = await generateVariants({
        stepNumber: step.order,
        userInput: userInput.trim(),
        context: {},
      }).unwrap()

      if (res.variants?.length) {
        onGenerate(res.variants)
      }
    } catch (err) {
      console.error('Помилка генерації варіантів:', err)
    }
  }

  return (
    <GlassCard className="p-6 md:p-8" data-hover="lift">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg flex-shrink-0">
          <span className="text-xl md:text-2xl font-bold text-white">{step.order}</span>
        </div>
        <div className="flex-1">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{step.title}</h2>
          <p className="text-sm md:text-base text-slate-400">{step.description}</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-purple-300">{remainingAttempts}</span>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-6 mb-6">
        {step.options && step.options.length > 0 ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Обери варіант:</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {step.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onUserInputChange(option)}
                  className={`
                    glass-card p-4 text-left transition-all rounded-xl text-sm
                    ${userInput === option
                      ? 'ring-2 ring-purple-500 bg-slate-800/80'
                      : 'hover:bg-slate-800/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        ${userInput === option
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-slate-600'
                        }
                      `}
                    >
                      {userInput === option && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-white">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Твоя відповідь:
            </label>
            <Textarea
              value={userInput}
              onChange={(e) => onUserInputChange(e.target.value)}
              placeholder={step.placeholder ?? 'Введи свою відповідь...'}
              rows={step.rows ?? 4} // можна задати rows у типі FunnelStepDefinition
              className="glass-field w-full resize-none"
            />
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          data-color="purple"
          data-size="lg"
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              AI генерує варіанти...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Згенерувати варіанти ({remainingAttempts} спроб)
            </>
          )}
        </Button>
      </div>

      {/* Generated Variants */}
      {attempts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">AI-варіанти</h3>
            <span className="text-xs text-slate-400">{attempts.length} згенеровано</span>
          </div>
          <div className="space-y-3">
            {attempts.map((attempt) => (
              <button
                key={attempt.id}
                type="button"
                onClick={() => onSelectVariant(attempt.id)}
                className={`
                  w-full text-left glass-card p-4 cursor-pointer transition-all rounded-xl
                  ${attempt.isSelected
                    ? 'ring-2 ring-green-500 bg-slate-800/80'
                    : 'hover:bg-slate-800/50'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                      ${attempt.isSelected ? 'border-green-500 bg-green-500' : 'border-slate-600'}
                    `}
                  >
                    {attempt.isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <p className="text-sm text-white leading-relaxed flex-1">
                    {attempt.content}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  )
}
