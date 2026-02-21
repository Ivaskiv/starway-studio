import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import {
  useGetWorkflowQuery,
  useGenerateFunnelBlueprintMutation,
  useGenerateStepVariantsMutation,
  useSaveFunnelFromBlueprintMutation,
  useSaveWorkflowMutation,
} from '../services/ai-generator.api';
import { selectCurrentUser } from '@/features/auth/services/auth.slice';

import {
  ATTEMPTS_PER_STEP,
  OWNER_ONBOARDING_DEFAULTS,
  TOTAL_STEPS,
  type AIGeneratorState,
  type GenerationAttempt,
  type OwnerOnboardingProfile,
  type StepData,
} from '../../products/types/generator.types';
interface GenerateStepResponse {
  variants: string[];
}

const STORAGE_PREFIX = 'starway_ai_producer_state_v1';
const MAX_TOTAL_ATTEMPTS = TOTAL_STEPS * ATTEMPTS_PER_STEP;
type PersistedStep = {
  number: number;
  userInput: string;
  communityPrompt?: string;
  selectedContent: string;
};
type PersistedWorkflow = {
  currentStep: number;
  stepsData: PersistedStep[];
  totalRemainingAttempts: number;
  generatedBlueprint: AIGeneratorState['generatedBlueprint'];
  onboarding: OwnerOnboardingProfile;
  updatedAt?: string;
};

const toPersistedSteps = (steps: StepData[]): PersistedStep[] =>
  steps.map((step) => {
    const selected = step.attempts.find((attempt) => attempt.id === step.selectedAttemptId);
    return {
      number: step.number,
      userInput: step.userInput,
      communityPrompt: step.communityPrompt || '',
      selectedContent: selected?.content || step.userInput,
    };
  });

const fromPersistedSteps = (persisted: PersistedStep[]): StepData[] =>
  Array.from({ length: TOTAL_STEPS }, (_, i) => {
    const number = i + 1;
    const matched = persisted.find((s) => s.number === number);
    const selectedContent = matched?.selectedContent || '';
    const hasSelected = Boolean(selectedContent.trim());
    const attemptId = hasSelected ? `${number}-restored` : null;
    return {
      number,
      userInput: matched?.userInput || '',
      communityPrompt: matched?.communityPrompt || '',
      attempts: hasSelected
        ? [
            {
              id: `${number}-restored`,
              content: selectedContent,
              createdAt: new Date().toISOString(),
              isSelected: true,
            },
          ]
        : [],
      remainingAttempts: hasSelected ? 0 : ATTEMPTS_PER_STEP,
      selectedAttemptId: attemptId,
      isSaved: hasSelected,
    };
  });

const createInitialStepsData = (): StepData[] =>
  Array.from({ length: TOTAL_STEPS }, (_, i) => ({
    number: i + 1,
    userInput: '',
    communityPrompt: '',
    attempts: [],
    remainingAttempts: ATTEMPTS_PER_STEP,
    selectedAttemptId: null,
    isSaved: false,
  }));

function getSafeTotalRemainingFromSteps(steps: StepData[]): number {
  const computed = steps.reduce((acc, step) => acc + Math.max(0, step.remainingAttempts || 0), 0);
  return Math.max(0, Math.min(MAX_TOTAL_ATTEMPTS, computed));
}

