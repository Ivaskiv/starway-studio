import { useMemo } from 'react';

import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types';
import { Button } from '@/ui/Button';

import { GenerationCounter } from './GenerationCounter';
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
}

export const ResultView = ({
  scores,
  generationsUsed,
  maxGenerations,
  isSubmitting,
  onGenerate,
}: ResultViewProps) => {
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
        <p className="text-sm text-white/70">Легенда сфер</p>
        <div className="grid grid-cols-2 gap-2">
          {WHEEL_CATEGORIES.map((category) => (
            <div key={category.id} className="inline-flex items-center gap-2 text-xs text-white/80">
              <span>{category.emoji}</span>
              <span>{category.nameUk}</span>
            </div>
          ))}
        </div>
      </div>

      <GenerationCounter used={generationsUsed} max={maxGenerations} />

      <Button
        onClick={onGenerate}
        loading={isSubmitting}
        fullWidth
        className="h-11"
      >
        Згенерувати результат
      </Button>
    </div>
  );
};
