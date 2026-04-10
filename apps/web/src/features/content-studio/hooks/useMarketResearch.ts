import { useMemo } from 'react'

import {
  useGetContentStudioResearchQuery,
  useRefreshContentStudioResearchMutation,
} from '../services/contentStudio.api'

export function useMarketResearch() {
  const query = useGetContentStudioResearchQuery()
  const [triggerRefresh, refreshState] = useRefreshContentStudioResearchMutation()

  const lastUpdated = useMemo(() => {
    const values = Object.values(query.data ?? {}).filter(Boolean)
    const timestamps = values
      .map((entry) => new Date((entry as { generatedAt: string }).generatedAt).getTime())
      .filter((value) => Number.isFinite(value))

    if (timestamps.length === 0) return null
    return new Date(Math.max(...timestamps))
  }, [query.data])

  const isStale = useMemo(
    () => Object.values(query.data ?? {}).some((entry) => Boolean(entry && (entry as { isStale: boolean }).isStale)),
    [query.data],
  )

  return {
    data: query.data ?? null,
    loading: query.isLoading || query.isFetching,
    error: query.error,
    refreshing: refreshState.isLoading,
    lastUpdated,
    isStale,
    refresh: async () => {
      await triggerRefresh().unwrap()
      await query.refetch()
    },
    refetch: query.refetch,
  }
}
