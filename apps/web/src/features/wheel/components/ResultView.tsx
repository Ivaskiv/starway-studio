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
  const generationsLeft = Math.max(0, maxGenerations - generationsUsed);

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
          <span>
            {fillCompleted ? 'Зберегти' : generationsUsed === 0 ? 'Заповнити' : 'Перегенерувати'}
          </span>
          <span className="inline-flex min-w-[38px] items-center justify-center rounded-full border border-[rgba(255,255,255,0.24)] bg-[rgba(255,255,255,0.12)] px-2 py-0.5 text-[11px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
            {generationsLeft}/{maxGenerations}
          </span>
        </Button>
      )}
    </div>
  );
};
