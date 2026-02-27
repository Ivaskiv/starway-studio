import { useCallback, useMemo, useState } from 'react';

import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types';

export interface WheelFlowSphereState {
  categoryId: string;
  score: number | null;
  comment: string;
}

const createInitialSpheres = (): WheelFlowSphereState[] =>
  WHEEL_CATEGORIES.map((category) => ({
    categoryId: category.id,
    score: null,
    comment: '',
  }));

export const useWheelFlowState = () => {
  const [step, setStep] = useState(0);
  const [generationsUsed, setGenerationsUsed] = useState(0);
  const [spheres, setSpheres] = useState<WheelFlowSphereState[]>(createInitialSpheres);

  const activeSphereIndex = step - 1;
  const activeSphere = activeSphereIndex >= 0 && activeSphereIndex < spheres.length
    ? spheres[activeSphereIndex]
    : null;

  const isResultStep = step === 9;
  const isIntroStep = step === 0;

  const setScore = useCallback((index: number, value: number) => {
    setSpheres((prev) => prev.map((item, i) => (i === index ? { ...item, score: value } : item)));
  }, []);

  const setComment = useCallback((index: number, value: string) => {
    setSpheres((prev) => prev.map((item, i) => (i === index ? { ...item, comment: value } : item)));
  }, []);

  const canProceed = useMemo(() => {
    if (step === 0 || step === 9) return true;
    const score = spheres[step - 1]?.score;
    return typeof score === 'number' && score >= 1 && score <= 10;
  }, [step, spheres]);

  const restart = useCallback(() => {
    setStep(0);
    setGenerationsUsed(0);
    setSpheres(createInitialSpheres());
  }, []);

  return {
    step,
    setStep,
    generationsUsed,
    setGenerationsUsed,
    spheres,
    activeSphere,
    activeSphereIndex,
    isResultStep,
    isIntroStep,
    canProceed,
    setScore,
    setComment,
    restart,
  };
};
