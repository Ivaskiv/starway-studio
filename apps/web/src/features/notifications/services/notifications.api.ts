// services/notifications/notifications.api.ts
import type { Notification } from '@/features/notifications/types/notification.types';
import api from '@/services/api';

export const notificationsApi = api.injectEndpoints({
  endpoints: builder => ({
    getNotifications: builder.query<
      Notification[],
      { userId: string; limit?: number; unreadOnly?: boolean }
    >({
      query: ({ userId, ...params }) => ({
        url: `/notifications/${userId}`,
        params,
      }),
      providesTags: ['Notification'],
    }),

    markNotificationRead: builder.mutation<void, string>({
      query: id => ({
        url: `/notifications/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notification'],
    }),

    markAllNotificationsRead: builder.mutation<void, { userId: string }>({
      query: ({ userId }) => ({
        url: `/notifications/${userId}/read-all`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notification'],
    }),

    deleteNotification: builder.mutation<void, string>({
      query: id => ({
        url: `/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} = notificationsApi;
