import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '@/features/auth/services/auth.slice'

const DEFAULT_MESSAGE =
  'Щоб виконати цю дію, спочатку увійдіть або зареєструйтеся в Starway Studio.'

/**
 * useRequireAuthToast
 * ------------------
 * Centralized helper for guarding button handlers that require auth.
 * Returns a callback wrapper that either executes the provided action
 * for authenticated users or shows a toast prompting login/registration.
 */
export function useRequireAuthToast() {
  const user = useSelector(selectCurrentUser)

  return useCallback(
    (next: () => void) => {
      if (!user) {
        toast.dismiss()
        toast.error(DEFAULT_MESSAGE)
        return
      }
      next()
    },
    [user],
  )
}
