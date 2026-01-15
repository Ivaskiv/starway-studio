// packages/frontend/src/features/auth/services/auth.api.ts

import { api } from '@/services/api'
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UpdateUserPayload,
  UserRole,
  UserSettings,
} from '../../../types/user.types'

const DEMO_MODE = true

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    signIn: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
    }),

    signUp: builder.mutation<AuthResponse, RegisterRequest & { role?: UserRole }>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
    }),

    getMe: builder.query<AuthResponse, void>({
      ...(DEMO_MODE
        ? {
            queryFn: async () => ({
              data: {
                success: true,
                user: {
                  id: 'demo',
                  email: 'demo@starway.ai',
                  first_name: 'Demo',
                  role: 'user',
                  created_at: new Date().toISOString(),
                },
                tokens: {
                  accessToken: 'demo-token',
                  refreshToken: 'demo-refresh',
                  expiresIn: 3600,
                },
              },
            }),
          }
        : {
            query: () => '/auth/me',
          }),
    }),

    updateUserSettings: builder.mutation<UserSettings, Partial<UserSettings>>({
      query: (data) => ({
        url: '/settings/user',
        method: 'PUT',
        body: data,
      }),
    }),

    updateUser: builder.mutation<any, UpdateUserPayload>({
      query: ({ id, ...body }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body,
      }),
    }),
  }),
})

export const {
  useSignInMutation,
  useSignUpMutation,
  useGetMeQuery,
  useUpdateUserSettingsMutation,
  useUpdateUserMutation,
} = authApi
