// packages/frontend/src/services/integrations.api.ts
import { api } from '../../../services/api';

export interface TelegramBot {
  id: string;
  name: string;
  username: string;
  token: string;
  isActive: boolean;
  webhookUrl?: string;
  commands: BotCommand[];
  stats: {
    totalUsers: number;
    activeUsers: number;
    messagesPerDay: number;
  };
  createdAt: string;
}

export interface BotCommand {
  command: string;
  description: string;
  action: string;
}

export interface TelegramChannel {
  id: string;
  channelId: string;
  name: string;
  username?: string;
  subscribersCount?: number;
  isLinked: boolean;
}

export interface SocialMediaConnection {
  id: string;
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube';
  accountName: string;
  isConnected: boolean;
  accessToken?: string;
  stats?: {
    followers: number;
    engagement: number;
  };
}

export interface PaymentIntegration {
  id: string;
  provider: 'wayforpay' | 'liqpay' | 'stripe' | 'fondy';
  isActive: boolean;
  merchantId: string;
  config: any;
  testMode: boolean;
}

export interface EmailIntegration {
  id: string;
  provider: 'sendpulse' | 'mailchimp' | 'sendgrid';
  isActive: boolean;
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  lastTriggered?: string;
}

export const integrationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Telegram Bots
    getTelegramBots: builder.query<TelegramBot[], void>({
      query: () => '/integrations/telegram/bots',
      providesTags: ['TelegramBot'],
    }),

    connectTelegramBot: builder.mutation<TelegramBot, { token: string; name: string }>({
      query: ({ token, name }) => ({
        url: '/integrations/telegram/connect',
        method: 'POST',
        body: { token, name },
      }),
      invalidatesTags: ['TelegramBot'],
    }),

    updateBotCommands: builder.mutation<TelegramBot, { botId: string; commands: BotCommand[] }>({
      query: ({ botId, commands }) => ({
        url: `/integrations/telegram/bots/${botId}/commands`,
        method: 'PUT',
        body: { commands },
      }),
      invalidatesTags: ['TelegramBot'],
    }),

    deleteTelegramBot: builder.mutation<void, string>({
      query: (id) => ({
        url: `/integrations/telegram/bots/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TelegramBot'],
    }),

    // Telegram Channels
    getTelegramChannels: builder.query<TelegramChannel[], void>({
      query: () => '/integrations/telegram/channels',
      providesTags: ['TelegramChannel'],
    }),

    linkTelegramChannel: builder.mutation<TelegramChannel, { channelId: string; name: string }>({
      query: ({ channelId, name }) => ({
        url: '/integrations/telegram/channels/link',
        method: 'POST',
        body: { channelId, name },
      }),
      invalidatesTags: ['TelegramChannel'],
    }),

    // Social Media
    getSocialMediaConnections: builder.query<SocialMediaConnection[], void>({
      query: () => '/integrations/social',
      providesTags: ['SocialMedia'],
    }),

    connectSocialMedia: builder.mutation<SocialMediaConnection, { platform: string; accessToken: string }>({
      query: ({ platform, accessToken }) => ({
        url: `/integrations/social/${platform}/connect`,
        method: 'POST',
        body: { accessToken },
      }),
      invalidatesTags: ['SocialMedia'],
    }),

    disconnectSocialMedia: builder.mutation<void, string>({
      query: (id) => ({
        url: `/integrations/social/${id}/disconnect`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SocialMedia'],
    }),

    // Payments
    getPaymentIntegrations: builder.query<PaymentIntegration[], void>({
      query: () => '/integrations/payments',
      providesTags: ['Payment'],
    }),

    updatePaymentIntegration: builder.mutation<PaymentIntegration, { provider: string; config: any }>({
      query: ({ provider, config }) => ({
        url: `/integrations/payments/${provider}`,
        method: 'PUT',
        body: config,
      }),
      invalidatesTags: ['Payment'],
    }),

    testPaymentIntegration: builder.mutation<{ success: boolean; message: string }, string>({
      query: (provider) => ({
        url: `/integrations/payments/${provider}/test`,
        method: 'POST',
      }),
    }),

    // Email
    getEmailIntegrations: builder.query<EmailIntegration[], void>({
      query: () => '/integrations/email',
      providesTags: ['Email'],
    }),

    updateEmailIntegration: builder.mutation<EmailIntegration, { provider: string; config: any }>({
      query: ({ provider, config }) => ({
        url: `/integrations/email/${provider}`,
        method: 'PUT',
        body: config,
      }),
      invalidatesTags: ['Email'],
    }),

    sendTestEmail: builder.mutation<{ success: boolean }, { provider: string; to: string }>({
      query: ({ provider, to }) => ({
        url: `/integrations/email/${provider}/test`,
        method: 'POST',
        body: { to },
      }),
    }),

    // Webhooks
    getWebhooks: builder.query<Webhook[], void>({
      query: () => '/integrations/webhooks',
      providesTags: ['Webhook'],
    }),

    createWebhook: builder.mutation<Webhook, Partial<Webhook>>({
      query: (data) => ({
        url: '/integrations/webhooks',
        method: 'POST',
        body:data,
}),
invalidatesTags: ['Webhook'],
}),
updateWebhook: builder.mutation<Webhook, { id: string; data: Partial<Webhook> }>({
  query: ({ id, data }) => ({
    url: `/integrations/webhooks/${id}`,
    method: 'PUT',
    body: data,
  }),
  invalidatesTags: ['Webhook'],
}),

deleteWebhook: builder.mutation<void, string>({
  query: (id) => ({
    url: `/integrations/webhooks/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: ['Webhook'],
}),

testWebhook: builder.mutation<{ success: boolean; response: any }, string>({
  query: (id) => ({
    url: `/integrations/webhooks/${id}/test`,
    method: 'POST',
  }),
}),
}),
});
export const {
useGetTelegramBotsQuery,
useConnectTelegramBotMutation,
useUpdateBotCommandsMutation,
useDeleteTelegramBotMutation,
useGetTelegramChannelsQuery,
useLinkTelegramChannelMutation,
useGetSocialMediaConnectionsQuery,
useConnectSocialMediaMutation,
useDisconnectSocialMediaMutation,
useGetPaymentIntegrationsQuery,
useUpdatePaymentIntegrationMutation,
useTestPaymentIntegrationMutation,
useGetEmailIntegrationsQuery,
useUpdateEmailIntegrationMutation,
useSendTestEmailMutation,
useGetWebhooksQuery,
useCreateWebhookMutation,
useUpdateWebhookMutation,
useDeleteWebhookMutation,
useTestWebhookMutation,
} = integrationsApi;

