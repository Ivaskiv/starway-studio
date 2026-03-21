// frontend/src/features/ai-generator/hooks/useGenerationAttempts.ts

import { ATTEMPTS_PER_STEP } from '@/features/ai-generator/types/wizard.types';
import { useCallback, useState } from 'react';

export function useGenerationAttempts(initialAttempts: number = ATTEMPTS_PER_STEP) {
  const [remainingAttempts, setRemainingAttempts] = useState(initialAttempts);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [carriedOverAttempts, setCarriedOverAttempts] = useState(0);

  const useAttempt = useCallback(() => {
    if (remainingAttempts > 0) {
      setRemainingAttempts(prev => prev - 1);
      setUsedAttempts(prev => prev + 1);
      return true;
    }
    return false;
  }, [remainingAttempts]);

  const carryOverToNextStep = useCallback(() => {
    const remaining = remainingAttempts;
    setCarriedOverAttempts(remaining);
    return remaining;
  }, [remainingAttempts]);

  const resetWithCarryOver = useCallback((carried: number) => {
    setRemainingAttempts(ATTEMPTS_PER_STEP + carried);
    setUsedAttempts(0);
    setCarriedOverAttempts(0);
  }, []);

  return {
    remainingAttempts,
    usedAttempts,
    carriedOverAttempts,
    useAttempt,
    carryOverToNextStep,
    resetWithCarryOver,
    can_generate: remainingAttempts > 0,
  };
}
