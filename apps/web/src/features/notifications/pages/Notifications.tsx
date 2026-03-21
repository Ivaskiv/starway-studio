// frontend/src/features/notifications/pages/Notifications.tsx
// FIX: useGetMeQuery → useAppSelector(selectCurrentUser)
// userId береться з store — без додаткового мережевого запиту

import { useAppSelector }    from '@/app/hooks'
import { selectCurrentUser } from '@/features/auth/services/auth.slice'
import NotificationsCard     from '@/features/notifications/components/NotificationsCard'
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
} from '@/features/notifications/services/notifications.api'

export default function Notifications() {
  // ── ВИПРАВЛЕНО: userId з Redux store ─────────────────────────────────────
  const user   = useAppSelector(selectCurrentUser)
  const userId = user?.id ?? ''

  const { data: notificationsData } = useGetNotificationsQuery(
    { userId },
    { skip: !userId },
  )

  const [markRead] = useMarkNotificationReadMutation()

  if (!userId) return null

  return (
    <div className="max-w-xl mx-auto">
      <NotificationsCard
        userId={userId}
        notifications={notificationsData ?? []}
        markRead={id => markRead(id)}
      />
    </div>
  )
}