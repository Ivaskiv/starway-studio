// frontend/src/features/wheel/hooks/useWheel.ts

import { useGetWheelAssessmentQuery, useCreateWheelAssessmentMutation } from '@/features/wheel/services/wheel.api'
import { WheelScore } from '@/features/wheel/types/wheel.types'

export const useWheel = (userId: string) => {
  const { data: assessment, isLoading } = useGetWheelAssessmentQuery(userId)
  const [createAssessment] = useCreateWheelAssessmentMutation()

  const submitScores = async (scores: WheelScore[]) => {
    return await createAssessment({ userId, scores }).unwrap()
  }

  return {
    assessment,
    isLoading,
    submitScores,
  }
}
