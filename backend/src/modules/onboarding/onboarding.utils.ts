import { ONBOARDING_STAGES, type OnboardingStage } from './types.js';

export function isOnboardingStage(
  value: string | null | undefined
): value is OnboardingStage {
  return !!value && ONBOARDING_STAGES.includes(value as OnboardingStage);
}

export function stageIndex(stage: OnboardingStage): number {
  return ONBOARDING_STAGES.indexOf(stage);
}
