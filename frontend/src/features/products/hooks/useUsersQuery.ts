import { useGetUsersQuery } from '@/features/user/services/users.api'

export function useUsersQuery(opts?: Parameters<typeof useGetUsersQuery>[1]) {
  return useGetUsersQuery(undefined, opts)
}
