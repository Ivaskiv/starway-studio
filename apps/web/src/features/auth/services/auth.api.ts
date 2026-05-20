// frontend/src/features/auth/services/auth.api.ts
import type {
  AuthSuccessResponseDTO,
  ForgotPasswordResponseDTO,
  LogoutResponseDTO,
  MeResponseDTO,
  ResetPasswordResponseDTO,
  SocialAuthResponseDTO,
  UpdateSettingsResponseDTO,
} from '@/contracts/api.contracts'
import type { User } from '@/features/user/types/user.types'
import { api } from '@/services/api'
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SocialAuthApiInput,
  TelegramMiniAppAuthInput,
  UpdateUserSettingsInput,
} from '../types/auth.types'
import { clearAuth, setCredentials, updateUser, updateUserSettings } from './auth.slice'

export interface TelegramStatusResponse {
  linked: boolean
  botActive: boolean
  retryAvailable?: boolean
  telegramEnabled?: boolean
}

export interface TelegramLinkResponse {
  url: string
  linked: boolean
  retryAvailable?: boolean
  expiresIn: number
  expiresAt: string
  botUsername: string
}

export const authApi = api.injectEndpoints({
  endpoints: builder => ({

    login: builder.mutation<AuthSuccessResponseDTO, LoginInput>({
      query: body => ({ url: '/auth/login', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials({ user: data.user as unknown as User, accessToken: data.accessToken, refreshToken: data.refreshToken }))
        } catch (error) {
          console.warn('[auth.api] login failed:', error)
        }
      },
    }),

    register: builder.mutation<AuthSuccessResponseDTO, RegisterInput>({
      query: body => ({ url: '/auth/register', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials({ user: data.user as unknown as User, accessToken: data.accessToken, refreshToken: data.refreshToken }))
        } catch (error) {
          console.warn('[auth.api] register failed:', error)
        }
      },
    }),

    socialAuth: builder.mutation<SocialAuthResponseDTO, SocialAuthApiInput>({
      query: body => ({ url: '/auth/social', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials({ user: data.user as unknown as User, accessToken: data.accessToken, refreshToken: data.refreshToken }))
        } catch (error) {
          console.warn('[auth.api] socialAuth failed:', error)
        }
      },
    }),

    telegramMiniAppAuth: builder.mutation<SocialAuthResponseDTO & { token: string }, TelegramMiniAppAuthInput>({
      query: body => ({ url: '/auth/telegram', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials({ user: data.user as unknown as User, accessToken: data.accessToken, refreshToken: data.refreshToken }))
        } catch (error) {
          console.warn('[auth.api] telegramMiniAppAuth failed:', error)
        }
      },
    }),

    getMe: builder.query<MeResponseDTO, void>({
      query: () => '/auth/me',
      keepUnusedDataFor: 300,
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(updateUser(data.user as unknown as User))
        } catch {
          // Не робимо clearAuth тут — api.ts interceptor сам обробляє 401 + refresh
          // clearAuth тільки якщо refresh теж провалився (це окремо в api.ts)
        }
      },
    }),

    getTelegramLinkUrl: builder.query<TelegramLinkResponse, void>({
      query: () => '/auth/telegram-link',
      keepUnusedDataFor: 300,
    }),

    getTelegramStatus: builder.query<TelegramStatusResponse, void>({
      query: () => '/telegram/status',
      keepUnusedDataFor: 300,
    }),

    retryTelegramLink: builder.mutation<TelegramLinkResponse, void>({
      query: () => ({ url: '/telegram/retry-link', method: 'POST' }),
    }),

    logout: builder.mutation<LogoutResponseDTO, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
        } finally {
          dispatch(clearAuth())
        }
      },
    }),

    updateUserSettings: builder.mutation<UpdateSettingsResponseDTO, UpdateUserSettingsInput>({
      query: body => ({ url: '/auth/settings', method: 'PATCH', body }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled

          // Бекенд може повертати { user } або { settings } — обробляємо обидва варіанти
          if (data?.user) {
            // Повний user об'єкт — оновлюємо весь user (але НЕ clearAuth при помилці)
            dispatch(updateUser(data.user as unknown as User))
          } else {
            // Бекенд повернув тільки { settings } або нічого корисного —
            // оновлюємо тільки settings з того що відправили
            dispatch(updateUserSettings(arg.settings ?? {}))
          }
        } catch (err) {
          // ❌ НЕ робимо clearAuth — 401 обробляється refresh interceptором в api.ts
          // Тут просто логуємо — компонент отримає помилку через .unwrap()
          console.warn('[auth.api] updateUserSettings failed:', err)
        }
      },
    }),

    attachEmail: builder.mutation<{ ok: true; merged?: boolean; userId?: string }, { email: string }>({
      query: body => ({ url: '/users/email', method: 'PATCH', body }),
    }),

    forgotPassword: builder.mutation<ForgotPasswordResponseDTO, ForgotPasswordInput>({
      query: body => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),

    resetPassword: builder.mutation<ResetPasswordResponseDTO, ResetPasswordInput>({
      query: body => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),

  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useSocialAuthMutation,
  useTelegramMiniAppAuthMutation,
  useGetMeQuery,
  useGetTelegramLinkUrlQuery,
  useLazyGetTelegramLinkUrlQuery,
  useGetTelegramStatusQuery,
  useRetryTelegramLinkMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useAttachEmailMutation,
  useUpdateUserSettingsMutation,
} = authApi
