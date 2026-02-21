import React from 'react';
import { Button } from '@/ui';
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';

interface Props {
  isFirst: boolean;
  isLast: boolean;
  isSubmitting: boolean;
  onPrev: () => void;
  onNext: () => void;
  onCancel?: () => void;
}

export const WheelFooter = React.memo(
  ({ isFirst, isLast, isSubmitting, onPrev, onNext, onCancel }: Props) => (
    <div className="mt-8 pt-6 border-t border-white/10">
      {/* fix code_x: keep "Назад/Далі" with arrows in one visual row, no wrapping. */}
      <div className="flex items-center justify-between gap-3">
      <Button
        onClick={isFirst ? onCancel : onPrev}
        variant="ghost"
        className="whitespace-nowrap border border-white/15 bg-white/[0.02] hover:bg-white/[0.08]"
      >
        <span className="inline-flex items-center gap-2 whitespace-nowrap text-white/85">
          <ChevronLeft className="w-4 h-4" />
          {isFirst ? 'Скасувати' : 'Назад'}
        </span>
      </Button>

      <button
        onClick={onNext}
        disabled={isSubmitting}
        className="inline-flex items-center rounded-xl px-4 py-2 border border-[color:rgba(var(--accent-rgb),0.45)] bg-[color:rgba(var(--accent-rgb),0.24)] hover:bg-[color:rgba(var(--accent-rgb),0.32)] text-white whitespace-nowrap transition-colors disabled:opacity-60"
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <Loader2 className="w-4 h-4 animate-spin" />
            Збереження...
          </span>
        ) : isLast ? (
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <Sparkles className="w-4 h-4" />
            Завершити
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            Далі
            <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </button>
      </div>
    </div>
  ),
);
