// features/ai-generator/components/StepCard.tsx

import { Button, GlassCard, Textarea } from '@/ui';
import { Check, RefreshCw, Sparkles } from 'lucide-react';
import type { GenerationAttempt, StepDefinition } from '../../products/types/generator.types';
import { STEP_DEFINITIONS } from '../../products/types/generator.types';

interface StepCardProps {
  stepNumber: number;
  userInput: string;
  onUserInputChange: (value: string) => void;
  onGenerate: () => void;
  onSelectVariant: (attemptId: string) => void;
  remainingAttempts: number;
  attempts: GenerationAttempt[];
  isGenerating: boolean;
}

export default function StepCard({
  stepNumber,
  userInput,
  onUserInputChange,
  onGenerate,
  onSelectVariant,
  remainingAttempts,
  attempts,
  isGenerating,
}: StepCardProps) {
  const stepDef = STEP_DEFINITIONS[stepNumber - 1] as StepDefinition;
  const hasOptions = stepDef?.options && stepDef.options.length > 0;

  if (!stepDef) return null;

  return (
    <GlassCard className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shrink-0">
          <span className="text-xl md:text-2xl font-bold text-white">{stepNumber}</span>
        </div>

        <div className="flex-1">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{stepDef.title}</h2>
          <p className="text-sm md:text-base text-slate-400">{stepDef.description}</p>
        </div>

        <div className="text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-orange-300">{remainingAttempts}</span>
          </div>
        </div>
      </div>

      {/* User Input */}
      <div className="space-y-4 mb-6">
        {hasOptions ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Обери варіант:</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stepDef.options!.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onUserInputChange(option)}
                  className={`
                    p-4 text-left transition-all rounded-xl border
                    ${
                      userInput === option
                        ? 'ring-2 ring-orange-500 bg-slate-800/80 border-orange-500/50'
                        : 'border-white/10 hover:bg-slate-800/50 hover:border-white/20'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                      ${
                        userInput === option
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-slate-600'
                      }
                    `}
                    >
                      {userInput === option && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-white">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Твоя відповідь:</label>
            <Textarea
              value={userInput}
              onChange={e => onUserInputChange(e.target.value)}
              placeholder={stepDef.placeholder}
              rows={4}
              className="w-full"
            />
          </div>
        )}

        <Button
          onClick={onGenerate}
          disabled={!userInput.trim() || remainingAttempts === 0 || isGenerating}
          data-color="orange"
          data-size="lg"
          className="w-full"
        >
          {isGenerating ? (
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

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {attempts.map(attempt => (
              <button
                key={attempt.id}
                type="button"
                onClick={() => onSelectVariant(attempt.id)}
                className={`
                  w-full text-left p-4 rounded-xl border transition-all
                  ${
                    attempt.isSelected
                      ? 'ring-2 ring-green-500 bg-slate-800/80 border-green-500/50'
                      : 'border-white/10 hover:bg-slate-800/50 hover:border-white/20'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                    ${attempt.isSelected ? 'border-green-500 bg-green-500' : 'border-slate-600'}
                  `}
                  >
                    {attempt.isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>

                  <p className="text-sm text-white leading-relaxed flex-1 whitespace-pre-wrap">
                    {attempt.content}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
