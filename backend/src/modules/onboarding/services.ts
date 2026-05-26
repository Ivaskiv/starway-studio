// backend/src/modules/onboarding/services/onboarding.ts
import { prisma } from '../../db/client.js';
import { ONBOARDING_STAGES, STAGE_CONFIGS } from './types.js';
import type {
  CompleteStageDto,
  OnboardingProgress,
  OnboardingStage,
  UpdateProgressDto,
} from './types.js';

function toDbOnboardingStep(stage: OnboardingStage): 'START_FLOW' | 'TRIAL_FINAL' {
  if (stage === 'COMPLETED') return 'TRIAL_FINAL'
  return 'START_FLOW'
}

function resolveOnboardingStage(
  currentStep: string | null | undefined,
): OnboardingStage | null {
  if (currentStep && ONBOARDING_STAGES.includes(currentStep as OnboardingStage)) {
    return currentStep as OnboardingStage
  }
  return null
}

// ==========================
// GET PROGRESS
// ==========================
export async function getProgress(userId: string): Promise<OnboardingProgress> {
  // Беремо юзера з бази
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      currentStep: true,
      onboardingStartedAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) throw new Error('User not found');

  // Якщо онбординг ще не почався — ініціалізуємо
  const resolvedStage = resolveOnboardingStage(user.currentStep)
  if (!resolvedStage || !user.onboardingStartedAt) {
    const now = new Date();
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStep: 'START_FLOW',
        onboardingStartedAt: now,
      },
    });

    return {
      userId,
      currentStage: 'ENTRY',
      completedStages: [],
      startedAt: now,
      completedAt: null,
      lastActivityAt: null,
      isCompleted: false,
    };
  }

  const currentStage = resolvedStage;
  const currentIndex = ONBOARDING_STAGES.indexOf(currentStage);
  const completedStages = ONBOARDING_STAGES.slice(0, currentIndex);

  return {
    userId,
    currentStage,
    completedStages,
    startedAt: user.onboardingStartedAt!,
    completedAt: null,
    lastActivityAt: user.lastLoginAt ?? null,
    isCompleted: currentStage === 'COMPLETED',
  };
}

// ==========================
// COMPLETE STAGE
// ==========================
export async function completeStage(dto: CompleteStageDto): Promise<OnboardingProgress> {
  const progress = await getProgress(dto.userId);

  if (progress.currentStage !== dto.stage) {
    throw new Error(`Cannot complete stage ${dto.stage}`);
  }

  const config = STAGE_CONFIGS[dto.stage];
  const nextStage: OnboardingStage = config.nextStage ?? 'COMPLETED';

  await prisma.user.update({
    where: { id: dto.userId },
    data: {
      currentStep: toDbOnboardingStep(nextStage),
      ...(nextStage === 'COMPLETED' && { onboardingCompletedAt: new Date() }),
    },
  });

  return getProgress(dto.userId);
}

// ==========================
// FORCE UPDATE PROGRESS
// ==========================
export async function updateProgress(dto: UpdateProgressDto): Promise<OnboardingProgress> {
  await prisma.user.update({
    where: { id: dto.userId },
    data: {
      currentStep: toDbOnboardingStep(dto.stage),
      ...(dto.stage === 'COMPLETED' && { onboardingCompletedAt: new Date() }),
    },
  });

  return getProgress(dto.userId);
}

// ==========================
// ACCESS CONTROL
// ==========================
export async function canAccessStage(userId: string, stage: OnboardingStage): Promise<boolean> {
  const progress = await getProgress(userId);

  if (progress.currentStage === stage) return true;

  const currentIndex = ONBOARDING_STAGES.indexOf(progress.currentStage);
  const targetIndex = ONBOARDING_STAGES.indexOf(stage);

  return targetIndex <= currentIndex + 1;
}

// ==========================
// UPDATE LAST ACTIVITY
// ==========================
export async function updateLastActivity(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}