export function useAIGeneratorManager(): AIGeneratorState & {
  handleUserInput: (stepNumber: number, value: string) => void;
  handleCommunityPrompt: (stepNumber: number, value: string) => void;
  handleGenerate: (stepNumber: number) => Promise<void>;
  getAvailableGenerationsForStep: (stepNumber: number) => number;
  handleSelectVariant: (stepNumber: number, attemptId: string) => void;
  handleSaveCurrentStep: () => void;
  handleGoToStep: (stepNumber: number) => void;
  handleNextStep: () => void;
  handlePreviousStep: () => void;
  handleGenerateBlueprint: () => Promise<void>;
  handleSaveFunnel: () => Promise<void>;
  resetGenerator: () => void;
  onboarding: OwnerOnboardingProfile;
  setOnboardingField: <K extends keyof OwnerOnboardingProfile>(
    key: K,
    value: OwnerOnboardingProfile[K],
  ) => void;
  applyNadyaTemplate: () => void;
} {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const storageKey = useMemo(
    () => `${STORAGE_PREFIX}:${currentUser?.id || 'anonymous'}`,
    [currentUser?.id],
  );

  const [generateStep] = useGenerateStepVariantsMutation();
  const [generateBlueprint] = useGenerateFunnelBlueprintMutation();
  const [saveFunnel] = useSaveFunnelFromBlueprintMutation();
  const [saveWorkflow] = useSaveWorkflowMutation();
  const { data: serverWorkflowData, isFetching: isWorkflowFetching } = useGetWorkflowQuery(undefined, {
    skip: !currentUser?.id,
  });

  const [state, setState] = useState<AIGeneratorState>({
    currentStep: 1,
    stepsData: createInitialStepsData(),
    totalRemainingAttempts: TOTAL_STEPS * ATTEMPTS_PER_STEP,
    isGenerating: false,
    generatedBlueprint: null,
    error: null,
  });
  const [onboarding, setOnboarding] = useState<OwnerOnboardingProfile>(OWNER_ONBOARDING_DEFAULTS);
  const [restoredFromLocal, setRestoredFromLocal] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const getAvailableGenerationsForStep = useCallback(
    (stepNumber: number): number => {
      const current = state.stepsData.find((s) => s.number === stepNumber);
      if (!current) return 0;

      // fix code_x: carry-over budget — unused generations from previous phases are available for current phase.
      const carried = state.stepsData
        .filter((s) => s.number < stepNumber)
        .reduce((acc, s) => acc + Math.max(0, s.remainingAttempts), 0);

      return Math.max(0, current.remainingAttempts + carried);
    },
    [state.stepsData],
  );

  useEffect(() => {
    // fix code_x: restore unfinished AI Producer workflow after refresh/navigation.
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as PersistedWorkflow;

      const restoredSteps =
        Array.isArray(parsed.stepsData) && parsed.stepsData.length === TOTAL_STEPS
          ? fromPersistedSteps(parsed.stepsData)
          : createInitialStepsData();
      const safeStep =
        typeof parsed.currentStep === 'number' && parsed.currentStep >= 1 && parsed.currentStep <= TOTAL_STEPS
          ? parsed.currentStep
          : 1;

      setState((prev) => ({
        ...prev,
        currentStep: safeStep,
        stepsData: restoredSteps,
        // fix code_x: guard against stale persisted budgets after changing steps/attempts config (e.g. 11x3=33).
        totalRemainingAttempts: getSafeTotalRemainingFromSteps(restoredSteps),
        generatedBlueprint: parsed.generatedBlueprint || null,
      }));

      if (parsed.onboarding) {
        setOnboarding((prev) => ({ ...prev, ...parsed.onboarding }));
      }
      setRestoredFromLocal(true);
    } catch {
      // ignore broken localStorage payload
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || restoredFromLocal || isWorkflowFetching) return;
    const workflow = serverWorkflowData?.workflow;
    if (!workflow) return;
    if (!Array.isArray(workflow.stepsData) || workflow.stepsData.length !== TOTAL_STEPS) return;

    const restoredSteps = fromPersistedSteps(workflow.stepsData);
    const safeStep =
      typeof workflow.currentStep === 'number' && workflow.currentStep >= 1 && workflow.currentStep <= TOTAL_STEPS
        ? workflow.currentStep
        : 1;

    setState((prev) => ({
      ...prev,
      currentStep: safeStep,
      stepsData: restoredSteps,
      // fix code_x: backend/local workflow can contain outdated total; always recompute from normalized steps.
      totalRemainingAttempts: getSafeTotalRemainingFromSteps(restoredSteps),
      generatedBlueprint: workflow.generatedBlueprint || null,
    }));

    setOnboarding((prev) => ({ ...prev, ...(workflow.onboarding || {}) }));
  }, [hydrated, restoredFromLocal, isWorkflowFetching, serverWorkflowData?.workflow]);

  useEffect(() => {
    if (!hydrated) return;

    const payload: PersistedWorkflow = {
      currentStep: state.currentStep,
      stepsData: toPersistedSteps(state.stepsData),
      totalRemainingAttempts: state.totalRemainingAttempts,
      generatedBlueprint: state.generatedBlueprint,
      onboarding,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [
    hydrated,
    state.currentStep,
    state.stepsData,
    state.totalRemainingAttempts,
    state.generatedBlueprint,
    onboarding,
    storageKey,
  ]);

  useEffect(() => {
    if (!hydrated || !currentUser?.id) return;

    const workflow: PersistedWorkflow = {
      currentStep: state.currentStep,
      stepsData: toPersistedSteps(state.stepsData),
      totalRemainingAttempts: state.totalRemainingAttempts,
      generatedBlueprint: state.generatedBlueprint,
      onboarding,
      updatedAt: new Date().toISOString(),
    };

    const t = setTimeout(() => {
      void saveWorkflow({ workflow }).unwrap().catch(() => {
        // server sync is best-effort; localStorage remains source for offline continuity
      });
    }, 900);

    return () => clearTimeout(t);
  }, [
    hydrated,
    currentUser?.id,
    state.currentStep,
    state.stepsData,
    state.totalRemainingAttempts,
    state.generatedBlueprint,
    onboarding,
    saveWorkflow,
  ]);

  // ===== INPUT =====
  const handleUserInput = useCallback((stepNumber: number, value: string) => {
    setState(prev => ({
      ...prev,
      stepsData: prev.stepsData.map(s =>
        s.number === stepNumber ? { ...s, userInput: value, isSaved: false } : s,
      ),
    }));
  }, []);

  const handleCommunityPrompt = useCallback((stepNumber: number, value: string) => {
    setState(prev => ({
      ...prev,
      stepsData: prev.stepsData.map(s =>
        s.number === stepNumber ? { ...s, communityPrompt: value.slice(0, 1200), isSaved: false } : s,
      ),
    }));
  }, []);

  // ===== GENERATE STEP =====
  const handleGenerate = useCallback(
    async (stepNumber: number) => {
      const step = state.stepsData[stepNumber - 1];
      const availableForStep = getAvailableGenerationsForStep(stepNumber);

      if (!step.userInput.trim()) {
        toast.error('Введіть відповідь для поточної фази');
        return;
      }

      if (availableForStep <= 0 || state.totalRemainingAttempts <= 0) {
        toast.error('Ліміт генерацій вичерпано');
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
          context: {
            ...context,
            community_builder_prompt: step.communityPrompt || '',
          },
        }).unwrap();

        const attempts: GenerationAttempt[] = res.variants.map((content, i) => ({
          id: `${stepNumber}-${Date.now()}-${i}`,
          content,
          createdAt: new Date().toISOString(),
          isSelected: false,
        }));

        setState(prev => {
          // Spend generation from current step first, then from nearest previous step with unused budget.
          const nextSteps = [...prev.stepsData];
          const currentIdx = nextSteps.findIndex((s) => s.number === stepNumber);
          if (currentIdx >= 0 && nextSteps[currentIdx].remainingAttempts > 0) {
            nextSteps[currentIdx] = {
              ...nextSteps[currentIdx],
              remainingAttempts: nextSteps[currentIdx].remainingAttempts - 1,
            };
          } else {
            for (let i = currentIdx - 1; i >= 0; i--) {
              if (nextSteps[i].remainingAttempts > 0) {
                nextSteps[i] = {
                  ...nextSteps[i],
                  remainingAttempts: nextSteps[i].remainingAttempts - 1,
                };
                break;
              }
            }
          }

          nextSteps[currentIdx] = {
            ...nextSteps[currentIdx],
            attempts: [...nextSteps[currentIdx].attempts, ...attempts],
            selectedAttemptId: null,
            isSaved: false,
          };

          return {
            ...prev,
            isGenerating: false,
            totalRemainingAttempts: Math.max(0, prev.totalRemainingAttempts - 1),
            stepsData: nextSteps,
          };
        });
      } catch {
        setState(p => ({ ...p, isGenerating: false }));
        toast.error('Помилка генерації фази');
      }
    },
    [state.stepsData, state.totalRemainingAttempts, generateStep, getAvailableGenerationsForStep],
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
              isSaved: false,
              attempts: s.attempts.map(a => ({
                ...a,
                isSelected: a.id === attemptId,
              })),
            }
          : s,
      ),
    }));
  }, []);

  const handleSaveCurrentStep = useCallback(() => {
    const step = state.stepsData[state.currentStep - 1];
    const rawInput = step?.userInput?.trim() || '';

    if (!step) return;

    setState((prev) => {
      const steps = [...prev.stepsData];
      const idx = prev.currentStep - 1;
      const current = steps[idx];
      if (!current) return prev;

      // fix code_x: allow saving step even without generated variant; fallback to user's own input.
      if (!current.selectedAttemptId) {
        if (!rawInput) {
          toast.error('Спочатку заповніть відповідь або оберіть AI-варіант');
          return prev;
        }

        const syntheticId = `${current.number}-manual-${Date.now()}`;
        const manualAttempt: GenerationAttempt = {
          id: syntheticId,
          content: rawInput,
          createdAt: new Date().toISOString(),
          isSelected: true,
        };

        steps[idx] = {
          ...current,
          attempts: [...current.attempts.map((a) => ({ ...a, isSelected: false })), manualAttempt],
          selectedAttemptId: syntheticId,
          isSaved: true,
        };
      } else {
        steps[idx] = { ...current, isSaved: true };
      }

      return { ...prev, stepsData: steps };
    });
    toast.success(`Фаза ${state.currentStep} збережена`);
  }, [state.currentStep, state.stepsData]);

  const handleGoToStep = useCallback((stepNumber: number) => {
    if (stepNumber < 1 || stepNumber > TOTAL_STEPS) return;

    const maxUnlocked = Math.min(
      TOTAL_STEPS,
      Math.max(
        1,
        state.stepsData.reduce((max, step) => (step.selectedAttemptId ? Math.max(max, step.number + 1) : max), 1),
      ),
    );

    if (stepNumber > maxUnlocked) {
      toast.error('Спочатку завершіть попередні кроки');
      return;
    }

    setState((prev) => ({ ...prev, currentStep: stepNumber }));
  }, [state.stepsData]);

  // ===== NAVIGATION =====
  const handleNextStep = useCallback(() => {
    const step = state.stepsData[state.currentStep - 1];

    // fix code_x: strict phase gate — must explicitly pick generated result for each phase.
    if (!step.selectedAttemptId) {
      toast.error('Спочатку згенеруйте та оберіть фінальний варіант фази');
      return;
    }
    if (!step.isSaved) {
      toast.error('Натисніть "Зберегти фазу", щоб зафіксувати результат');
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
    const notSelected = state.stepsData.find(step => !step.selectedAttemptId);
    if (notSelected) {
      toast.error(`Фаза ${notSelected.number} не завершена: оберіть фінальний AI-варіант`);
      return;
    }

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
      setOnboarding(prev => ({
        ...prev,
        productName: prev.productName || blueprint.coreOffer?.name || '',
        funnelName: prev.funnelName || blueprint.name || '',
        businessType: prev.businessType || blueprint.type || '',
        targetAudience: prev.targetAudience || blueprint.targetAudience || '',
        initialProducts:
          prev.initialProducts ||
          (blueprint.products || [])
            .map((product: { name: string }) => product.name)
            .filter(Boolean)
            .join(', '),
      }));

      toast.success('AI-продюсер: архітектура воронки готова');
    } catch {
      setState(p => ({ ...p, isGenerating: false }));
      toast.error('Не вдалося зібрати фінальну архітектуру');
    }
  }, [state.stepsData, generateBlueprint]);

  // ===== SAVE =====
  const handleSaveFunnel = useCallback(async () => {
    if (!state.generatedBlueprint) return;

    const requiredFields: Array<{ key: keyof OwnerOnboardingProfile; label: string }> = [
      { key: 'productName', label: 'Назва продукту' },
      { key: 'funnelName', label: 'Назва воронки' },
      { key: 'funnelGoal', label: 'Мета воронки' },
      { key: 'coreTask', label: 'Core task' },
      { key: 'businessType', label: 'Тип бізнесу' },
      { key: 'targetAudience', label: 'Цільова аудиторія' },
    ];

    // fix code_x: required onboarding validation before save in AI Producer flow.
    if (currentUser?.isSuperAdmin) {
      requiredFields.push({ key: 'ownerEmail', label: 'Owner email' });
    }

    const missing = requiredFields
      .filter((field) => !String(onboarding[field.key] || '').trim())
      .map((field) => field.label);

    if (missing.length > 0) {
      toast.error(`Заповніть обов'язкові поля: ${missing.join(', ')}`);
      return;
    }

    try {
      const res = await saveFunnel({ blueprint: state.generatedBlueprint, onboarding }).unwrap();
      navigate(`/dashboard/funnels/${res.funnelId}/edit`);
      toast.success('Збережено: продукт + воронка + onboarding профіль');
    } catch {
      toast.error('Не збереглось');
    }
  }, [state.generatedBlueprint, onboarding, saveFunnel, navigate, currentUser?.isSuperAdmin]);

  const resetGenerator = useCallback(() => {
    setState({
      currentStep: 1,
      stepsData: createInitialStepsData(),
      totalRemainingAttempts: TOTAL_STEPS * ATTEMPTS_PER_STEP,
      isGenerating: false,
      generatedBlueprint: null,
      error: null,
    });
    setOnboarding(OWNER_ONBOARDING_DEFAULTS);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const setOnboardingField = useCallback(
    <K extends keyof OwnerOnboardingProfile>(key: K, value: OwnerOnboardingProfile[K]) => {
      setOnboarding(prev => ({ ...prev, [key]: value }));
    },
    [],
  );

  const applyNadyaTemplate = useCallback(() => {
    // fix code_x: superadmin quick-start template to create funnel for Nadia with two required products.
    setOnboarding((prev) => ({
      ...prev,
      ownerEmail: 'nadyastarway@gmail.com',
      productName: prev.productName || 'AI Ментор',
      productCode: prev.productCode || 'ai-mentor-nadya',
      productDescription:
        prev.productDescription ||
        'AI Ментор Надя: колесо балансу, щоденні опитування, аналіз і звіти.',
      funnelName: prev.funnelName || 'AI Ментор Надя',
      funnelGoal: prev.funnelGoal || 'Колесо балансу → щоденний цикл → аналіз → звіти',
      coreTask: prev.coreTask || 'Запустити щоденну систему розвитку через AI',
      businessType: prev.businessType || 'менторство / психологія',
      targetAudience: prev.targetAudience || 'Жінки 25-45, які хочуть стабільних змін',
      telegramBotName: prev.telegramBotName || '@Starway_byNadya_Bot',
      initialProducts: 'AI Ментор, 5 точок опори',
    }));
    toast.success('Шаблон Надя застосовано');
  }, []);

  return {
    ...state,
    handleUserInput,
    handleCommunityPrompt,
    handleGenerate,
    getAvailableGenerationsForStep,
    handleSelectVariant,
    handleSaveCurrentStep,
    handleGoToStep,
    handleNextStep,
    handlePreviousStep,
    handleGenerateBlueprint,
    handleSaveFunnel,
    resetGenerator,
    onboarding,
    setOnboardingField,
    applyNadyaTemplate,
  };
}
