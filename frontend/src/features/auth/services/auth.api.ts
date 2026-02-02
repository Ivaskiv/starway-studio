// frontend/src/features/auth/services/auth.api.ts
import { api, saveToken } from '@/services/api'
import { LoginRequest, RegisterRequest, UpdateUserRequest, User } from '@/shared/types/user.types'
import { clearAuth, setCredentials, updateUser } from './auth.slice'
import { AuthResponse, MeResponse, SocialAuthInput } from '../types/auth.types'

const ME_TAG = { type: 'User' as const, id: 'ME' }

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => {
        console.log('[Auth API] Login mutation starting:', credentials.email)
        return {
          url: '/auth/login',
          method: 'POST',
          body: credentials,
        }
      },
    invalidatesTags: [ME_TAG],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        console.log('[Auth API] Login onQueryStarted')
        try {
          const { data } = await queryFulfilled
          console.log('[Auth API] Login onQueryStarted data:', data),
          {
            user: data.user,
            hasToken: !!data.token,
            tokenPreview: data.token ? data.token.substring(0, 20) + '...' : 'NO TOKEN'
          }
          dispatch(setCredentials({ user: data.user, accessToken: data.token }))
          saveToken(data.token)
          console.log('[Auth API] Token saved to localStorage')
        } catch (err: any) {
          console.error('[Auth API] ❌ Login failed:', 
          {
            error: err,
            data: err?.data,
            status: err?.status
          })
          dispatch(clearAuth())
        }
      },
    }),

    register: builder.mutation<AuthResponse, Omit<RegisterRequest, 'role'>>({
      query: (data) => ({
        url: '/auth/register',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [ME_TAG],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials({ user: data.user, accessToken: data.token }))
          saveToken(data.token)
        } catch (err) {
          console.error('Register failed:', err)
        }
      },
    }),

    socialLogin: builder.mutation<AuthResponse, SocialAuthInput>({
      query: ({ provider, token }) => ({
        url: '/auth/social',
        method: 'POST',
        body: { provider, token },
      }),
      invalidatesTags: [ME_TAG],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials({ user: data.user, accessToken: data.token }))
          saveToken(data.token)
        } catch (error) {
          console.error('Social login failed:', error)
        }
      },
    }),

    getMe: builder.query<MeResponse, void>({
      query: () => {
        console.log('[Auth API] GetMe query starting')
        return '/auth/me'
      },
      providesTags: [ME_TAG],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        console.log('[Auth API] GetMe onQueryStarted')
        try {
          const { data } = await queryFulfilled
          console.log('[Auth API] ✅ GetMe successful:', data.user)
          dispatch(updateUser(data.user))
          console.log('[Auth API] User updated in Redux')
        } catch (err: any) {
          console.error('[Auth API] ❌ GetMe failed:', {
            error: err,
            status: err?.status,
            data: err?.data
          })
        }
      },
    }),

 logout: builder.mutation<void, void>({
      query: () => {
        console.log('[Auth API] Logout mutation starting')
        return {
          url: '/auth/logout',
          method: 'POST',
        }
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        console.log('[Auth API] Logout onQueryStarted')
        try {
          await queryFulfilled
          console.log('[Auth API] ✅ Logout successful')
        } catch (err) {
          console.error('[Auth API] Logout request failed (continuing with local cleanup):', err)
        }
        dispatch(clearAuth())
        dispatch(api.util.resetApiState())
        console.log('[Auth API] Auth cleared, API state reset')
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
          const { data } = await queryFulfilled
          dispatch(updateUser(data))
        } catch (err) {
          console.error('Update user failed:', err)
        }
      },
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useSocialLoginMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useLogoutMutation,
  useUpdateUserSettingsMutation,
} = authApi