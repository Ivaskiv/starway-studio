// features/wheel/hooks/useWheelStatus.ts

import { useMemo } from 'react'
import { useGetLatestWheelQuery } from '../api/wheel.api'

export const useWheelStatus = (userId: string) => {
  const { data: wheel, isLoading, error } = useGetLatestWheelQuery(userId, {
    skip: !userId,
  })

  const status = useMemo(() => {
    if (!wheel) {
      return { needsWheel: true, reason: 'never' as const }
    }

    const wheelDate = new Date(wheel.createdAt)
    const now = new Date()
    const daysSince = Math.floor((now.getTime() - wheelDate.getTime()) / (1000 * 60 * 60 * 24))

    // Потрібно оновити якщо минув місяць
    if (wheelDate.getMonth() !== now.getMonth() || wheelDate.getFullYear() !== now.getFullYear()) {
      return { needsWheel: true, reason: 'monthly' as const, daysSince }
    }

    // Рекомендовано оновити якщо минуло 2+ тижні
    if (daysSince >= 14) {
      return { needsWheel: false, reason: 'recommended' as const, daysSince }
    }

    return { needsWheel: false, reason: 'recent' as const, daysSince }
  }, [wheel])

  return {
    wheel,
    isLoading,
    error,
    ...status,
    hasWheel: !!wheel,
  }
}