// frontend/src/features/admin/services/admin.api.ts

import { Product } from '../shared/types/product.types';
import { AdminSettings } from '../shared/types/profile.types';
import api from './api';

export const adminApi = api.injectEndpoints({
  endpoints: builder => ({
    // ============================================
    // PRODUCTS
    // ============================================

    createProduct: builder.mutation<Product, Partial<Product>>({
      query: body => ({
        url: '/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product'],
    }),

    updateProduct: builder.mutation<Product, { id: string; data: Partial<Product> }>({
      query: ({ id, data }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Product', id }],
    }),

    deleteProduct: builder.mutation<void, string>({
      query: id => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),

    // ============================================
    // ADMIN SETTINGS
    // ============================================

    getAdminSettings: builder.query<AdminSettings, void>({
      query: () => ({
        url: '/admin/settings',
      }),
      providesTags: ['AdminSettings'],
    }),

    updateAdminSettings: builder.mutation<AdminSettings, Partial<AdminSettings>>({
      query: body => ({
        url: '/admin/settings',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['AdminSettings'],
    }),
  }),
});

export const {
  // products
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,

  // admin settings
  useGetAdminSettingsQuery,
  useUpdateAdminSettingsMutation,
} = adminApi;
