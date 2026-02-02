// frontend/src/features/wheel/components/WheelHistory.tsx
import React from 'react';
import type { WheelAssessment } from '@/features/wheel/types/wheel.types';
import { format } from 'date-fns';
import { useGetWheelAssessmentsQuery } from '@/features/wheel/services/wheel.api';

interface WheelHistoryProps {
  userId: string;
  onSelect?: (assessment: WheelAssessment) => void;
}

export const WheelHistory: React.FC<WheelHistoryProps> = ({ userId, onSelect }) => {
  const { data: assessments, isLoading, isError } = useGetWheelAssessmentsQuery(userId);

  if (isLoading)
    return <div className="p-4 text-center text-white/70">Завантаження...</div>;

  if (isError)
    return <div className="p-4 text-center text-red-500">Помилка завантаження</div>;

  if (!assessments || assessments.length === 0)
    return <div className="p-4 text-center text-white/60">Немає історії оцінок</div>;

  return (
    <div className="p-4 rounded-2xl glassmorphism shadow-lg flex flex-col gap-3">
      <h2 className="text-xl font-bold text-white">Історія Колеса Балансу</h2>
      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
        {assessments.map(a => (
          <div
            key={a.id}
            onClick={() => onSelect?.(a)}
            className="cursor-pointer p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex justify-between items-center"
          >
            <div>
              <div className="text-sm text-white/80">
                {format(new Date(a.completedAt), 'dd.MM.yyyy HH:mm')}
              </div>
              <div className="text-white font-medium">
                Середній бал: {Math.round(a.averageScore)}
              </div>
            </div>
            <div className="text-white/50 text-sm">{a.scores.length} сфер</div>
          </div>
        ))}
      </div>
    </div>
  );
};
