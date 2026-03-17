// frontend/src/features/vision/services/vision.api.ts
/**
 * Vision API
 */

import { api } from '@/services/api';
import { VisionAnswers, VisionStatement } from '../types/vision.types';

export const visionApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createVision: builder.mutation<VisionStatement, VisionAnswers>({
      query: (body) => ({
        url: '/vision',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Vision', 'Onboarding']
    }),

    getVision: builder.query<VisionStatement | null, void>({
      query: () => '/vision',
      providesTags: ['Vision']
    }),

    updateVision: builder.mutation<VisionStatement, VisionAnswers & { id: string }>({
      query: (body) => ({
        url: '/vision',
        method: 'PUT',
        body
      }),
      invalidatesTags: ['Vision']
    })
  })
});

export const {
  useCreateVisionMutation,
  useGetVisionQuery,
  useUpdateVisionMutation
} = visionApi;