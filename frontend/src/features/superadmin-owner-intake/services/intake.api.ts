import { api } from '@/services/api';
import type {
  OwnerIntakeFunnelPayload,
  OwnerIntakeProductPayload,
} from '../types/intake.types';

type ProductCreateResponse = {
  id: string;
  name: string;
};

type FunnelCreateResponse = {
  funnel?: { id?: string; name?: string };
};

export const superadminOwnerIntakeApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createOwnerProduct: builder.mutation<ProductCreateResponse, OwnerIntakeProductPayload>({
      query: (body) => ({
        url: '/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Products'],
    }),
    generateOwnerFunnel: builder.mutation<FunnelCreateResponse, OwnerIntakeFunnelPayload>({
      query: (body) => ({
        url: '/funnels/ai/generate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Funnel'],
    }),
  }),
});

export const { useCreateOwnerProductMutation, useGenerateOwnerFunnelMutation } =
  superadminOwnerIntakeApi;
