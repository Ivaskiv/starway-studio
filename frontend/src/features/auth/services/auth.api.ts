// frontend/src/features/auth/auth.api.ts
// frontend/src/features/auth/services/auth.api.ts
import { api, saveToken } from '@/services/api'
import { normalizeUser, normalizeNotifications } from '@/shared/utils/normalize'
import { setCredentials, updateUser, clearAuth } from './auth.slice'
import type { 
  User, 
  LoginRequest, 
  RegisterRequest, 
  UpdateUserRequest 
} from '@/shared/types/user.types'
import { Notification } from '@/features/notifications/types/notification.types'

// ===========================
// TYPES
// ===========================
interface AuthResponse {
  user: User
  token: string
  permissions: string[]
}

interface MeResponse {
  user: User
  permissions: string[]
}

// ===========================
// AUTH API
// ===========================
export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ===========================
    // LOGIN
    // ===========================
    login: build.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => ({
        user: normalizeUser(response.user),
        token: response.token,
        permissions: response.permissions || [],
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          
          console.log('✅ [Login] Success:', data.user.email)
          
          // Зберігаємо в Redux + localStorage
          dispatch(setCredentials({
            user: data.user,
            accessToken: data.token,
          }))
          
          saveToken(data.token)
        } catch (error) {
          console.error('❌ [Login] Failed:', error)
        }
      },
      invalidatesTags: [{ type: 'User', id: 'ME' }],
    }),

    // ===========================
    // REGISTER
    // ===========================
    register: build.mutation<AuthResponse, Omit<RegisterRequest, 'role'>>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => ({
        user: normalizeUser(response.user),
        token: response.token,
        permissions: response.permissions || [],
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          
          console.log('✅ [Register] Success:', data.user.email)
          
          dispatch(setCredentials({
            user: data.user,
            accessToken: data.token,
          }))
          
          saveToken(data.token)
        } catch (error) {
          console.error('❌ [Register] Failed:', error)
        }
      },
      invalidatesTags: [{ type: 'User', id: 'ME' }],
    }),

    // ===========================
    // GET ME
    // ===========================
    getMe: build.query<MeResponse, void>({
      query: () => '/auth/me',
      transformResponse: (response: any) => ({
        user: normalizeUser(response.user),
        permissions: response.permissions || [],
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          
          console.log('✅ [GetMe] Success:', data.user.email)
          
          dispatch(updateUser(data.user))
        } catch (error) {
          console.error('❌ [GetMe] Failed:', error)
        }
      },
      providesTags: [{ type: 'User', id: 'ME' }],
    }),

    // ===========================
    // LOGOUT
    // ===========================
    logout: build.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
          console.log('✅ [Logout] Success')
        } catch (error) {
          console.error('❌ [Logout] Failed:', error)
        } finally {
          // Завжди очищаємо стан навіть якщо запит провалився
          dispatch(clearAuth())
          dispatch(api.util.resetApiState())
        }
      },
      invalidatesTags: ['User', 'Notification'],
    }),

    // ===========================
    // UPDATE USER SETTINGS
    // ===========================
    updateUserSettings: build.mutation<{ user: User }, UpdateUserRequest>({
      query: ({ id, ...body }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: any) => ({
        user: normalizeUser(response.user),
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          
          console.log('✅ [UpdateSettings] Success:', data.user.email)
          
          dispatch(updateUser(data.user))
        } catch (error) {
          console.error('❌ [UpdateSettings] Failed:', error)
        }
      },
      invalidatesTags: [{ type: 'User', id: 'ME' }],
    }),

    // ===========================
    // GET NOTIFICATIONS
    // ===========================
    getNotifications: build.query<Notification[], void>({
      query: () => '/notifications',
      transformResponse: (response: any) => 
        normalizeNotifications(response.notifications),
      providesTags: ['Notification'],
    }),
  }),
})

// ===========================
// EXPORTS
// ===========================
export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useLogoutMutation,
  useUpdateUserSettingsMutation,
  useGetNotificationsQuery,
} = authApi
// import { api } from '@/services'
// import {
//   AuthResponse,
//   LoginRequest,
//   RegisterRequest,
//   UpdateUserRequest,
//   User,
// } from '@/shared/types/user.types'
// import { normalizeUser, normalizeNotifications } from '@/shared/utils/normalize'
// import { clearCredentials } from './auth.persist'
// import { clearAuth, setCredentials, updateUser } from './auth.slice'
// import { Notification } from '@/features/notifications/types/notification.types'

// export const authApi = api.injectEndpoints({
//   endpoints: (build) => ({
//     login: build.mutation<AuthResponse, LoginRequest>({
//       query: (body) => ({ url: '/auth/login', method: 'POST', body }),
//       async onQueryStarted(_, { dispatch, queryFulfilled }) {
//         try {
//           const { data } = await queryFulfilled
//           dispatch(setCredentials({ user: normalizeUser(data.user), accessToken: data.tokens.accessToken }))
//         } catch {}
//       },
//       invalidatesTags: [{ type: 'User', id: 'ME' }],
//     }),

//     register: build.mutation<AuthResponse, Omit<RegisterRequest, 'role'>>({
//       query: (body) => ({ url: '/auth/register', method: 'POST', body }),
//       async onQueryStarted(_, { dispatch, queryFulfilled }) {
//         try {
//           const { data } = await queryFulfilled
//           dispatch(setCredentials({ user: normalizeUser(data.user), accessToken: data.tokens.accessToken }))
//         } catch {}
//       },
//       invalidatesTags: [{ type: 'User', id: 'ME' }],
//     }),

//     getMe: build.query<{ user: User; permissions: string[] }, void>({
//       query: () => '/auth/me',
//       transformResponse: (response: any) => ({
//         user: normalizeUser(response.user),
//         permissions: response.permissions,
//       }),
//       async onQueryStarted(_, { dispatch, queryFulfilled }) {
//         try {
//           const { data } = await queryFulfilled
//           dispatch(updateUser(data.user))
//         } catch {}
//       },
//       providesTags: [{ type: 'User', id: 'ME' }],
//     }),

//     getNotifications: build.query<Notification[], void>({
//       query: () => '/notifications',
//       transformResponse: (response: any) => normalizeNotifications(response.notifications),
//     }),

//     logout: build.mutation<void, void>({
//       query: () => ({ url: '/auth/logout', method: 'POST' }),
//       async onQueryStarted(_, { dispatch, queryFulfilled }) {
//         try {
//           await queryFulfilled
//         } finally {
//           dispatch(clearAuth())
//           clearCredentials()
//         }
//       },
//       invalidatesTags: [{ type: 'User' }],
//     }),

//     updateUserSettings: build.mutation<{ success: boolean; user: User }, UpdateUserRequest>({
//       query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PATCH', body }),
//       async onQueryStarted(_, { dispatch, queryFulfilled }) {
//         try {
//           const { data } = await queryFulfilled
//           dispatch(updateUser(normalizeUser(data.user)))
//         } catch {}
//       },
//       invalidatesTags: [{ type: 'User', id: 'ME' }],
//     }),
//   }),
// })

// export const {
//   useLoginMutation,
//   useRegisterMutation,
//   useGetMeQuery,
//   useLazyGetMeQuery,
//   useLogoutMutation,
//   useUpdateUserSettingsMutation,
// } = authApi
