import { useAppSelector } from '@/app/hooks'
import {
  useGetUserStateQuery,
  type UserState,
  type UserStep,
} from '@/features/auth/services/user-state.api'
import { useGetTelegramStatusQuery } from '@/features/auth/services/auth.api'

const DEFAULT_STATE: UserState = 'NEW'
const DEFAULT_STEP: UserStep = 'LINK_TELEGRAM'

export function useUserState() {
  const user = useAppSelector(state => state.auth.user)
  const isAuthenticated = useAppSelector(state => state.auth.status === 'authenticated')
  const hasRealEmail = Boolean(user?.email && !user.email.startsWith('telegram-guest-'))

  const query = useGetUserStateQuery(undefined, {
    skip: !isAuthenticated,
  })

  const telegramStatusQuery = useGetTelegramStatusQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnFocus: true,
  })

  return {
    state: query.data?.state ?? DEFAULT_STATE,
    step: query.data?.step ?? DEFAULT_STEP,
    email: user?.email ?? null,
    emailCompletionRequired: Boolean(isAuthenticated && !hasRealEmail),
    hasRealEmail,
    isLoading: isAuthenticated ? query.isLoading || query.isFetching : false,
    telegramLinked: telegramStatusQuery.data?.linked ?? false,
    botActive: telegramStatusQuery.data?.botActive ?? false,
    refetch: query.refetch,
    isAuthenticated,
  }
}
