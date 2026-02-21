/**
 * System Prompts
 */

import type { OnboardingStage } from '../types/index.js';

export const STAGE_PROMPTS: Record<OnboardingStage, string> = {
  ENTRY: `Ти - AI ментор. Привітай користувача тепло...`,
  VISION: `Допоможи сформулювати бачення...`,
  // ... etc
};

export function buildSystemPrompt(stage: OnboardingStage, context: any): string {
  const basePrompt = STAGE_PROMPTS[stage];
  // Add context
  return basePrompt;
}