// frontend/src/features/mentor/services/mentorSetup.api.ts
import { api } from '@/services/api';
import type { WheelScore } from '@/features/wheel/types/wheel.types';

export const mentorSetupApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMentorSetup: builder.query<{ is_configured: boolean }, void>({
      query: () => '/mentor/setup',
      providesTags: ['Progress'],
    }),
    getLatestWheel: builder.query<{ id: string }, void>({
      query: () => '/mentor/wheel/latest',
      providesTags: ['Wheel'],
    }),
    createWheelAssessment: builder.mutation<void, WheelScore[]>({
      query: (scores) => ({
        url: '/mentor/wheel',
        method: 'POST',
        body: { scores },
      }),
      invalidatesTags: ['Wheel', 'Progress'],
    }),
    updateMentorSetup: builder.mutation<
      void,
      { morningQuestions: string[]; eveningQuestions: string[] }
    >({
      query: (body) => ({
        url: '/mentor/setup',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Progress'],
    }),
    downloadWheelPDF: builder.query<Blob, string>({
      query: (id) => ({
        url: `/mentor/wheel/${id}/pdf`,
        method: 'GET',
        responseHandler: (response) => response.arrayBuffer(),
      }),
      transformResponse: (data: ArrayBuffer) =>
        new Blob([data], { type: 'application/pdf' }),
    }),
  }),
});

export const {
  useGetMentorSetupQuery,
  useGetLatestWheelQuery,
  useCreateWheelAssessmentMutation,
  useUpdateMentorSetupMutation,
  useLazyDownloadWheelPDFQuery,
} = mentorSetupApi;
