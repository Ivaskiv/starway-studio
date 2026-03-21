// frontend/src/features/wheel/hooks/useWheelFlowState.ts
// ─── Єдиний файл що потрібно створити. WheelForm.tsx — не чіпаємо. ────────────
import { useCallback, useMemo, useState } from 'react';
import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types';

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface SphereState {
  categoryId: string;
  score: number | null;
  comment: string;
}

export interface WheelFlowState {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  spheres: SphereState[];
  activeSphere: SphereState | null;
  activeSphereIndex: number;
  isIntroStep: boolean;
  isResultStep: boolean;
  canProceed: boolean;
  setScore:   (index: number, value: number) => void;
  setComment: (index: number, value: string) => void;
  generationsUsed: number;
  setGenerationsUsed: React.Dispatch<React.SetStateAction<number>>;
  restart:    () => void;
  clearDraft: () => void;
}

// ─── Draft persistence ─────────────────────────────────────────────────────────
const DRAFT_KEY = 'starway_wheel_draft_v1';

const loadDraft = (): SphereState[] | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === WHEEL_CATEGORIES.length) {
      return parsed as SphereState[];
    }
  } catch { /* ignore */ }
  return null;
};

const persistDraft = (s: SphereState[]) => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(s)); } catch { /* ignore */ }
};

const removeDraft = () => {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
};

const buildFresh = (): SphereState[] =>
  WHEEL_CATEGORIES.map(cat => ({ categoryId: cat.id, score: null, comment: '' }));

// ─── Hook ──────────────────────────────────────────────────────────────────────
// WheelForm очікує:
//   step 0           → isIntroStep
//   step 1…8         → sphere, activeSphereIndex = step - 1
//   step 9           → isResultStep
//   canProceed       → для сфери: score !== null
//   activeSphere     → null на intro/result
export function useWheelFlowState(): WheelFlowState {
  const [step, setStep]                       = useState(0);
  const [generationsUsed, setGenerationsUsed] = useState(0);
  const [spheres, setSpheres]                 = useState<SphereState[]>(
    () => loadDraft() ?? buildFresh(),
  );

  const isIntroStep  = step === 0;
  const isResultStep = step === 9;                    // WheelForm uses min(9,…) so 9 = result

  const activeSphereIndex = isIntroStep || isResultStep ? 0 : step - 1;

  const activeSphere: SphereState | null =
    !isIntroStep && !isResultStep ? (spheres[activeSphereIndex] ?? null) : null;

  const canProceed = useMemo(() => {
    if (isIntroStep || isResultStep) return true;
    return spheres[activeSphereIndex]?.score !== null;
  }, [isIntroStep, isResultStep, spheres, activeSphereIndex]);

  const setScore = useCallback((index: number, value: number) => {
    setSpheres(prev => {
      const next = prev.map((s, i) => i === index ? { ...s, score: value } : s);
      persistDraft(next);
      return next;
    });
  }, []);

  const setComment = useCallback((index: number, value: string) => {
    setSpheres(prev => {
      const next = prev.map((s, i) => i === index ? { ...s, comment: value } : s);
      persistDraft(next);
      return next;
    });
  }, []);

  const restart = useCallback(() => {
    const fresh = buildFresh();
    setSpheres(fresh);
    setStep(0);
    removeDraft();
  }, []);

  const clearDraft = useCallback(() => { removeDraft(); }, []);

  return {
    step, setStep,
    spheres,
    activeSphere, activeSphereIndex,
    isIntroStep, isResultStep,
    canProceed,
    setScore, setComment,
    generationsUsed, setGenerationsUsed,
    restart, clearDraft,
  };
}