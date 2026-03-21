import { useMemo } from 'react'

export interface AutoAd {
  id: string
  name: string
  status: string
}

export function useAutoAdsQuery(userId?: string | null) {
  const data = useMemo<AutoAd[]>(
    () => [{ id: 'ad_01', name: 'Story Booster', status: 'ready' }],
    [],
  )
  return { data: userId ? data : [] }
}
