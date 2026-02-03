// /services/users.api.ts
import type { User } from '@/features/user/types/user.types';
import api from '../../../services/api';

export const usersApi = api.injectEndpoints({
  endpoints: builder => ({
    subscribeToAdmin: builder.mutation<User, { adminId: string }>({
      query: ({ adminId }) => ({
        url: `/users/subscribe`,
        method: 'POST',
        body: { adminId },
      }),
      invalidatesTags: ['User'], // 🔹 оновлюємо кеш користувача після підписки
    }),
  }),
});

export const { useSubscribeToAdminMutation } = usersApi;
