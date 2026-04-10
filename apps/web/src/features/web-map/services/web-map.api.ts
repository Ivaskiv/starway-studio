import { api } from '@/services/api'

export interface WebMapGoal {
  id: string
  order: number
  isMain: boolean
  sphere: string
  title: string
  description?: string | null
  actions: string[]
  progress: number
  status: 'active' | 'on_track' | 'behind' | 'completed'
  targetMonth?: number | null
}

export interface MonthPlan {
  id: string
  month: number
  year: number
  focus?: string | null
  actions: string[]
  goalIds: string[]
  status: 'planned' | 'active' | 'done' | 'skipped'
  aiAnalysis?: string | null
  doneActions: string[]
  missedActions: string[]
  nextMonthRec?: string | null
  completedActions: string[]
  skippedActions: string[]
}

export interface WebMap {
  id: string
  year: number
  identityStatement?: string | null
  mainGoalId?: string | null
  status: 'draft' | 'active' | 'completed'
  goals: WebMapGoal[]
  months: MonthPlan[]
}

type GetWebMapResponse = {
  map: WebMap | null
}

type GenerateWebMapRequest = {
  wheelScores: Record<string, number>
}

type GenerateWebMapResponse = {
  map: WebMap
}

type UpdateGoalProgressRequest = {
  id: string
  progress: number
  status?: WebMapGoal['status']
}

type UpdateGoalProgressResponse = {
  goal: WebMapGoal
}

type RunMonthlyAnalysisResponse = {
  monthPlan: MonthPlan | null
}

type DailyQuestionResponse = {
  question: {
    question: string
    goalId: string
  } | null
}

export const webMapApi = api.injectEndpoints({
  endpoints: builder => ({
    getWebMap: builder.query<WebMap | null, void>({
      query: () => '/web-map',
      transformResponse: (response: GetWebMapResponse) => response.map,
      providesTags: ['WebMap'],
    }),

    generateWebMap: builder.mutation<WebMap, GenerateWebMapRequest>({
      query: body => ({
        url: '/web-map/generate',
        method: 'POST',
        body,
      }),
      transformResponse: (response: GenerateWebMapResponse) => response.map,
      invalidatesTags: ['WebMap'],
    }),

    updateGoalProgress: builder.mutation<WebMapGoal, UpdateGoalProgressRequest>({
      query: ({ id, ...body }) => ({
        url: `/web-map/goals/${id}`,
        method: 'PUT',
        body,
      }),
      transformResponse: (response: UpdateGoalProgressResponse) => response.goal,
      invalidatesTags: ['WebMap'],
    }),

    runMonthlyAnalysis: builder.mutation<MonthPlan | null, void>({
      query: () => ({
        url: '/web-map/analysis',
        method: 'POST',
      }),
      transformResponse: (response: RunMonthlyAnalysisResponse) => response.monthPlan,
      invalidatesTags: ['WebMap'],
    }),

    getDailyQuestion: builder.query<DailyQuestionResponse['question'], void>({
      query: () => '/web-map/daily-question',
      transformResponse: (response: DailyQuestionResponse) => response.question,
      providesTags: ['WebMapDailyQuestion'],
    }),
  }),
})

export const {
  useGetWebMapQuery,
  useGenerateWebMapMutation,
  useUpdateGoalProgressMutation,
  useRunMonthlyAnalysisMutation,
  useGetDailyQuestionQuery,
} = webMapApi
