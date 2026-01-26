// frontend/src/services/social.api.ts
import { api } from '@/services/api';
import { SocialPlatform } from '@/shared/constants/socialPlatforms.constants';
import { AuthResponse } from '@/shared/types/user.types';

export const socialApi = api.injectEndpoints({
  endpoints: builder => ({
 connectSocial: builder.mutation<
      AuthResponse,
      { provider: SocialPlatform; externalId: string; username?: string; metadata?: Record<string, any> }
    >({
      query: (data) => ({
        url: '/social/connect',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    socialLogin: builder.mutation<
      AuthResponse,
      { provider: SocialPlatform; externalId: string }
    >({
      query: (data) => ({
        url: '/social/login',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});
export const { useConnectSocialMutation, useSocialLoginMutation } = socialApi;

// import { SocialPlatform } from '../shared/constants/socialPlatforms.constants';
// import { User } from '../shared/types/user.types';
// import { api } from './api';

// // ============ API ============

// export const socialApi = api.injectEndpoints({
//   endpoints: builder => ({
//     connectSocial: builder.mutation<
//       { user: User; needsProfile: boolean },
//       {
//         provider: SocialPlatform;
//         externalId: string;
//         username?: string;
//         metadata?: Record<string, any>;
//       }
//     >({
//       query: data => ({
//         url: '/auth/social',
//         method: 'POST',
//         body: data,
//       }),
//       invalidatesTags: ['User'],
//     }),

//     socialLogin: builder.mutation<
//       { user: User; needsProfile: boolean },
//       { provider: SocialPlatform; externalId: string }
//     >({
//       query: data => ({
//         url: '/auth/social/login',
//         method: 'POST',
//         body: data,
//       }),
//       invalidatesTags: ['User'],
//     }),
//   }),
// });

// export const { useConnectSocialMutation, useSocialLoginMutation } = socialApi;
