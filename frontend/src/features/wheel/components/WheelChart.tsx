import { useMemo } from 'react';

import { BalanceWheel } from './BalanceWheel';

interface WheelChartProps {
  scores: Array<{
    categoryId: string;
    score: number | null;
    comment?: string;
  }>;
  size?: number;
}

export const WheelChart = ({ scores, size = 300 }: WheelChartProps) => {
  const normalized = useMemo(
    () =>
      scores.map((item) => ({
        categoryId: item.categoryId,
        score: item.score ?? 1,
        comment: item.comment,
      })),
    [scores],
  );

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <BalanceWheel scores={normalized} size={size} />
    </div>
  );
};
