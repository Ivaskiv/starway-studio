// backend/src/modules/funnel/types.ts


// ================= INPUT =================


export interface GenerateAIFunnelInput {
  userPrompt: string
  businessType?: string
  targetAudience?: string
}

// ================= AI =================

export interface AIFunnelStageInput {
  name: string
  action: string
  headline: string
  cta: string
  emailSequence: string[]
}

export interface AIFunnelResult {
  concept: string
  stages: AIFunnelStageInput[]
  aiRecommendations: string[]
  suggestedProducts: {
    name: string
    description: string
    priceCents: number
  }[]
}


