import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import {
  useGenerateFunnelBlueprintMutation,
  useGenerateStepVariantsMutation,
  useSaveFunnelFromBlueprintMutation,
} from '../services/ai-generator.api';

import {
  ATTEMPTS_PER_STEP,
  TOTAL_STEPS,
  type AIGeneratorState,
  type GenerationAttempt,
  type StepData,
} from '../../products/types/generator.types';
interface GenerateStepResponse {
  variants: string[];
}

const createInitialStepsData = (): StepData[] =>
  Array.from({ length: TOTAL_STEPS }, (_, i) => ({
    number: i + 1,
    userInput: '',
    attempts: [],
    remainingAttempts: ATTEMPTS_PER_STEP,
    selectedAttemptId: null,
  }));

export function useAIGeneratorManager(): AIGeneratorState & {
  handleUserInput: (stepNumber: number, value: string) => void;
  handleGenerate: (stepNumber: number) => Promise<void>;
  handleSelectVariant: (stepNumber: number, attemptId: string) => void;
  handleNextStep: () => void;
  handlePreviousStep: () => void;
  handleGenerateBlueprint: () => Promise<void>;
  handleSaveFunnel: () => Promise<void>;
  resetGenerator: () => void;
} {
  const navigate = useNavigate();

  const [generateStep] = useGenerateStepVariantsMutation();
  const [generateBlueprint] = useGenerateFunnelBlueprintMutation();
  const [saveFunnel] = useSaveFunnelFromBlueprintMutation();

  const [state, setState] = useState<AIGeneratorState>({
    currentStep: 1,
    stepsData: createInitialStepsData(),
    totalRemainingAttempts: TOTAL_STEPS * ATTEMPTS_PER_STEP,
    isGenerating: false,
    generatedBlueprint: null,
    error: null,
  });

  // ===== INPUT =====
  const handleUserInput = useCallback((stepNumber: number, value: string) => {
    setState(prev => ({
      ...prev,
      stepsData: prev.stepsData.map(s =>
        s.number === stepNumber ? { ...s, userInput: value } : s,
      ),
    }));
  }, []);

  // ===== GENERATE STEP =====
  const handleGenerate = useCallback(
    async (stepNumber: number) => {
      const step = state.stepsData[stepNumber - 1];

      if (!step.userInput.trim()) {
        toast.error('Введи відповідь');
        return;
      }

      if (step.remainingAttempts <= 0) {
        toast.error('Спроби закінчились');
        return;
      }

      setState(p => ({ ...p, isGenerating: true }));

      try {
        const context = state.stepsData
          .slice(0, stepNumber - 1)
          .reduce<Record<string, string>>((acc, s) => {
            const selected = s.attempts.find(a => a.id === s.selectedAttemptId);
            if (selected) acc[`step${s.number}`] = selected.content;
            return acc;
          }, {});

        const res: GenerateStepResponse = await generateStep({
          stepNumber,
          userInput: step.userInput,
          context,
        }).unwrap();

        const attempts: GenerationAttempt[] = res.variants.map((content, i) => ({
          id: `${stepNumber}-${Date.now()}-${i}`,
          content,
          created_at: new Date().toISOString(),
          isSelected: false,
        }));

        setState(prev => ({
          ...prev,
          isGenerating: false,
          totalRemainingAttempts: prev.totalRemainingAttempts - 1,
          stepsData: prev.stepsData.map(s =>
            s.number === stepNumber
              ? {
                  ...s,
                  attempts: [...s.attempts, ...attempts],
                  remainingAttempts: s.remainingAttempts - 1,
                  selectedAttemptId: null,
                }
              : s,
          ),
        }));
      } catch {
        setState(p => ({ ...p, isGenerating: false }));
        toast.error('Помилка генерації');
      }
    },
    [state.stepsData, generateStep],
  );

  // ===== SELECT =====
  const handleSelectVariant = useCallback((stepNumber: number, attemptId: string) => {
    setState(prev => ({
      ...prev,
      stepsData: prev.stepsData.map(s =>
        s.number === stepNumber
          ? {
              ...s,
              selectedAttemptId: attemptId,
              attempts: s.attempts.map(a => ({
                ...a,
                isSelected: a.id === attemptId,
              })),
            }
          : s,
      ),
    }));
  }, []);

  // ===== NAVIGATION =====
  const handleNextStep = useCallback(() => {
    const step = state.stepsData[state.currentStep - 1];

    if (!step.selectedAttemptId && !step.userInput.trim()) {
      toast.error('Обери варіант або напиши відповідь');
      return;
    }

    if (state.currentStep < TOTAL_STEPS) {
      setState(p => ({ ...p, currentStep: p.currentStep + 1 }));
    } else {
      handleGenerateBlueprint();
    }
  }, [state]);

  const handlePreviousStep = useCallback(() => {
    if (state.currentStep > 1) {
      setState(p => ({ ...p, currentStep: p.currentStep - 1 }));
    }
  }, [state.currentStep]);

  // ===== BLUEPRINT =====
  const handleGenerateBlueprint = useCallback(async () => {
    setState(p => ({ ...p, isGenerating: true }));

    try {
      const payload = state.stepsData.map(s => {
        const selected = s.attempts.find(a => a.id === s.selectedAttemptId);
        return {
          number: s.number,
          userInput: s.userInput,
          selectedContent: selected?.content || s.userInput,
        };
      });

      const blueprint = await generateBlueprint({ stepsData: payload }).unwrap();

      setState(p => ({
        ...p,
        isGenerating: false,
        generatedBlueprint: blueprint,
      }));

      toast.success('Готово 🔥');
    } catch {
      setState(p => ({ ...p, isGenerating: false }));
      toast.error('Blueprint зламався');
    }
  }, [state.stepsData, generateBlueprint]);

  // ===== SAVE =====
  const handleSaveFunnel = useCallback(async () => {
    if (!state.generatedBlueprint) return;

    try {
      const res = await saveFunnel({ blueprint: state.generatedBlueprint }).unwrap();
      navigate(`/dashboard/funnels/${res.funnelId}/edit`);
    } catch {
      toast.error('Не збереглось');
    }
  }, [state.generatedBlueprint, saveFunnel, navigate]);

  const resetGenerator = useCallback(() => {
    setState({
      currentStep: 1,
      stepsData: createInitialStepsData(),
      totalRemainingAttempts: TOTAL_STEPS * ATTEMPTS_PER_STEP,
      isGenerating: false,
      generatedBlueprint: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    handleUserInput,
    handleGenerate,
    handleSelectVariant,
    handleNextStep,
    handlePreviousStep,
    handleGenerateBlueprint,
    handleSaveFunnel,
    resetGenerator,
  };
}
