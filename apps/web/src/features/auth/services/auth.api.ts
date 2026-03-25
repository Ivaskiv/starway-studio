// frontend/src/features/auth/services/auth.api.ts
import type { AppDispatch } from '@/app/store'
import type {
  AuthSuccessResponseDTO,
  ForgotPasswordResponseDTO,
  LogoutResponseDTO,
  MeResponseDTO,
  ResetPasswordResponseDTO,
  SocialAuthResponseDTO,
  UpdateSettingsResponseDTO,
} from '@/contracts/api.contracts'
import { accessApi } from '@/features/auth/services/accessApi'
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

const ACCESS_REFRESH_OPTIONS = {
  forceRefetch: true,
  subscribe: false,
} as const

async function refreshAccessState(dispatch: AppDispatch) {
  try {
    await dispatch(accessApi.endpoints.getMyAccess.initiate(undefined, ACCESS_REFRESH_OPTIONS)).unwrap()
  } catch (error) {
    console.warn('[auth.api] Failed to refresh access state', error)
  }
}

export interface TelegramStatusResponse {
  linked: boolean
  botActive: boolean
}

export const authApi = api.injectEndpoints({
  endpoints: builder => ({

    login: builder.mutation<AuthSuccessResponseDTO, LoginInput>({
      query: body => ({ url: '/auth/login', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled
        dispatch(setCredentials({ user: data.user as unknown as User, accessToken: data.accessToken }))
        await refreshAccessState(dispatch)
      },
    }),

    register: builder.mutation<AuthSuccessResponseDTO, RegisterInput>({
      query: body => ({ url: '/auth/register', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled
        dispatch(setCredentials({ user: data.user as unknown as User, accessToken: data.accessToken }))
        await refreshAccessState(dispatch)
      },
    }),

    socialAuth: builder.mutation<SocialAuthResponseDTO, SocialAuthApiInput>({
      query: body => ({ url: '/auth/social', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled
        dispatch(setCredentials({ user: data.user as unknown as User, accessToken: data.accessToken }))
        await refreshAccessState(dispatch)
      },
    }),

    telegramMiniAppAuth: builder.mutation<SocialAuthResponseDTO & { token: string }, TelegramMiniAppAuthInput>({
      query: body => ({ url: '/auth/telegram', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled
        dispatch(setCredentials({ user: data.user as unknown as User, accessToken: data.accessToken }))
        await refreshAccessState(dispatch)
      },
    }),

    getMe: builder.query<MeResponseDTO, void>({
      query: () => '/auth/me',
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

    getTelegramLinkUrl: builder.query<{ url: string; linked: boolean }, void>({
      query: () => '/auth/telegram-link',
    }),

    getTelegramStatus: builder.query<TelegramStatusResponse, void>({
      query: () => '/telegram/status',
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
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useAttachEmailMutation,
  useUpdateUserSettingsMutation,
} = authApi
