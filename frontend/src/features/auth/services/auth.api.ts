// frontend/src/features/auth/services/auth.api.ts
import { api, saveToken } from '@/services/api';
import { LoginRequest, RegisterRequest, UpdateUserRequest, User } from '@/shared/types/user.types';
import { clearAuth, setCredentials, updateUser } from './auth.slice';
import { AuthResponse, MeResponse, SocialAuthInput } from '../types/auth.types';
import { SocialPlatform } from '@/features/social/types/social.types';
import { getToken } from '../../../services/api';

const ME_TAG = { type: 'User' as const, id: 'ME' };

export const authApi = api.injectEndpoints({
  endpoints: builder => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: credentials => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: [ME_TAG],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({ user: data.user, accessToken: data.token }));
          saveToken(data.token);
        } catch (err) {
          dispatch(clearAuth());
        }
      },
    }),

    register: builder.mutation<AuthResponse, Omit<RegisterRequest, 'role'>>({
      query: data => ({
        url: '/auth/register',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [ME_TAG],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({ user: data.user, accessToken: data.token }));
          saveToken(data.token);
        } catch (err) {}
      },
    }),

    socialAuth: builder.mutation<AuthResponse, SocialAuthInput>({
      query: ({ provider, token }) => ({
        url: '/auth/social',
        method: 'POST',
        body: { provider, token },
      }),
      invalidatesTags: [ME_TAG],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({ user: data.user, accessToken: data.token }));
          saveToken(data.token);
        } catch (error) {}
      },
    }),

    getMe: builder.query<MeResponse, void>({
      query: () => '/auth/me',
      providesTags: [ME_TAG],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(updateUser(data.user));
        } catch (err) {
          dispatch(clearAuth());
        }
      },
    }),

    refreshToken: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({ user: data.user, accessToken: data.token }));
          saveToken(data.token);
        } catch (err) {
          dispatch(clearAuth());
        }
      },
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {}
        dispatch(clearAuth());
        dispatch(api.util.resetApiState());
      },
      invalidatesTags: [ME_TAG],
    }),

    updateUserSettings: builder.mutation<User, UpdateUserRequest>({
      query: ({ id, ...body }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: { user: User }) => response.user,
      invalidatesTags: [ME_TAG],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(updateUser(data));
        } catch (err) {}
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useSocialAuthMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useRefreshTokenMutation,
  useLogoutMutation,
  useUpdateUserSettingsMutation,
} = authApi;