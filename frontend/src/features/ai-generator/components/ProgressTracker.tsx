// frontend/src/features/ai-generator/components/ProgressTracker.tsx
import { GlassCard } from '@/ui';
import { Check, Sparkles, Zap } from 'lucide-react';
import { TOTAL_STEPS } from '@/features/ai-generator/types/wizard.types';

interface ProgressTrackerProps {
  currentStep: number;
  completedSteps: number[];
  remainingAttempts: number;
  totalAttemptsUsed: number;
}

export default function ProgressTracker({
  currentStep,
  completedSteps,
  remainingAttempts,
  totalAttemptsUsed,
}: ProgressTrackerProps) {
  const progress = Math.round((completedSteps.length / TOTAL_STEPS) * 100);
  const progressClass = `w-[${progress}%]`;

  return (
    <GlassCard className="p-6" data-hover="lift">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Залишилось спроб</p>
            <p className="text-2xl font-bold text-white">{remainingAttempts}</p>
          </div>
        </div>

        {totalAttemptsUsed > 0 && (
          <div className="text-right">
            <p className="text-sm text-slate-400">Використано</p>
            <p className="text-lg font-semibold text-orange-400">{totalAttemptsUsed}</p>
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Прогрес воронки</span>
          <span className="text-white font-semibold">
            {completedSteps.length}/{TOTAL_STEPS}
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressClass} bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-500`}
          />
        </div>
      </div>

      <div className="grid grid-cols-11 gap-1">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const stepNum = i + 1;
          const isCompleted = completedSteps.includes(stepNum);
          const isCurrent = currentStep === stepNum;

          return (
            <div
              key={stepNum}
              className={`h-8 rounded-lg flex items-center justify-center text-xs font-bold
                ${
                  isCompleted
                    ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                    : isCurrent
                      ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white ring-2 ring-orange-400'
                      : 'bg-slate-800 text-slate-500'
                }`}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
            </div>
          );
        })}
      </div>

      {remainingAttempts > 0 && completedSteps.length > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30">
          <p className="text-xs text-green-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Невикористані спроби переходять на наступний крок
          </p>
        </div>
      )}
    </GlassCard>
  );
}
