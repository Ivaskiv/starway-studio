/**
 * AI Generator Types - COMPLETE
 */

// ==========================================
// ENUMS
// ==========================================

export type FunnelType = 'FAST_CASH' | 'DIAGNOSTIC' | 'EVERGREEN';

export type ProductKind = 
  | 'WHEEL'
  | 'AI_MENTOR'
  | 'VIDEO_REMINDER'
  | 'UPSELL_5_POINTS';

// ==========================================
// STEP GENERATION
// ==========================================

export interface GenerateStepInput {
  stepNumber: number;
  userInput: string;
  context?: Record<string, string>;
}

export interface GenerateStepResponse {
  success: boolean;
  variants: string[];
  remainingAttempts: number;
}

export interface BlueprintStepInput {
  number: number;
  userInput: string;
  selectedContent: string;
}

// ==========================================
// ONBOARDING
// ==========================================

export interface OwnerOnboardingPayload {
  ownerEmail?: string;
  productName?: string;
  productCode?: string;
  productDescription?: string;
  funnelName?: string;
  funnelGoal?: string;
  coreTask?: string;
  businessType?: string;
  targetAudience?: string;
  telegramBotName?: string;
  telegramBotToken?: string;
  telegramContact?: string;
  initialProducts?: string;
}

// ==========================================
// BLUEPRINT
// ==========================================

export interface FunnelBlueprint {
  id?: string;
  name: string;
  type: FunnelType;
  targetAudience: string;
  painPoint?: string;
  quickWin?: string;
  
  steps: {
    hook: string;
    diagnostic: string;
    quickWin: string;
    coreOffer: string;
    upsell: string;
  };
  
  coreOffer: {
    name: string;
    price: number;
    format: string;
  };
  
  upsell?: {
    name: string;
    price: number;
  } | null;
  
  financialModel: {
    averageCheck: number;
    requiredSales: number;
    conversion_rate: number;
    targetRevenue: number;
  };
  
  automation: string[];
  
  products?: Array<{
    id?: string;
    name: string;
    title?: string;
    price: number;
    type: 'one_time' | 'subscription';
    format: string;
    integrations: string[];
    goals?: string[];
    purpose?: string;
    includesMentorship?: boolean;
  }>;
}

export interface ProductBlueprint {
  kind: ProductKind;
  name: string;
  description?: string;
  price: number;
  currency: 'EUR';
  config: Record<string, any>;
}

// ==========================================
// WORKFLOW
// ==========================================

export interface AIGeneratorWorkflowState {
  currentStep: number;
  stepsData: BlueprintStepInput[];
  totalRemainingAttempts: number;
  generatedBlueprint: FunnelBlueprint | null;
  onboarding: OwnerOnboardingPayload;
  updatedAt?: string;
  version?: number;
}

// ==========================================
// SAVE BLUEPRINT
// ==========================================

export interface SaveBlueprintInput {
  blueprint: FunnelBlueprint;
  onboarding?: OwnerOnboardingPayload;
}

export interface SaveBlueprintResult {
  funnelId: string;
  productIds: string[];
}

// ==========================================
// CONSTANTS
// ==========================================

export const TOTAL_PHASES = 11;
export const AI_PRODUCER_WORKFLOW_KEY = 'aiProducerWorkflow';