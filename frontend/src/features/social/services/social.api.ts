// frontend/src/features/social/services/social.api.ts
import { api } from '@/services/api';
import type { AuthResponse } from '@/features/auth/types/auth.types';
import type { SocialPlatform } from '../types/social.types';

export const socialApi = api.injectEndpoints({
  endpoints: (builder) => ({
    socialCallback: builder.mutation<AuthResponse, { code: string; state?: string }>({
      query: (body) => ({
        url: '/auth/callback',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),

    socialLogin: builder.mutation<AuthResponse, { provider: SocialPlatform; code: string }>({
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
  useSocialCallbackMutation,
  useSocialLoginMutation,
} = socialApi;