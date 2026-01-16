// useWheelStatus.ts
import { useGetLatestWheelAssessmentQuery } from '@/templates/ai-mentor/services/aiMentor.api'
import { useMemo } from 'react'

export const useWheelStatus = (user_id: string) => {
  const { data: wheel, isLoading, error } = useGetLatestWheelAssessmentQuery(user_id)

  const status = useMemo(() => {
    if (!wheel) {
      return { needsWheel: true, reason: 'never' as const, daysSince: null }
    }

    const created_at = new Date(wheel.created_at)
    const now = new Date()
    const daysSince = Math.floor((now.getTime() - created_at.getTime()) / 86400000)

    if (created_at.getMonth() !== now.getMonth() || created_at.getFullYear() !== now.getFullYear()) {
      return { needsWheel: true, reason: 'monthly' as const, daysSince }
    }

    if (daysSince >= 14) {
      return { needsWheel: false, reason: 'recommended' as const, daysSince }
    }

    return { needsWheel: false, reason: 'recent' as const, daysSince }
  }, [wheel])

  return {
    wheel,
    isLoading,
    error,
    hasWheel: !!wheel,
    ...status,
  }
}
