// packages/frontend/src/services/authApi.ts

import { api } from './api';

// ==================== API ====================

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    
    // 🔐 Login
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    // 📝 Register Admin
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    // 👤 Register User in Funnel
    registerUserInFunnel: builder.mutation<AuthResponse, RegisterUserInFunnelRequest>({
      query: ({ funnelId, ...credentials }) => ({
        url: `/auth/register/funnel/${funnelId}`,
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    // 👤 Get current user
    getCurrentUser: builder.query<UserResponse, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),

    // 🚪 Logout
    logout: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          localStorage.removeItem('starway_auth_token');
        } catch (error) {
          console.error('Logout error:', error);
        }
      },
    }),

    // 🔑 Change password
    changePassword: builder.mutation
      { success: boolean; message: string },
      ChangePasswordRequest
    >({
      query: (data) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: data,
      }),
    }),

  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useRegisterUserInFunnelMutation,
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useLogoutMutation,
  useChangePasswordMutation,
} = authApi;