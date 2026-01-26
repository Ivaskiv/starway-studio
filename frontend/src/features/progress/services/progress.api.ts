// frontend/src/features/progress/services/progress.api.ts
import { api } from '../../../services/api'
import type { Progress } from '../types/progress.types'


export const progressApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // 1️ Прогрес конкретного користувача
    getProgress: builder.query<Progress, string>({
      query: (user_id) => `/progress/${user_id}`, // user_id передається в URL
      providesTags: ['UserProgress'],
    }),

    // 2️ Огляд прогресу всіх користувачів (для адміна)
    getAdminProgressOverview: builder.query<Progress[], void>({
      query: () => '/progress/admin/overview',
      providesTags: ['AdminProgress'],
    }),

    // 3️ Загальний огляд прогресу
    getProgressOverview: builder.query<Progress[], void>({
      query: () => '/progress/overview',
      providesTags: ['UserProgress'],
    }),

    // 4️ Прогрес за певною датою
    getProgressByDate: builder.query<Progress[], { user_id: string; date: string }>({
      query: ({ user_id, date }) => `/progress/${user_id}/date?date=${date}`,
      providesTags: ['UserProgress'],
    }),

    // 5️ Щотижневі активності
    getWeeklyActivity: builder.query<Progress[], { user_id: string }>({
      query: ({ user_id }) => `/progress/${user_id}/weekly`,
      providesTags: ['UserProgress'],
    }),
  }),
})

export const {
  useGetProgressQuery,
  useGetAdminProgressOverviewQuery,
  useGetProgressOverviewQuery,
  useGetProgressByDateQuery,
  useGetWeeklyActivityQuery,
} = progressApi
