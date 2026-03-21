import { useMemo } from 'react';

import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types';
import { Button } from '@/ui/Button';

import { WheelChart } from './WheelChart';

interface ResultViewProps {
  scores: Array<{
    categoryId: string;
    score: number | null;
    comment: string;
  }>;
  generationsUsed: number;
  maxGenerations: number;
  isSubmitting: boolean;
  onGenerate: () => void;
  nextWheelAvailable?: Date;
}

export const ResultView = ({
  scores,
  generationsUsed,
  maxGenerations,
  isSubmitting,
  onGenerate,
  nextWheelAvailable,
}: ResultViewProps) => {
  const fillCompleted = scores.every((item) => typeof item.score === 'number' && item.score > 0);

  const summary = useMemo(() => {
    const normalized = scores.map((item) => ({ ...item, score: item.score ?? 1 }));
    const weakest = normalized.reduce((min, item) => (item.score < min.score ? item : min), normalized[0]);
    const strongest = normalized.reduce((max, item) => (item.score > max.score ? item : max), normalized[0]);
    const weakestCategory = WHEEL_CATEGORIES.find((item) => item.id === weakest.categoryId);
    const strongestCategory = WHEEL_CATEGORIES.find((item) => item.id === strongest.categoryId);

    return {
      weakestLabel: weakestCategory?.nameUk ?? weakest.categoryId,
      strongestLabel: strongestCategory?.nameUk ?? strongest.categoryId,
      analysis: `Найбільше навантаження зараз у сфері "${weakestCategory?.nameUk ?? weakest.categoryId}". Найсильніша опора — "${strongestCategory?.nameUk ?? strongest.categoryId}".`,
    };
  }, [scores]);

  return (
    <div className="space-y-4">
      <WheelChart scores={scores} size={320} />

      <div className="rounded-xl border border-[color:rgba(var(--glass-border-rgb),0.24)] bg-[color:rgba(var(--ambient-rgb-2),0.34)] p-4">
        <p className="text-sm text-white/70">
          Слабша сфера: <span className="font-semibold text-white">{summary.weakestLabel}</span>
        </p>
        <p className="text-sm text-white/70">
          Сильніша сфера: <span className="font-semibold text-white">{summary.strongestLabel}</span>
        </p>
        <p className="mt-2 text-sm text-white/85">{summary.analysis}</p>
      </div>

      <div className="space-y-2 rounded-xl border border-[color:rgba(var(--glass-border-rgb),0.24)] bg-[color:rgba(var(--ambient-rgb-2),0.34)] p-4">
        {WHEEL_CATEGORIES.map((category) => (
          <div key={category.id} className="flex items-center justify-between text-xs text-white/70">
            <span className="inline-flex items-center gap-2">
              <span>{category.emoji}</span>
              {category.nameUk}
            </span>
            <span className="text-white/40">{category.description}</span>
          </div>
        ))}
      </div>

      {generationsUsed >= maxGenerations ? (
        nextWheelAvailable ? (
          <p className="text-center text-xs text-white/60">
            Наступна генерація буде доступна {nextWheelAvailable.toLocaleDateString('uk')}
          </p>
        ) : null
      ) : (
        <Button
          onClick={onGenerate}
          loading={isSubmitting}
          fullWidth
          className="h-11 flex items-center justify-center gap-3 bg-[var(--accent)] shadow-[0_10px_25px_rgba(var(--accent-rgb),0.35)] transition-all hover:scale-[1.01]"
        >
          <span className="relative">
            <span>
              {fillCompleted ? 'Зберегти' : generationsUsed === 0 ? 'Заповнити' : 'Перегенерувати'}
            </span>
            <span
              className="
              badge-notification 
              absolute 
              -top-2 
              right-[-12px] 
              inline-flex 
              h-16 
              w-16 
              items-center 
              justify-center 
              rounded-full 
              border 
              border-white/40 
              text-[10px] font-semibold text-white shadow-[0_4px_14px_rgba(var(--accent-rgb),0.55)]"
              aria-label={`Генерація ${generationsUsed + 1} з ${maxGenerations}`}
            >
              {generationsUsed + 1}/{maxGenerations}
            </span>
          </span>
        </Button>
      )}
    </div>
  );
};
