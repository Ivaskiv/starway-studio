// features/funnels/services/funnels.api.ts

import { api } from '@/services/api';
import type {
  Funnel,
  GenerateVariantsRequest,
  GenerateVariantsResponse,
} from '../types/funnel.types';

export const funnelsApi = api.injectEndpoints({
  endpoints: builder => ({
    getFunnels: builder.query<Funnel[], void>({
      query: () => '/funnels',
      transformResponse: (response: { funnels: Funnel[] }) => response.funnels,
      providesTags: (result = []) => [
        ...result.map(({ id }) => ({ type: 'Funnel' as const, id })),
        'Funnel',
      ],
    }),

    getFunnelById: builder.query<Funnel, string>({
      query: id => `/funnels/${id}`,
      providesTags: (_, __, id) => [{ type: 'Funnel', id }],
    }),

    createFunnel: builder.mutation<Funnel, Partial<Funnel>>({
      query: data => ({ url: '/funnels', method: 'POST', body: data }),
      invalidatesTags: ['Funnel'],
    }),

    updateFunnel: builder.mutation<Funnel, { id: string } & Partial<Funnel>>({
      query: ({ id, ...data }) => ({ url: `/funnels/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: (_, __, { id }) => [{ type: 'Funnel', id }, 'Funnel'],
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          funnelsApi.util.updateQueryData('getFunnelById', id, draft => {
            Object.assign(draft, patch);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    deleteFunnel: builder.mutation<void, string>({
      query: id => ({ url: `/funnels/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Funnel'],
    }),

    generateVariants: builder.mutation<GenerateVariantsResponse, GenerateVariantsRequest>({
      query: data => ({ url: '/funnels/generate-variants', method: 'POST', body: data }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetFunnelsQuery,
  useGetFunnelByIdQuery,
  useCreateFunnelMutation,
  useUpdateFunnelMutation,
  useDeleteFunnelMutation,
  useGenerateVariantsMutation,
} = funnelsApi;
