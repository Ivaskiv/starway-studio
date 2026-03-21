export type FunnelStage = 'not_started' | 'draft' | 'ready'
export type MentorStage = 'locked' | 'active'
export type ProductStage = 'none' | 'draft' | 'published'
export type DistributionStage = 'none' | 'planned' | 'active'

export interface AssistantProgressDTO {
  funnelStage: FunnelStage
  mentorStage: MentorStage
  productStage: ProductStage
  funnelAttached: boolean
  distributionStage: DistributionStage
  nextRecommendedAction: string
}

export type AssistantStepStatus = 'locked' | 'ready' | 'completed'
export type AssistantStepAction =
  | 'open_funnel'
  | 'open_mentor'
  | 'create_product'
  | 'create_funnel'
  | 'distribute'

export interface AssistantStep {
  id: number
  title: string
  description: string
  status: AssistantStepStatus
  action?: string
  ctaLabel?: string
}
export type AssistantModule =
  | "wheel"
  | "morning"
  | "evening"
  | "producer"
  | "content"
  | "analytics"

export interface AssistantState {
  wheelCompleted: boolean
  morningCompleted: boolean
  eveningCompleted: boolean
  hasProduct: boolean
  streak: number
}

export interface AssistantEngineAction {
  type: "open_module" | "suggest"
  module?: AssistantModule
  message: string
}
