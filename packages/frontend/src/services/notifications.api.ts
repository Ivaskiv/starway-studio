// packages/frontend/src/services/notifications.api.ts
import { api } from './api';

export interface Notification {
  id: string;
  user_id: string;
  type: 'info' | 'success' | 'warning' | 'achievement' | 'reminder' | 'system';
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  isRead: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'voice';
  attachments?: {
    url: string;
    type: string;
    name: string;
  }[];
  isRead: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  participants: {
    user_id: string;
    name: string;
    avatar?: string;
  }[];
  lastMessage?: Message;
  unreadCount: number;
  updated_at: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  recipients: {
    type: 'all' | 'segment' | 'custom';
    count: number;
  };
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  stats?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
  };
}

export interface Schedule {
  id: string;
  name: string;
  type: 'email' | 'notification' | 'message' | 'post';
  content: any;
  schedule: {
    type: 'once' | 'daily' | 'weekly' | 'monthly';
    time: string;
    daysOfWeek?: number[];
    date?: string;
  };
  is_active: boolean;
  nextRun?: string;
  created_at: string;
}

export interface Automation {
  id: string;
  name: string;
  description?: string;
  trigger: {
    type: 'user_registered' | 'lesson_completed' | 'achievement_unlocked' | 'payment_received' | 'custom';
    config: any;
  };
  actions: {
    type: 'send_email' | 'send_notification' | 'add_tag' | 'update_progress' | 'webhook';
    config: any;
    delay?: number; // minutes
  }[];
  is_active: boolean;
  stats?: {
    triggered: number;
    completed: number;
    failed: number;
  };
  created_at: string;
}

export const notificationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Notifications
    getNotifications: builder.query<Notification[], { limit?: number; unreadOnly?: boolean }>({
      query: ({ limit = 50, unreadOnly = false }) => ({
        url: '/notifications',
        params: { limit, unreadOnly },
      }),
      providesTags: ['Notification'],
    }),

    markNotificationRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notification'],
    }),

    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PUT',
      }),
      invalidatesTags: ['Notification'],
    }),

    deleteNotification: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification'],
    }),

    // Messages
    getConversations: builder.query<Conversation[], void>({
      query: () => '/messages/conversations',
      providesTags: ['Message'],
    }),

    getMessages: builder.query<Message[], string>({
      query: (conversationId) => `/messages/conversations/${conversationId}`,
      providesTags: (result, error, conversationId) => [{ type: 'Message', id: conversationId }],
    }),

    sendMessage: builder.mutation<Message, { conversationId: string; content: string; type?: string }>({
      query: ({ conversationId, content, type = 'text' }) => ({
        url: `/messages/conversations/${conversationId}`,
        method: 'POST',
        body: { content, type },
      }),
      invalidatesTags: ['Message'],
    }),

    createConversation: builder.mutation<Conversation, { participantIds: string[] }>({
      query: ({ participantIds }) => ({
        url: '/messages/conversations',
        method: 'POST',
        body: { participantIds },
      }),
      invalidatesTags: ['Message'],
    }),

    // Email Campaigns
    getEmailCampaigns: builder.query<EmailCampaign[], { status?: string }>({
      query: ({ status }) => ({
        url: '/notifications/email-campaigns',
        params: { status },
      }),
      providesTags: ['Email'],
    }),

    createEmailCampaign: builder.mutation<EmailCampaign, Partial<EmailCampaign>>({
      query: (data) => ({
        url: '/notifications/email-campaigns',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Email'],
    }),

    updateEmailCampaign: builder.mutation<EmailCampaign, { id: string; data: Partial<EmailCampaign> }>({
      query: ({ id, data }) => ({
        url: `/notifications/email-campaigns/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Email'],
    }),

    sendEmailCampaign: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/email-campaigns/${id}/send`,
        method: 'POST',
      }),
      invalidatesTags: ['Email'],
    }),

    // Schedules
    getSchedules: builder.query<Schedule[], void>({
      query: () => '/notifications/schedules',
      providesTags: ['Schedule'],
    }),

    createSchedule: builder.mutation<Schedule, Partial<Schedule>>({
      query: (data) => ({
        url: '/notifications/schedules',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Schedule'],
    }),

    updateSchedule: builder.mutation<Schedule, { id: string; data: Partial<Schedule> }>({
      query: ({ id, data }) => ({
        url: `/notifications/schedules/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Schedule'],
    }),

    deleteSchedule: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/schedules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Schedule'],
    }),

    toggleSchedule: builder.mutation<Schedule, string>({
      query: (id) => ({
        url: `/notifications/schedules/${id}/toggle`,
        method: 'PUT',
      }),
      invalidatesTags: ['Schedule'],
    }),

    // Automations
    getAutomations: builder.query<Automation[], void>({
      query: () => '/notifications/automations',
      providesTags: ['Automation'],
    }),

    createAutomation: builder.mutation<Automation, Partial<Automation>>({
      query: (data) => ({
        url: '/notifications/automations',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Automation'],
    }),

    updateAutomation: builder.mutation<Automation, { id: string; data: Partial<Automation> }>({
      query: ({ id, data }) => ({
        url: `/notifications/automations/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Automation'],
    }),

    deleteAutomation: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/automations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Automation'],
    }),

    toggleAutomation: builder.mutation<Automation, string>({
      query: (id) => ({
        url: `/notifications/automations/${id}/toggle`,
        method: 'PUT',
      }),
      invalidatesTags: ['Automation'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useCreateConversationMutation,
  useGetEmailCampaignsQuery,
  useCreateEmailCampaignMutation,
  useUpdateEmailCampaignMutation,
  useSendEmailCampaignMutation,
  useGetSchedulesQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
  useToggleScheduleMutation,
  useGetAutomationsQuery,
  useCreateAutomationMutation,
  useUpdateAutomationMutation,
  useDeleteAutomationMutation,
  useToggleAutomationMutation,
} = notificationsApi;