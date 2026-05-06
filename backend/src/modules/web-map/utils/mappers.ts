type StrategyGoalLike = {
  id: string
  createdAt?: Date | string
  updatedAt?: Date | string
  order?: number | null
  isMain?: boolean | null
  sphere: string
  title: string
  description?: string | null
  actions?: string[] | null
  monthlyActions?: string[] | null
  progress?: number | null
  status?: string | null
  targetMonth?: number | null
  priority?: number | null
  factors?: string[] | null
  resources?: string[] | null
  constraints?: string[] | null
  solutions?: string[] | null
  scoreFrom?: number | null
  scoreTo?: number | null
  timeframeMonths?: number | null
}

type MonthlyReviewLike = {
  id: string
  createdAt?: Date | string
  updatedAt?: Date | string
  month: number
  year: number
  focus?: string | null
  actions?: string[] | null
  goalIds?: string[] | null
  status?: string | null
  aiAnalysis?: string | null
  doneActions?: string[] | null
  missedActions?: string[] | null
  completedActions?: string[] | null
  skippedActions?: string[] | null
  nextMonthRec?: string | null
}

type StrategyMapLike = {
  id: string
  createdAt?: Date | string
  updatedAt?: Date | string
  userId: string
  year: number
  vision?: string | null
  identityStatement?: string | null
  mainGoalId?: string | null
  status?: string | null
  goals?: StrategyGoalLike[]
  monthlyReviews?: MonthlyReviewLike[]
  system?: unknown
}

const toIso = (value?: Date | string) => {
  if (!value) return undefined
  return typeof value === 'string' ? value : value.toISOString()
}

export function toMonthPlan(month: MonthlyReviewLike) {
  return {
    id: month.id,
    createdAt: toIso(month.createdAt),
    updatedAt: toIso(month.updatedAt),
    month: month.month,
    year: month.year,
    focus: month.focus ?? null,
    actions: month.actions ?? [],
    goalIds: month.goalIds ?? [],
    status: (month.status ?? 'planned') as 'planned' | 'active' | 'done' | 'skipped',
    aiAnalysis: month.aiAnalysis ?? null,
    doneActions: month.doneActions ?? month.completedActions ?? [],
    missedActions: month.missedActions ?? month.skippedActions ?? [],
    nextMonthRec: month.nextMonthRec ?? null,
    completedActions: month.completedActions ?? month.doneActions ?? [],
    skippedActions: month.skippedActions ?? month.missedActions ?? [],
  }
}

export function toWebMap(map: StrategyMapLike) {
  return {
    id: map.id,
    createdAt: toIso(map.createdAt),
    updatedAt: toIso(map.updatedAt),
    userId: map.userId,
    year: map.year,
    vision: map.vision ?? null,
    identityStatement: map.identityStatement ?? null,
    mainGoalId: map.mainGoalId ?? null,
    status: (map.status ?? 'draft') as 'draft' | 'active' | 'completed',
    system: map.system ?? null,
    goals: (map.goals ?? []).map((goal, index) => ({
      id: goal.id,
      createdAt: toIso(goal.createdAt),
      updatedAt: toIso(goal.updatedAt),
      order: goal.order ?? goal.priority ?? index,
      isMain: Boolean(goal.isMain),
      sphere: goal.sphere,
      title: goal.title,
      description: goal.description ?? null,
      actions: goal.actions ?? goal.monthlyActions ?? [],
      progress: goal.progress ?? 0,
      status: (goal.status ?? 'active') as 'active' | 'on_track' | 'behind' | 'completed',
      targetMonth: goal.targetMonth ?? null,
      factors: goal.factors ?? [],
      resources: goal.resources ?? [],
      constraints: goal.constraints ?? [],
      solutions: goal.solutions ?? [],
      scoreFrom: goal.scoreFrom ?? null,
      scoreTo: goal.scoreTo ?? null,
      timeframeMonths: goal.timeframeMonths ?? null,
    })),
    months: (map.monthlyReviews ?? []).map(toMonthPlan),
  }
}
