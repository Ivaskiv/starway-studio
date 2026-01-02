// packages/frontend/src/components/aIGenerator/StepProgress.tsx

import { Zap, Trophy } from 'lucide-react';

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  remainingAttempts: number;
  totalAttempts: number;
  savedAttempts: number;
}

export default function StepProgress({
  currentStep,
  totalSteps,
  remainingAttempts,
  totalAttempts,
  savedAttempts
}: StepProgressProps) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="glass-card px-4 py-2">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="font-bold text-white">{remainingAttempts}/{totalAttempts}</span>
            </div>
            <p className="text-xs text-slate-400">залишилось</p>
          </div>
          
          {savedAttempts > 0 && currentStep > 0 && (
            <div className="glass-card px-4 py-2 border border-green-500/30">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-green-400" />
                <span className="font-bold text-green-400">+{savedAttempts * 5}</span>
              </div>
              <p className="text-xs text-slate-400">бонус монет</p>
            </div>
          )}
        </div>
      </div>

      {currentStep > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Прогрес</span>
            <span className="text-white font-semibold">{currentStep}/{totalSteps} кроків</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-pink-600 transition-all duration-500"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}