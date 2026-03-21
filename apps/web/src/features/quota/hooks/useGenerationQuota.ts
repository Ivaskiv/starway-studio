import { useGetMyQuotaQuery } from "@/features/quota/services/api"

export function useGenerationQuota() {
  const { data, isLoading, isFetching, refetch } = useGetMyQuotaQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  })

  return {
    quota: data,
    isLoading,
    isFetching,
    refetch,
  }
}
