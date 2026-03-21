// frontend/src/features/consultation/services/consultation.api.ts
/**
 * Consultation API - RTK Query (Frontend)
 */

import { api } from '@/services/api';
import { Consultation, ConsultationTrigger } from '../types/types';

export const consultationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ✅ HTTP GET запит до backend
    checkTriggers: builder.query<ConsultationTrigger | null, void>({
      query: () => '/consultation/triggers',
      providesTags: ['Consultation']
    }),

    // ✅ HTTP POST запит до backend
    bookConsultation: builder.mutation<Consultation, { scheduledAt: string; triggerReason?: string }>({
      query: (body) => ({
        url: '/consultation/book',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Consultation']
    }),

    // ✅ HTTP GET запит до backend
    getMyConsultations: builder.query<Consultation[], void>({
      query: () => '/consultation/my',
      providesTags: ['Consultation']
    }),

    // ✅ HTTP PATCH запит до backend
    updateConsultationStatus: builder.mutation<Consultation, { 
      id: string; 
      status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'; 
      notes?: string 
    }>({
      query: ({ id, ...body }) => ({
        url: `/consultation/${id}/status`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: ['Consultation']
    })
  })
});

// ✅ Експортуємо hooks для використання в компонентах
export const {
  useCheckTriggersQuery,
  useBookConsultationMutation,
  useGetMyConsultationsQuery,
  useUpdateConsultationStatusMutation
} = consultationApi;