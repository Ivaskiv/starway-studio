// backend/src/modules/ai-generator/types.ts
// fix code_x: shared DTO contracts for AI Producer phase endpoints and save pipeline.

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

export interface SaveBlueprintInput {
  blueprint: FunnelBlueprint;
  onboarding?: OwnerOnboardingPayload;
}

export interface AIGeneratorWorkflowState {
  currentStep: number;
  stepsData: BlueprintStepInput[];
  totalRemainingAttempts: number;
  generatedBlueprint: FunnelBlueprint | null;
  onboarding: OwnerOnboardingPayload;
  updatedAt?: string;
}

export interface FunnelBlueprint {
  id?: string;
  name: string;
  type: 'fast_cash' | 'diagnostic' | 'evergreen';
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
    // fix code_x: accept optional template product ids from frontend (audit_basic, audit_upsell, etc.).
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
