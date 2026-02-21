// backend/src/modules/funnel/types.ts
import type { Product } from '@prisma/client';

export type FunnelStatus = 'draft' | 'active' | 'archived';

export interface FunnelInput {
  name: string;
  productIds: string[];
  status?: FunnelStatus;
}

export interface FunnelWithProducts {
  id: string;
  code: string;
  ownerId: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  products: Product[];
}

export interface AIFunnelStage {
  name: string;
  action: string;
  headline: string;
  cta: string;
  emailSequence: string[];
}

export interface AIFunnelResult {
  concept: string;
  stages: AIFunnelStage[];
  aiRecommendations: string[];
  suggestedProducts: {
    name: string;
    description: string;
    priceCents: number;
  }[];
}

export interface GenerateAIFunnelInput {
  userPrompt: string;
  businessType?: string;
  targetAudience?: string;
}