// frontend/src/features/mirrors/services/mirror.api.ts
/**
 * Mirror API
 */

import { api } from '@/services/api';
import { TrialMirror } from '../types/mirror.types';

export const mirrorApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Get trial mirror
    getTrialMirror: builder.query<TrialMirror | null, { day: 4 | 7 }>({
      query: ({ day }) => `/trial/mirror?day=${day}`,
      providesTags: (result, error, { day }) => [{ type: 'Mirror', id: `day-${day}` }]
    }),

    // Generate mirror (from trial.api.ts)
    // Already exists in trial.api.ts - reuse it
  })
});

export const {
  useGetTrialMirrorQuery
} = mirrorApi;