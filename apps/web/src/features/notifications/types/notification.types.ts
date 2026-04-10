export interface NotificationPayload {
  event?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  sourceChannel?: string | null;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: NotificationPayload | null;
  channel?: 'TELEGRAM' | 'IN_APP' | 'EMAIL';
  status?: 'PENDING' | 'SENT' | 'FAILED';
  templateKey?: string | null;
  readAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
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
