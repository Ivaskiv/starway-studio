/**
 * System Prompts
 */

import type { OnboardingStage } from '../types.js';

export const STAGE_PROMPTS: Record<OnboardingStage, string> = {
  ENTRY: `Ти - AI ментор. Привітай користувача тепло...`,
  VISION: `Допоможи сформулювати бачення...`,
  GOAL: `Допоможи сформулювати конкретну ціль і критерії прогресу...`,
  CHOICE: `Поясни, як робити усвідомлений вибір у моменті...`,
  ACTIONS: `Сформуй короткий план дій на найближчі 24 години...`,
  COMPLETED: `Підсумуй завершення етапу і дай наступний чіткий крок...`,
};

export function buildSystemPrompt(stage: OnboardingStage, context: any): string {
  const basePrompt = STAGE_PROMPTS[stage];
  // Add context
  return basePrompt;
}
