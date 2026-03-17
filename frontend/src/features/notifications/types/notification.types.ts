import { Ability } from '@/features/auth/permissions/abilities';

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'achievement' | 'reminder' | 'system';
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  description?: string;
  ability?: Ability;
}

export interface NotificationsState {
  list: Notification[];
  unreadCount: number;
}

export interface NotificationsCardProps {
  userId: string;
  notifications: Notification[];
  markRead: (id: string) => void;
}
