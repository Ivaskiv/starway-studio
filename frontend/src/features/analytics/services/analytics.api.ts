// features/analytics/services/analytics.api.ts
import { api } from '../../../services/api';

export interface AnalyticsPrediction {
  metric: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  iconName: 'Target' | 'Users' | 'DollarSign' | 'TrendingUp';
  color: string;
}

export interface AIRecommendation {
  title: string;
  description: string;
  emoji: string;
}

export interface AnalyticsResponse {
  predictions: AnalyticsPrediction[];
  recommendations: AIRecommendation[];
}

export const analyticsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    generateAnalytics: builder.mutation<AnalyticsResponse, { funnelId: string }>({
      query: ({ funnelId }) => ({
        url: '/analytics/generate',
        method: 'POST',
        body: { funnelId },
      }),
      invalidatesTags: ['Analytics'],
    }),

    saveFunnel: builder.mutation<{ id: string }, { funnelId: string }>({
      query: ({ funnelId }) => ({
        url: '/funnels/complete',
        method: 'POST',
        body: { funnelId },
      }),
      invalidatesTags: ['Funnel'],
    }),
  }),
});

export const {
  useGenerateAnalyticsMutation,
  useSaveFunnelMutation,
} = analyticsApi;