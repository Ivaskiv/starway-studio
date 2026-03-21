// frontend/src/features/notifications/components/NotificationsCard.tsx
import { Bell, Check } from 'lucide-react';
import { Button, GlassCard } from '../../../ui';
import { NotificationsCardProps } from '../types/notification.types';

/*
  🧠 Пояснення:
  1. Це UI-картка для конкретних сповіщень користувача.
  2. `notifications` приходять з бекенду, кожне має `isRead`.
  3. `markRead` — callback, який відправляє на бекенд, що сповіщення прочитано.
  4. Тут не робимо фільтрацію по ability — це робиться у глобальному Notifications.tsx.
  5. Можна стилізувати або додавати анімації, UI буде самодостатній.
*/

export default function NotificationsCard({
  notifications,
  markRead,
  userId,
}: NotificationsCardProps) {
  if (!notifications.length) return null;
  return (
    <GlassCard className="p-6">
      <h3 className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5" />
        Нотифікації
      </h3>

      {notifications.map(n => (
        <div key={n.id} className="flex justify-between">
          <div>
            <p>{n.title}</p>
            <p className="opacity-60">{n.message}</p>
          </div>

          {!n.isRead && (
            <Button size="sm" onClick={() => markRead(n.id)} leftIcon={Check}>
              Прочитано
            </Button>
          )}
        </div>
      ))}
    </GlassCard>
  );
}
