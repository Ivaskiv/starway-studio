// services/notifications/notifications.api.ts
import type { Notification } from '@/features/notifications/types/notification.types';
import api from '@/services/api';

export const notificationsApi = api.injectEndpoints({
  endpoints: builder => ({
    getNotifications: builder.query<
      Notification[],
      { limit?: number; unreadOnly?: boolean } | void
    >({
      query: (args) => ({
        url: '/notifications/me',
        params: args ?? {},
      }),
      providesTags: ['Notification'],
    }),

    getNotificationsForUser: builder.query<
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

    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/me/read-all',
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

    sendSessionHandoff: builder.mutation<
      { ok: true; sent: boolean; session: 'morning' | 'evening' },
      {
        session: 'morning' | 'evening'
        step?: number
        answers?: Record<string, string>
        date?: string
      }
    >({
      query: body => ({
        url: '/notifications/session-handoff',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Notification'],
    }),

    sendTrialExpiredFlowDiagnostic: builder.mutation<
      { ok: true; userId: string; scenarios: string[] },
      {
        userId?: string
        previousPlan?: string
        daysSinceExpired?: number
        streak?: number
        wheels?: number
        sessions?: number
      }
    >({
      query: body => ({
        url: '/notifications/diagnostics/trial-expired-flow',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetNotificationsForUserQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useSendSessionHandoffMutation,
  useSendTrialExpiredFlowDiagnosticMutation,
} = notificationsApi;
