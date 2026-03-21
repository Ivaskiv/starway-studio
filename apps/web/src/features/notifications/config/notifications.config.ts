// /features/notifications/config/notifications.config.ts

import { ABILITIES, Ability } from "@/features/auth/permissions/abilities";


export interface NotificationItem {
  key: string; // унікальний ключ сповіщення
  label: string; // назва
  description: string; // підказка / текст
  ability: Ability; // яка ability потрібна для цього notification
}

// Тут ти додаєш нові сповіщення
export const NOTIFICATIONS_CONFIG: NotificationItem[] = [
  {
    key: 'morning',
    label: 'Ранкові питання',
    description: 'Щоденні сповіщення о 9:00',
ability: ABILITIES.NOTIFICATIONS_READ,
  },
  {
    key: 'evening',
    label: 'Вечірні питання',
    description: 'Щоденні сповіщення о 21:00',
ability: ABILITIES.NOTIFICATIONS_READ,
  },
  {
    key: 'wheel',
    label: 'Колесо балансу',
    description: 'Щотижневі сповіщення',
ability: ABILITIES.NOTIFICATIONS_READ,
  },
];
