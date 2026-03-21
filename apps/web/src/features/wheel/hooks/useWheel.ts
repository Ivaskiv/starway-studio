// frontend/src/features/wheel/hooks/useWheel.ts
import { useCreateWheelAssessmentMutation, useGetLatestWheelAssessmentQuery } from '@/features/wheel/api';
import { WheelScore } from '../types/wheel.types';

export const useWheel = (userId: string) => {
  const { data: latest, isLoading } = useGetLatestWheelAssessmentQuery(userId, {
    skip: !userId,
  });
  const [createWheel] = useCreateWheelAssessmentMutation();

  const submitWheel = async (scores: WheelScore[]) => {
    return await createWheel({ userId, scores }).unwrap();
  };

  return { latest, isLoading, submitWheel };
};
