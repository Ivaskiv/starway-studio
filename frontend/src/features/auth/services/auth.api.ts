// frontend/src/features/auth/services/auth.api.ts
import { api } from '@/services/api';
import type { AuthApiResponse } from '@/types/globalTypes';
import type {
  CheckUserExistsInput,
  CheckUserExistsResponse,
  ForgotPasswordInput,
  ForgotPasswordResponse,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  ResetPasswordResponse,
  SocialAuthApiInput,
  UpdateUserSettingsInput,
} from '../types/auth.types';
import { clearAuth, setCredentials, updateUser } from './auth.slice';

export const authApi = api.injectEndpoints({
  endpoints: builder => ({
    checkUserExists: builder.mutation<CheckUserExistsResponse, CheckUserExistsInput>({
      query: body => ({ url: '/auth/check-user', method: 'POST', body }),
    }),

    // ── LOGIN ──────────────────────────────────────────────────────────────
    login: builder.mutation<AuthApiResponse, LoginInput>({
      query: body => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),

    // ── REGISTER ───────────────────────────────────────────────────────────
    register: builder.mutation<AuthApiResponse, RegisterInput>({
      query: body => ({ url: '/auth/register', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),

    forgotPassword: builder.mutation<ForgotPasswordResponse, ForgotPasswordInput>({
      query: body => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),

    resetPassword: builder.mutation<ResetPasswordResponse, ResetPasswordInput>({
      query: body => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),

    // ── SOCIAL AUTH ────────────────────────────────────────────────────────
    socialAuth: builder.mutation<AuthApiResponse, SocialAuthApiInput>({
      query: body => ({ url: '/auth/social', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));
        } catch (err) {
          console.error('[auth.api] ❌ socialAuth failed:', err);
        }
      },
      invalidatesTags: ['User'],
    }),

    // ── GET ME ─────────────────────────────────────────────────────────────
    getMe: builder.query<{ user: AuthApiResponse['user'] }, void>({
      query: () => '/auth/me',
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(updateUser(data.user));
        } catch (err) {
          console.error('[auth.api] ❌ getMe failed:', err);
          dispatch(clearAuth());
        }
      },
      providesTags: ['User'],
    }),

    // ── LOGOUT ─────────────────────────────────────────────────────────────
    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['User'],
    }),

    // ── UPDATE SETTINGS ────────────────────────────────────────────────────
    updateUserSettings: builder.mutation<{ user: AuthApiResponse['user'] }, UpdateUserSettingsInput>({
      query: body => ({ url: '/auth/settings', method: 'PATCH', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(updateUser(data.user));
        } catch (err) {
          console.error('[auth.api] ❌ updateUserSettings failed:', err);
        }
      },
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useCheckUserExistsMutation,
  useLoginMutation,
  useRegisterMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useSocialAuthMutation,
  useGetMeQuery,
  useLogoutMutation,
  useUpdateUserSettingsMutation,
} = authApi;
