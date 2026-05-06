export type UserState =
  | 'new'
  | 'engaged'
  | 'stuck'
  | 'churn_risk'
  | 'converting'
  | 'paid'

export type StateResolverInput = {
  scores?: {
    engagement?: number | null
    procrastination?: number | null
    avoidance?: number | null
  } | null
  patterns?: string[] | null
  conversion?: {
    triggered?: boolean | null
  } | null
  subscription?: {
    active?: boolean | null
  } | null
}

function score(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0
}

function hasPattern(patterns: string[] | null | undefined, target: string) {
  return Array.isArray(patterns) && patterns.includes(target)
}

export function resolveUserState(input: StateResolverInput): UserState {
  if (input.subscription?.active) {
    return 'paid'
  }

  if (input.conversion?.triggered) {
    return 'converting'
  }

  if (hasPattern(input.patterns, 'drop_off')) {
    return 'churn_risk'
  }

  if (score(input.scores?.procrastination) > 70) {
    return 'stuck'
  }

  if (score(input.scores?.avoidance) > 70) {
    return 'stuck'
  }

  if (score(input.scores?.engagement) > 70) {
    return 'engaged'
  }

  return 'new'
}
