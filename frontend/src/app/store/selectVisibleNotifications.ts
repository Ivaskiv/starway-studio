import type { RootState } from '@/frontend/srcapp/store';
import { Notification } from '@/frontend/srcfeatures/notifications/types/notification.types';
import { createSelector } from '@reduxjs/toolkit';

export const selectAllNotifications = (state: RootState) =>
  state.api.queries['getNotifications']?.data as Notification[] | undefined;

export const selectUserAbilities = (state: RootState) => state.auth.user?.abilities;

export const selectVisibleNotifications = createSelector(
  [selectAllNotifications, selectUserAbilities],
  (notifications, abilities) => {
    if (!notifications) return [];

    if (!abilities || abilities.length === 0) {
      return notifications.filter(n => !n.ability);
    }

    const abilitySet = new Set(abilities);
    return notifications.filter(n => !n.ability || abilitySet.has(n.ability));
  },
);
