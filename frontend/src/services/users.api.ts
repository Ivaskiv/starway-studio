// frontend/src/services/users.api.ts
import api from './api'
import type { User } from '@/shared/types/user.types'

export const usersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    subscribeToAdmin: builder.mutation<User, { adminId: string }>({
      query: ({ adminId }) => ({
        url: `/users/subscribe`,
        method: 'POST',
        body: { adminId },
      }),
      invalidatesTags: ['User'], // 🔹 оновлюємо кеш користувача після підписки
    }),
  }),
})

export const { useSubscribeToAdminMutation } = usersApi
