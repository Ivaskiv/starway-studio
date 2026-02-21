// features/ai-mentor/components/OnboardingFlow/OnboardingFlow.tsx
import type { ComponentType } from 'react';
import { useMentorOnboarding } from '../../hooks/useMentorOnboarding';

import OnboardingProgress from './OnboardingProgress';
import VisionStep from './steps/VisionStep';
import GoalStep from './steps/GoalStep';
import ContextStep from './steps/ContextStep';
import CompletedStep from './steps/CompletedStep';

const STEP_MAP: Record<string, ComponentType> = {
  vision: VisionStep,
  goal: GoalStep,
  goals: GoalStep,
  choice: ContextStep,
  context: ContextStep,
  actions: ContextStep,
  completed: CompletedStep,
};

export default function OnboardingFlow() {
  const onboarding = useMentorOnboarding();

  if (!onboarding.isOnboarding || !onboarding.progress) {
    return null;
  }

  const StepComponent =
    STEP_MAP[onboarding.progress.stage] ?? VisionStep;

  return (
    <div className="glass-card p-5 space-y-4 border border-white/10">
      <OnboardingProgress
        progress={onboarding.getProgressPercentage()}
        stage={onboarding.progress.stage}
      />

      <StepComponent />
    </div>
  );
}
