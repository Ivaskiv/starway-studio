export type PatternType =
  | 'procrastination'
  | 'inconsistency'
  | 'drop_after_start'

export type PatternResult = {
  type: PatternType
  message: string
}
