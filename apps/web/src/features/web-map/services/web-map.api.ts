import { api } from '@/services/api'

// ── Base ──────────────────────────────────────────────────────
export interface BaseEntity {
  id: string
  createdAt?: string
  updatedAt?: string
}

// ── Statuses ──────────────────────────────────────────────────
export type GoalStatus = 'active' | 'on_track' | 'behind' | 'completed'
export type MonthStatus = 'planned' | 'active' | 'done' | 'skipped'
export type WebMapStatus = 'draft' | 'active' | 'completed'

// ── Goal ──────────────────────────────────────────────────────
export interface WebMapGoal extends BaseEntity {
  order: number
  isMain: boolean
  sphere: string

  title: string
  description?: string | null
  actions: string[]
  factors?: string[]
  resources?: string[]
  constraints?: string[]
  solutions?: string[]
  scoreFrom?: number | null
  scoreTo?: number | null
  timeframeMonths?: number | null

  progress: number
  status: GoalStatus

  targetMonth?: number | null
}

export interface WebMapGraphNode {
  id: string
  label: string
  kind: 'center' | 'goal' | 'factor' | 'resource' | 'constraint' | 'solution'
  parentId?: string | null
  sphere?: string | null
  description?: string | null
}

export interface WebMapGraphEdge {
  id: string
  source: string
  target: string
  label?: string | null
}

export interface WebMapSeed {
  title: string
  scoreFrom: number
  scoreTo: number
  timeframeMonths: number
  factors: string[]
  resources: string[]
  constraints: string[]
  solutions: string[]
}

export interface WebMapSystemGoal {
  sphere: string
  title: string
  description: string
  actions: string[]
  factors: string[]
  resources: string[]
  constraints: string[]
  solutions: string[]
  scoreFrom?: number | null
  scoreTo?: number | null
  timeframeMonths?: number | null
}

export interface WebMapSystem {
  statement: string
  identityStatement: string
  mainGoalSphere?: string | null
  goals: WebMapSystemGoal[]
  graph: {
    nodes: WebMapGraphNode[]
    edges: WebMapGraphEdge[]
  }
  dailyCycle: {
    trackedNodeIds: string[]
    primaryNodeId?: string | null
    prompt: string
  }
  orchestrator: {
    constraints: string[]
    resources: string[]
    primaryConstraint?: string | null
    recommendedFocus: string
    behaviorTags: string[]
    stage: string
  }
  seed: WebMapSeed
}

// ── Month ─────────────────────────────────────────────────────
export interface MonthPlan extends BaseEntity {
  month: number
  year: number

  focus?: string | null

  actions: string[]
  goalIds: string[]

  status: MonthStatus

  aiAnalysis?: string | null

  doneActions: string[]
  missedActions: string[]

  // optional розширення (з бекенду може приходити)
  nextMonthRec?: string | null
  completedActions?: string[]
  skippedActions?: string[]
}

// ── WebMap ────────────────────────────────────────────────────
export interface WebMap extends BaseEntity {
  year: number

  identityStatement?: string | null
  mainGoalId?: string | null

  status: WebMapStatus

  goals: WebMapGoal[]
  months: MonthPlan[]
  system?: WebMapSystem | null
}

// ── API Types ─────────────────────────────────────────────────
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
  status?: GoalStatus
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

// ── API ───────────────────────────────────────────────────────
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
