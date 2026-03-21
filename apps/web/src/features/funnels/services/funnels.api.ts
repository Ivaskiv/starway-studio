import { api } from '@/services/api';

type FunnelProduct = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  priceCents?: number;
};

export type FunnelEntity = {
  id: string;
  code: string;
  ownerId: string;
  name: string;
  status: 'draft' | 'active' | 'archived' | string;
  createdAt: string;
  updatedAt: string;
  products: FunnelProduct[];
};

export const funnelsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getFunnels: builder.query<FunnelEntity[], { includeAll?: boolean } | void>({
      query: (args) => ({
        url: '/funnels',
        method: 'GET',
        params: args?.includeAll ? { includeAll: 1 } : undefined,
      }),
      transformResponse: (response: { funnels: FunnelEntity[] } | FunnelEntity[]) =>
        Array.isArray(response) ? response : response.funnels,
      providesTags: ['Funnel'],
    }),

    getFunnelById: builder.query<{ funnel: FunnelEntity }, string>({
      query: (id) => ({
        url: `/funnels/${id}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'Funnel', id }],
    }),

    updateFunnel: builder.mutation<
      { funnel: FunnelEntity },
      { id: string; name: string; status: 'draft' | 'active' | 'archived' }
    >({
      query: ({ id, ...body }) => ({
        url: `/funnels/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, args) => [{ type: 'Funnel', id: args.id }, 'Funnel'],
    }),

    getAttachableProducts: builder.query<{ products: FunnelProduct[] }, string>({
      query: (id) => ({
        url: `/funnels/${id}/available-products`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'Funnel', id }],
    }),

    attachFunnelProduct: builder.mutation<{ funnel: FunnelEntity }, { id: string; productId: string }>({
      query: ({ id, productId }) => ({
        url: `/funnels/${id}/products`,
        method: 'POST',
        body: { productId },
      }),
      invalidatesTags: (_result, _error, args) => [{ type: 'Funnel', id: args.id }, 'Funnel'],
    }),

    detachFunnelProduct: builder.mutation<{ funnel: FunnelEntity }, { id: string; productId: string }>({
      query: ({ id, productId }) => ({
        url: `/funnels/${id}/products/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, args) => [{ type: 'Funnel', id: args.id }, 'Funnel'],
    }),

    generateFunnel: builder.mutation<{ funnel: string }, { answers: Record<string, string> }>({
      query: (body) => ({
        url: '/funnels/generate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Funnel'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetFunnelsQuery,
  useGetFunnelByIdQuery,
  useUpdateFunnelMutation,
  useGenerateFunnelMutation,
  useGetAttachableProductsQuery,
  useAttachFunnelProductMutation,
  useDetachFunnelProductMutation,
} = funnelsApi;
