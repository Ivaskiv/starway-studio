// packages/frontend/src/pages/ai-generator/AIGeneratorProvider.tsx

import {
  ATTEMPTS_PER_STEP,
  TOTAL_STEPS,
  type AIGeneratorState,
  type GenerationAttempt,
  type StepData,
} from '@/features/ai-generator/types/generator.types'
import {
  useGenerateFunnelBlueprintMutation,
  useGenerateStepVariantsMutation,
  useSaveFunnelFromBlueprintMutation,
} from '@/services/ai-generator.api'
import { createContext, ReactNode, useCallback, useContext, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

interface AIGeneratorContextType extends AIGeneratorState {
  handleUserInput: (stepNumber: number, value: string) => void
  handleGenerate: (stepNumber: number) => Promise<void>
  handleSelectVariant: (stepNumber: number, attemptId: string) => void
  handleNextStep: () => void
  handlePreviousStep: () => void
  handleGenerateBlueprint: () => Promise<void>
  handleSaveFunnel: () => Promise<void>
  resetGenerator: () => void
}

const AIGeneratorContext = createContext<AIGeneratorContextType | undefined>(undefined)

const initialStepsData: StepData[] = Array.from({ length: TOTAL_STEPS }, (_, i) => ({
  number: i + 1,
  userInput: '',
  attempts: [],
  remainingAttempts: ATTEMPTS_PER_STEP,
  selectedAttemptId: null,
}))

export function AIGeneratorProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  const [generateStep] = useGenerateStepVariantsMutation()
  const [generateBlueprint] = useGenerateFunnelBlueprintMutation()
  const [saveFunnel] = useSaveFunnelFromBlueprintMutation()

  const [state, setState] = useState<AIGeneratorState>({
    currentStep: 1,
    stepsData: initialStepsData,
    totalRemainingAttempts: TOTAL_STEPS * ATTEMPTS_PER_STEP,
    isGenerating: false,
    generatedBlueprint: null,
    error: null,
  })

  const handleUserInput = useCallback((stepNumber: number, value: string) => {
    setState(prev => ({
      ...prev,
      stepsData: prev.stepsData.map(step =>
        step.number === stepNumber ? { ...step, userInput: value } : step
      ),
    }))
  }, [])

  const handleGenerate = useCallback(
    async (stepNumber: number) => {
      const stepData = state.stepsData[stepNumber - 1]

      if (!stepData.userInput.trim()) {
        toast.error('Введіть відповідь')
        return
      }

      if (stepData.remainingAttempts <= 0) {
        toast.error('Спроби закінчились')
        return
      }

      setState(prev => ({ ...prev, isGenerating: true, error: null }))

      try {
        const context = state.stepsData
          .slice(0, stepNumber - 1)
          .reduce((acc, step) => {
            const selected = step.attempts.find(a => a.id === step.selectedAttemptId)
            if (selected) acc[`step${step.number}`] = selected.content
            return acc
          }, {} as Record<string, string>)

        const result = await generateStep({
          stepNumber,
          userInput: stepData.userInput,
          context,
        }).unwrap()

        const newAttempts: GenerationAttempt[] = result.variants.map((content, idx) => ({
          id: `${stepNumber}-${Date.now()}-${idx}`,
          content,
          createdAt: new Date().toISOString(),
          isSelected: false,
        }))

        setState(prev => ({
          ...prev,
          isGenerating: false,
          stepsData: prev.stepsData.map(step =>
            step.number === stepNumber
              ? {
                  ...step,
                  attempts: [...step.attempts, ...newAttempts],
                  remainingAttempts: step.remainingAttempts - 1,
                  selectedAttemptId: null,
                }
              : step
          ),
          totalRemainingAttempts: prev.totalRemainingAttempts - 1,
        }))
      } catch (e: any) {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error: e?.message || 'Generation error',
        }))
        toast.error('Помилка генерації')
      }
    },
    [state.stepsData, generateStep]
  )

  const handleSelectVariant = useCallback((stepNumber: number, attemptId: string) => {
    setState(prev => ({
      ...prev,
      stepsData: prev.stepsData.map(step =>
        step.number === stepNumber
          ? {
              ...step,
              selectedAttemptId: attemptId,
              attempts: step.attempts.map(att => ({
                ...att,
                isSelected: att.id === attemptId,
              })),
            }
          : step
      ),
    }))
  }, [])

  const handleNextStep = useCallback(() => {
    const step = state.stepsData[state.currentStep - 1]

    if (!step.selectedAttemptId) {
      toast.error('Оберіть один варіант')
      return
    }

    if (state.currentStep < TOTAL_STEPS) {
      setState(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1,
      }))
    } else {
      handleGenerateBlueprint()
    }
  }, [state.currentStep, state.stepsData])

  const handlePreviousStep = useCallback(() => {
    if (state.currentStep > 1) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }))
    }
  }, [state.currentStep])

  const handleGenerateBlueprint = useCallback(async () => {
    setState(prev => ({ ...prev, isGenerating: true }))

    try {
      const stepsData = state.stepsData.map(step => {
        const selected = step.attempts.find(a => a.id === step.selectedAttemptId)
        return {
          number: step.number,
          userInput: step.userInput,
          selectedContent: selected?.content || step.userInput,
        }
      })

      const blueprint = await generateBlueprint({ stepsData }).unwrap()

      setState(prev => ({
        ...prev,
        isGenerating: false,
        generatedBlueprint: blueprint,
      }))
    } catch {
      setState(prev => ({ ...prev, isGenerating: false }))
      toast.error('Помилка blueprint')
    }
  }, [state.stepsData, generateBlueprint])

  const handleSaveFunnel = useCallback(async () => {
    if (!state.generatedBlueprint) return

    setState(prev => ({ ...prev, isGenerating: true }))

    try {
      const res = await saveFunnel({ blueprint: state.generatedBlueprint }).unwrap()
      navigate(`/dashboard/funnels/${res.funnelId}/edit`)
    } catch {
      setState(prev => ({ ...prev, isGenerating: false }))
      toast.error('Помилка збереження')
    }
  }, [state.generatedBlueprint, saveFunnel, navigate])

  const resetGenerator = useCallback(() => {
    setState({
      currentStep: 1,
      stepsData: initialStepsData,
      totalRemainingAttempts: TOTAL_STEPS * ATTEMPTS_PER_STEP,
      isGenerating: false,
      generatedBlueprint: null,
      error: null,
    })
  }, [])

  return (
    <AIGeneratorContext.Provider
      value={{
        ...state,
        handleUserInput,
        handleGenerate,
        handleSelectVariant,
        handleNextStep,
        handlePreviousStep,
        handleGenerateBlueprint,
        handleSaveFunnel,
        resetGenerator,
      }}
    >
      {children}
    </AIGeneratorContext.Provider>
  )
}

export function useAIGenerator() {
  const ctx = useContext(AIGeneratorContext)
  if (!ctx) throw new Error('useAIGenerator must be used inside provider')
  return ctx
}
