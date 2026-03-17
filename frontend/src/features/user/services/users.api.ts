// frontend/src/features/user/services/users.api.ts
// ═══════════════════════════════════════════════════════════════
//  RTK Query endpoints для User-домену
//  (підписки, список юзерів)
// ═══════════════════════════════════════════════════════════════

import type { User } from '@/features/user/types/user.types'
import api from '@/services/api'

export const usersApi = api.injectEndpoints({
  endpoints: builder => ({

    // ── GET /users ─────────────────────────────────────────────
    getUsers: builder.query<User[], void>({
      query:       () => '/users',
      providesTags: ['User'],
    }),

    // ── POST /users/subscribe ──────────────────────────────────
    subscribeToAdmin: builder.mutation<User, { adminId: string }>({
      query: ({ adminId }) => ({
        url:    '/users/subscribe',
        method: 'POST',
        body:   { adminId },
      }),
      invalidatesTags: ['User'],
    }),

  }),
  overrideExisting: false,
})

export const {
  useGetUsersQuery,
  useSubscribeToAdminMutation,
} = usersApi