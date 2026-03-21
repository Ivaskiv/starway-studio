// frontend/src/features/wheel/hooks/useWheelAnalysis.ts

import { useGetWheelAnalysisQuery } from '@/features/wheel/api';

export const useWheelAnalysis = (userId: string) => {
  const { data, isLoading } = useGetWheelAnalysisQuery(userId);

  const generateMicroTasks = () => {
    if (!data) return [];
    return data.gaps.map(gap => ({
      title: `Працюй над ${gap.nameUk}`,
      description: `Покращуй сферу ${gap.nameUk}`,
      type: 'actionable',
      source: 'wheel',
      status: 'PENDING',
      relatedEntity: { type: 'wheel', id: gap.id },
    }));
  };

  return { analysis: data, isLoading, generateMicroTasks };
};
