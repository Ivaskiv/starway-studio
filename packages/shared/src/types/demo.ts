import { FunnelStageType } from "./api"

// roles
export type DemoRole = 'mentor' | 'student' | 'admin'

// users
export interface DemoUser {
  id: string
  name: string
  email: string
  password: string
  role: DemoRole
  avatar?: string
}

// funnel (demo)
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

// state shape (опційно, але логічно)
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
