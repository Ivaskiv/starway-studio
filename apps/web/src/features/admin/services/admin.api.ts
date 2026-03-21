import { api } from '@/services/api';
import type { AdminSettings } from '@/features/user/types/profile.types';

export interface AdminProduct {
  id: string;
  branding: {
    name: string;
    description?: string;
  };
  status: 'published' | 'draft';
  total_users: number;
  revenue: number;
}

export const adminApi = api.injectEndpoints({
  endpoints: builder => ({
    getAdminSettings: builder.query<AdminSettings, string>({
      query: adminId => ({
        url: `/admin/${adminId}/settings`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'AdminSettings', id }],
    }),

    getAdminProducts: builder.query<AdminProduct[], void>({
      query: () => '/admin/products',
      providesTags: ['AdminProducts'],
    }),
    updateAdminSettings: builder.mutation<AdminSettings, { adminId: string; settings: AdminSettings }>({
      query: ({ adminId, settings }) => ({
        url: `/admin/${adminId}/settings`,
        method: 'PUT',
        body: settings,
      }),
      invalidatesTags: (result, error, { adminId }) => [{ type: 'AdminSettings', id: adminId }],
    }),
  }),
});

export const {
  useGetAdminSettingsQuery,
  useUpdateAdminSettingsMutation,
  useGetAdminProductsQuery,
} = adminApi;
