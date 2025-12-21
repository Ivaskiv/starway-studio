// src/features/demo/demoTypes.ts

import { FunnelStageType } from "@starway/shared/src/types/api"

export type DemoRole = 'mentor' | 'student' | 'admin'

export interface DemoUser {
  id: string
  name: string
  email: string
  password: string
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

  active: boolean
  step: number
  loading: boolean
  mentor: DemoUser | null
  student: DemoUser | null
   admin: DemoUser
  funnel: DemoFunnelResult | null
  error?: string
}
