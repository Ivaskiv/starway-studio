export interface AssistantState {
  wheelCompleted: boolean
  morningCompleted: boolean
  eveningCompleted: boolean
  hasProduct: boolean
}

export interface AssistantRecommendation {
  productId: string
  reason: string
}

export interface AssistantReply {
  message: string
  recommendedProducts?: AssistantRecommendation[]
}