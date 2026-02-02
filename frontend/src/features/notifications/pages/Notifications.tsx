import { selectVisibleNotifications } from '@/app/store/selectVisibleNotifications';
import { useGetMeQuery } from '@/features/auth/services/auth.api';
import NotificationsCard from '@/features/notifications/components/NotificationsCard';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
} from '@/services/notifications.api';
import { useSelector } from 'react-redux';

export default function Notifications() {
  const { data: meData } = useGetMeQuery();
  const userId = meData?.user?.id ?? '';

  const { data: notificationsData } = useGetNotificationsQuery({ userId }, { skip: !userId });

  const notifications = useSelector(selectVisibleNotifications);
  const [markRead] = useMarkNotificationReadMutation();

  if (!userId) return null;

  return (
    <div className="max-w-xl mx-auto">
      <NotificationsCard
        userId={userId}
        notifications={notifications ?? []}
        markRead={id => markRead(id)}
      />
    </div>
  );
}
