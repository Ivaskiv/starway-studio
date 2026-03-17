// frontend/src/features/social/services/social.api.ts
import { api } from '@/services/api';
import type { AuthApiResponse } from '@/types/globalTypes';
import type { SocialPlatform } from '../types/social.types';

export const socialApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getConnections: builder.query<
      { success: boolean; connections: Array<{ provider: string; externalId?: string; username?: string }> },
      void
    >({
      query: () => ({
        url: '/social/connections',
        method: 'GET',
      }),
      providesTags: ['Social'],
    }),

    generateTelegramLink: builder.mutation<{ success: boolean; link: string; expiresIn: number }, void>({
      query: () => ({
        url: '/social/telegram/link',
        method: 'GET',
      }),
      invalidatesTags: ['Social'],
    }),

    socialCallback: builder.mutation<AuthApiResponse, { code: string; state?: string }>({
      query: (body) => ({
        url: '/auth/callback',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),

    socialLogin: builder.mutation<AuthApiResponse, { provider: SocialPlatform; code: string }>({
      query: (body) => ({
        url: '/social/login',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetConnectionsQuery,
  useGenerateTelegramLinkMutation,
  useSocialCallbackMutation,
  useSocialLoginMutation,
} = socialApi;
