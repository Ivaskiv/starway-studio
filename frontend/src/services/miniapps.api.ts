// frontend/src/services/miniapps.api.ts
import { api } from './api';

export interface MiniApp {
  id: string;
  funnelId: string;
  name: string;
  description?: string;
  type: 'telegram' | 'web' | 'mobile';
  url?: string;
  telegramBotToken?: string;
  status: 'draft' | 'active' | 'paused';
  config: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    features: string[];
  };
  created_at: string;
  updated_at?: string;
}

export interface MiniAppAnalytics {
  appId: string;
  activeUsers: number;
  totalSessions: number;
  avgSessionDuration: number;
  conversion_rate: number;
}

export const miniappsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMiniApps: builder.query<MiniApp[], { funnelId?: string }>({
      query: ({ funnelId }) => ({
        url: '/miniapps',
        params: { funnelId },
      }),
      providesTags: ['MiniApp'],
    }),

    getMiniAppById: builder.query<MiniApp, string>({
      query: (id) => `/miniapps/${id}`,
      providesTags: (result, error, id) => [{ type: 'MiniApp', id }],
    }),

    createMiniApp: builder.mutation<MiniApp, Partial<MiniApp>>({
      query: (data) => ({
        url: '/miniapps',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['MiniApp'],
    }),

    updateMiniApp: builder.mutation<MiniApp, { id: string; data: Partial<MiniApp> }>({
      query: ({ id, data }) => ({
        url: `/miniapps/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'MiniApp', id }, 'MiniApp'],
    }),

    deleteMiniApp: builder.mutation<void, string>({
      query: (id) => ({
        url: `/miniapps/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['MiniApp'],
    }),

    getMiniAppAnalytics: builder.query<MiniAppAnalytics, string>({
      query: (appId) => `/miniapps/${appId}/analytics`,
      providesTags: ['Analytics'],
    }),

    publishMiniApp: builder.mutation<MiniApp, string>({
      query: (id) => ({
        url: `/miniapps/${id}/publish`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'MiniApp', id }],
    }),
  }),
});

export const {
  useGetMiniAppsQuery,
  useGetMiniAppByIdQuery,
  useCreateMiniAppMutation,
  useUpdateMiniAppMutation,
  useDeleteMiniAppMutation,
  useGetMiniAppAnalyticsQuery,
  usePublishMiniAppMutation,
} = miniappsApi;