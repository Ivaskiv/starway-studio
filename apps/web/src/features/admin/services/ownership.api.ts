import type {
  AdminUser,
  AdminUserInsight,
  GrantProductAccessResponse,
  GrantProductAccessPayload,
  OwnershipInfo,
  OwnershipTransferMigrationSummary,
  ProductAccessNotificationPreview,
  ProductAccessUserResponse,
  RevokeProductAccessPayload,
  TransferPayload,
} from './ownership.types'
import { api } from '@/services/api'

export const ownershipApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<AdminUser[], void>({
      query: () => '/admin/users',
      providesTags: ['Users'],
    }),
    getUserInsights: builder.query<AdminUserInsight[], { limit?: number } | void>({
      query: (params) => ({
        url: '/admin/users/insights',
        params: params ?? undefined,
      }),
      providesTags: ['Users'],
    }),
    getOwnership: builder.query<OwnershipInfo, void>({
      query: () => '/admin/ownership',
      providesTags: ['Ownership'],
    }),
    transferOwnership: builder.mutation<{ ok: boolean; user: AdminUser; migration?: OwnershipTransferMigrationSummary | null }, TransferPayload>({
      query: (body) => ({ url: '/admin/transfer-ownership', method: 'POST', body }),
      invalidatesTags: ['Ownership', 'Users'],
    }),
    updateBotMessages: builder.mutation<{ ok: boolean; userId: string; telegramEnabled: boolean }, { userId: string; enabled: boolean }>({
      query: ({ userId, enabled }) => ({
        url: `/admin/users/${userId}/bot-messages`,
        method: 'PATCH',
        body: { enabled },
      }),
      invalidatesTags: ['Users'],
    }),
    getUserProductAccess: builder.query<ProductAccessUserResponse, string>({
      query: (userId) => `/access/user/${userId}`,
      providesTags: ['Access'],
    }),
    grantProductAccess: builder.mutation<GrantProductAccessResponse, GrantProductAccessPayload>({
      query: (body) => ({
        url: '/access/grant',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Access', 'Users'],
    }),
    revokeProductAccess: builder.mutation<{ ok: boolean }, RevokeProductAccessPayload>({
      query: (body) => ({
        url: '/access/revoke',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Access', 'Users'],
    }),
  }),
})

export const {
  useGetUsersQuery,
  useGetUserInsightsQuery,
  useGetOwnershipQuery,
  useGetUserProductAccessQuery,
  useGrantProductAccessMutation,
  useRevokeProductAccessMutation,
  useTransferOwnershipMutation,
  useUpdateBotMessagesMutation,
} = ownershipApi
