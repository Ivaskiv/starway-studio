// frontend/src/features/auth/services/access.api.ts
import { UserAccessResult } from '@/features/auth/types/auth.types';
import { api } from '@/services/api';

export const accessApi = api.injectEndpoints({
  endpoints: builder => ({
    getMyAccess: builder.query<UserAccessResult, void>({
      query: () => '/access/me',
      providesTags: ['Access'],
    }),
  }),
});

export const { useGetMyAccessQuery } = accessApi;