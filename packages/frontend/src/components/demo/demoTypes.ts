
export type DemoRole = 'mentor' | 'student' | 'admin'
export type FunnelStageType =
  | 'Discovery'
  | 'Value'
  | 'Habit'
  | 'Depth'
  | 'Monetization'

export interface DemoUser {
  id: string
  name: string
  email: string
  role: DemoRole
  avatar?: string
}

export interface DemoFunnelStage {
  day: number
  title: string
  type: FunnelStageType
  description: string
}

export interface DemoFunnelResult {
  title: string
  stages: DemoFunnelStage[]
}

export interface DemoState {
  active: boolean
  step: number
  loading: boolean

  mentor: DemoUser | null
  student: DemoUser | null
  admin: DemoUser | null

  funnel: DemoFunnelResult | null
  error?: string
}
