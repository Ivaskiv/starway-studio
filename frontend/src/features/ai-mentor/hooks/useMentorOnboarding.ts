/**
 * useMentorOnboarding Hook
 * Керування онбордингом для paid користувачів (72 години)
 */

import type { RootState } from '@/app/store';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  ONBOARDING_RULES,
  ONBOARDING_STAGES,
  calculateOnboardingProgress,
  getNextOnboardingStage,
  getOnboardingStageByHours,
  isOnboardingStageAccessible,
  shouldShowOnboardingReminder,
} from '../config/onboarding.config';
import type { OnboardingProgress, OnboardingStage } from '../types/mentor.types';
import { isTrialUser } from '@/shared/utils/access.utils';

// ============================================================================
// HOOK
// ============================================================================

export function useMentorOnboarding() {
  const user = useSelector((state: RootState) => state.auth.user);
  // fix code_x: onboarding payload can exist in runtime response even if local User type is narrower.
  const onboarding = useSelector((state: RootState) => (state.auth.user as any)?.onboarding);

  const [showReminder, setShowReminder] = useState(false);

  // Розрахунок прогресу
  const progress = useMemo((): OnboardingProgress | null => {
    if (!onboarding || !user || isTrialUser(user)) {
      return null;
    }

    const startedAt = onboarding.startedAt;
    const hoursElapsed = calculateHoursElapsed(startedAt);
    const currentStage = onboarding.currentStage || getOnboardingStageByHours(hoursElapsed);
    const completedStages = onboarding.completedStages || [];

    return {
      stage: currentStage,
      startedAt,
      completedStages,
      currentStageStartedAt: onboarding.currentStageStartedAt || startedAt,
      isCompleted: currentStage === 'COMPLETED',
      hoursElapsed,
    };
  }, [onboarding, user]);

  // Перевірка чи потрібно показати нагадування
  useEffect(() => {
    if (!progress || progress.isCompleted) {
      setShowReminder(false);
      return;
    }

    const shouldShow = shouldShowOnboardingReminder(progress.stage, progress.currentStageStartedAt);
    setShowReminder(shouldShow);
  }, [progress]);

  // Методи
  const canAccessStage = (stage: OnboardingStage): boolean => {
    if (!progress) return false;
    return isOnboardingStageAccessible(progress.stage, stage, progress.hoursElapsed);
  };

  const getCurrentStageConfig = () => {
    if (!progress) return null;
    return ONBOARDING_STAGES[progress.stage];
  };

  const getNextStage = (): OnboardingStage | null => {
    if (!progress) return null;
    return getNextOnboardingStage(progress.stage);
  };

  const getProgressPercentage = (): number => {
    if (!progress) return 0;
    return calculateOnboardingProgress(progress.startedAt, progress.completedStages);
  };

  const isStageCompleted = (stage: OnboardingStage): boolean => {
    if (!progress) return false;
    return progress.completedStages.includes(stage);
  };

  const shouldBlockOtherModules = (): boolean => {
    if (!progress || progress.isCompleted) return false;
    return ONBOARDING_RULES.BLOCK_OTHER_MODULES;
  };

  const getAllowedModules = (): readonly string[] => {
    return ONBOARDING_RULES.ALLOWED_MODULES_DURING_ONBOARDING;
  };

  const getTimeRemainingInStage = (): { hours: number; minutes: number } | null => {
    if (!progress || progress.isCompleted) return null;

    const stageConfig = ONBOARDING_STAGES[progress.stage];
    const stageStartHour = stageConfig.timeWindow.startHour;
    const stageEndHour = stageConfig.timeWindow.endHour;

    if (stageEndHour === Infinity) return null;

    const stageDurationHours = stageEndHour - stageStartHour;
    const hoursInStage = calculateHoursElapsed(progress.currentStageStartedAt);
    const remainingHours = Math.max(0, stageDurationHours - hoursInStage);

    const hours = Math.floor(remainingHours);
    const minutes = Math.round((remainingHours - hours) * 60);

    return { hours, minutes };
  };

  return {
    // Стан
    progress,
    isOnboarding: !!progress && !progress.isCompleted,
    showReminder,

    // Методи
    canAccessStage,
    getCurrentStageConfig,
    getNextStage,
    getProgressPercentage,
    isStageCompleted,
    shouldBlockOtherModules,
    getAllowedModules,
    getTimeRemainingInStage,

    // Конфіг
    stages: ONBOARDING_STAGES,
    rules: ONBOARDING_RULES,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateHoursElapsed(startedAt: string): number {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60);
}

// ============================================================================
// ADDITIONAL HOOKS
// ============================================================================

/**
 * Перевірка чи користувач в процесі онбордингу
 */
export function useIsOnboarding(): boolean {
  const { isOnboarding } = useMentorOnboarding();
  return isOnboarding;
}

/**
 * Отримати поточний етап онбордингу
 */
export function useCurrentOnboardingStage(): OnboardingStage | null {
  const { progress } = useMentorOnboarding();
  return progress?.stage || null;
}

/**
 * Перевірка чи завершено онбординг
 */
export function useIsOnboardingCompleted(): boolean {
  const { progress } = useMentorOnboarding();
  return progress?.isCompleted || false;
}

export default useMentorOnboarding;
