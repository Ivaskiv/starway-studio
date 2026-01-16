// packages/frontend/src/services/social.api.ts

import { api } from './api';
import { type SocialPlatform } from '@/constants/socialPlatforms';

// ============ TYPES ============

export interface SocialConnection {
  provider: SocialPlatform;
  external_id: string;
  username?: string;
  metadata?: Record<string, any>;
  connectedAt: string;
  is_notifications?: boolean;
  accessToken?: string;
  refreshToken?: string;
}

export interface TelegramLink {
  link: string;
  expiresIn: number;
}

// ============ API ============

export const socialApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Отримати всі підключення
    getSocialConnections: builder.query<{ connections: SocialConnection[] }, void>({
      query: () => '/social/connections',
      providesTags: ['Social'],
    }),

    // Підключити соцмережу
    connectSocial: builder.mutation<
      { success: boolean },
      {
        provider: SocialPlatform;
        external_id: string;
        username?: string;
        accessToken?: string;
        metadata?: Record<string, any>;
      }
    >({
      query: (data) => ({
        url: '/social/connect',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Social', 'User'],
    }),

    // Відключити соцмережу
    disconnectSocial: builder.mutation<{ success: boolean }, { provider: SocialPlatform }>({
      query: (data) => ({
        url: '/social/disconnect',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Social', 'User'],
    }),

    // Отримати посилання для Telegram
    getTelegramLink: builder.query<TelegramLink, void>({
      query: () => '/social/telegram/link',
    }),
  }),
});

export const {
  useGetSocialConnectionsQuery,
  useConnectSocialMutation,
  useDisconnectSocialMutation,
  useGetTelegramLinkQuery,
  useLazyGetTelegramLinkQuery,
} = socialApi;