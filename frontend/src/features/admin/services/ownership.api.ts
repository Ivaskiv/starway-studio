import type { AdminUser, OwnershipInfo, TransferPayload } from './ownership.types'
import { api } from '@/services/api'

export const ownershipApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<AdminUser[], void>({
      query: () => '/admin/users',
      providesTags: ['Users'],
    }),
    getOwnership: builder.query<OwnershipInfo, void>({
      query: () => '/admin/ownership',
      providesTags: ['Ownership'],
    }),
    transferOwnership: builder.mutation<{ ok: boolean; user: AdminUser }, TransferPayload>({
      query: (body) => ({ url: '/admin/transfer-ownership', method: 'POST', body }),
      invalidatesTags: ['Ownership', 'Users'],
    }),
  }),
})

export const {
  useGetUsersQuery,
  useGetOwnershipQuery,
  useTransferOwnershipMutation,
} = ownershipApi
