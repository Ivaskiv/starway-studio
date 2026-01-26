// shared/types/ai.types.ts
// # AIConfig, AIFieldFocus, GenerationsBalance, AIFunnelAssistantProps, AIFunnelAssistantState

import { FunnelDraft } from "./funnel.types";

/* ======================================================
  AI CONFIG
====================================================== */

export interface AIConfig {
  model: 'gpt-4' | 'gpt-3.5-turbo';
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

// ═══════════════════════════════════════════════════════════════
// AI FIELDS
// ═══════════════════════════════════════════════════════════════

export type AIFieldFocus =
  | 'name'
  | 'audience'
  | 'niche'
  | 'productType'
  | 'goal'
  | 'headline'
  | 'description'
  | 'cta'
  | 'structure';

// ═══════════════════════════════════════════════════════════════
// GENERATIONS
// ═══════════════════════════════════════════════════════════════

export interface GenerationsBalance {
  base: number;
  bonus: number;
  total: number;
  usedToday: number;
}

// ═══════════════════════════════════════════════════════════════
// AI ASSISTANT PROPS
// ═══════════════════════════════════════════════════════════════

export interface AIFunnelAssistantProps {
  currentField: AIFieldFocus;
  funnelDraft: Partial<FunnelDraft>;
  generations: {
    base: number;
    bonus: number;
  };
  isGenerating: boolean;
  onGenerate: (result: string) => void;
}
