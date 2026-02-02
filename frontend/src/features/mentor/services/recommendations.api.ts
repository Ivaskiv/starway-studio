// /features/dailyQuestion/services/recommendations.api.ts

import { api } from '@/services/api'
import { Recommendation } from '@/features/mentor/types/mentor.types'

export const recommendationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getRecommendations: builder.query<Recommendation[], void>({
      query: () => ({
        url: '/mentor/recommendations',
      }),
      providesTags: ['Recommendations'],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetRecommendationsQuery,
} = recommendationsApi
