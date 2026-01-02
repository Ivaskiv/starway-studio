// packages/frontend/src/components/aIGenerator/StepHeader.tsx

import { RefreshCw } from 'lucide-react';
import { Button } from '@starway/shared/ui';

interface StepHeaderProps {
  icon: string;
  name: string;
  currentStep: number;
  totalSteps: number;
  attempts: number;
  onRegenerate: () => void;
  isGenerating: boolean;
  maxAttempts?: number;
}

export default function StepHeader({
  icon,
  name,
  currentStep,
  totalSteps,
  attempts,
  onRegenerate,
  isGenerating,
  maxAttempts = 3
}: StepHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <h2 className="text-xl font-bold text-white">{name}</h2>
          <p className="text-sm text-slate-400">
            Крок {currentStep + 1}/{totalSteps} • Спроб: {attempts}/{maxAttempts}
          </p>
        </div>
      </div>

      <Button
        onClick={onRegenerate}
        disabled={isGenerating || attempts >= maxAttempts}
        variant="ghost"
        size="sm"
        className="glass-button"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
        Регенерувати
      </Button>
    </div>
  );
}