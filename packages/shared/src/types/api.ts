// /starway-studio/packages/shared/src/types/api.ts

export type FunnelStageType =
  | 'Discovery'
  | 'Value'
  | 'Habit'
  | 'Depth'
  | 'Monetization'

  export type UserRole = 'admin' | 'mentor' | 'student'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  demo?: boolean
}