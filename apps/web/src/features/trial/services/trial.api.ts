//frontend/src/features/trial/services/trial.api.ts
/**
 * Trial API
 */

import { api } from '@/services/api';

export interface TrialStatus {
  userId: string;
  isActive: boolean;
  daysUsed: number;
  daysTotal: number;
  onboardingCompleted: boolean;
  dailyCycleStarted: boolean;
  isPaid: boolean;
  startedAt: string | null;
  endsAt: string | null;
  daysLeft: number;
  currentDay: number;
  progress: number;
  status: string | null;
  hasDay4Mirror: boolean;
  hasDay7Mirror: boolean;
}

export const trialApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Start trial
    startTrial: builder.mutation<void, void>({
      query: () => ({
        url: '/trial/start',
        method: 'POST'
      }),
      invalidatesTags: ['Trial', 'Access']
    }),

    // Get trial status
    getTrialStatus: builder.query<TrialStatus, void>({
      query: () => '/trial/status',
      providesTags: ['Trial']
    }),

    // Generate mirror
    generateMirror: builder.mutation<{ analysis: string }, { day: 4 | 7 }>({
      query: (body) => ({
        url: '/trial/mirror',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Trial', 'Mirror']
    })
  })
});

export const {
  useStartTrialMutation,
  useGetTrialStatusQuery,
  useGenerateMirrorMutation
} = trialApi;
