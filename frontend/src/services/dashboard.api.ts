import api from "@/services/api";

export interface DashboardStats {
  total_funnels: number;
  total_users: number;
  total_revenue: number;
}

export const dashboardApi = api.injectEndpoints({
  endpoints: builder => ({
    getDashboardStats: builder.query<DashboardStats, { period: string }>({
      query: params => ({
        url: '/dashboard/stats',
        params,
      }),
    }),
  }),
});

export const { useGetDashboardStatsQuery } = dashboardApi;
