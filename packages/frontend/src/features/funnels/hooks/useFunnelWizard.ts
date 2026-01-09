// features/funnels/hooks/useFunnelWizard.ts

import { useState, useCallback, useMemo } from 'react'
import { useGenerateVariantsMutation } from '../services/funnels.api'
import { STEP_DEFINITIONS, ATTEMPTS_PER_STEP, type FunnelAttempt } from '../types/funnel.types'

export interface StepState {
  userInput: string
  attempts: FunnelAttempt[]
  selectedVariant: string | null
  remainingAttempts: number
}

export function useFunnelWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [stepsState, setStepsState] = useState<Record<number, StepState>>(() =>
    STEP_DEFINITIONS.reduce((acc, def) => ({
      ...acc,
      [def.order]: { userInput: '', attempts: [], selectedVariant: null, remainingAttempts: ATTEMPTS_PER_STEP }
    }), {})
  )

  const [generateVariants, { isLoading }] = useGenerateVariantsMutation()

  const stepDefinition = useMemo(() => 
    STEP_DEFINITIONS.find(s => s.order === currentStep)!, 
    [currentStep]
  )

  const stepState = stepsState[currentStep]
  const completedSteps = useMemo(() =>
    Object.entries(stepsState)
      .filter(([_, s]) => s.selectedVariant)
      .map(([order]) => Number(order)),
    [stepsState]
  )

  const context = useMemo(() =>
    Object.entries(stepsState).reduce((acc, [order, s]) => {
      if (s.selectedVariant) {
        acc[`step${order}`] = s.selectedVariant
      }
      return acc
    }, {} as Record<string, string>),
    [stepsState]
  )

  const updateStepState = useCallback((stepNum: number, updates: Partial<StepState>) => {
    setStepsState(prev => ({
      ...prev,
      [stepNum]: { ...prev[stepNum], ...updates }
    }))
  }, [])

  const handleInputChange = useCallback((value: string) => {
    updateStepState(currentStep, { userInput: value })
  }, [currentStep, updateStepState])

  const handleGenerate = useCallback(async () => {
    if (!stepState.userInput.trim() || stepState.remainingAttempts <= 0) return

    try {
      const { variants } = await generateVariants({
        stepNumber: currentStep,
        userInput: stepState.userInput.trim(),
        context,
      }).unwrap()

      const newAttempts: FunnelAttempt[] = variants.map((content, i) => ({
        id: `${currentStep}-${Date.now()}-${i}`,
        content,
        isSelected: false,
      }))

      updateStepState(currentStep, {
        attempts: [...stepState.attempts, ...newAttempts],
        remainingAttempts: stepState.remainingAttempts - 1,
      })
    } catch (err) {
      console.error('Generation error:', err)
    }
  }, [currentStep, stepState, context, generateVariants, updateStepState])

  const handleSelectVariant = useCallback((id: string) => {
    const attempts = stepState.attempts.map(a => ({
      ...a,
      isSelected: a.id === id,
    }))
    const selected = attempts.find(a => a.id === id)
    
    updateStepState(currentStep, {
      attempts,
      selectedVariant: selected?.content ?? null,
    })
  }, [currentStep, stepState.attempts, updateStepState])

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= STEP_DEFINITIONS.length) {
      setCurrentStep(step)
    }
  }, [])

  const nextStep = useCallback(() => {
    if (currentStep < STEP_DEFINITIONS.length) {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep])

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const getFunnelData = useCallback(() => 
    Object.entries(stepsState).reduce((acc, [order, s]) => {
      const def = STEP_DEFINITIONS.find(d => d.order === Number(order))
      if (def && s.selectedVariant) {
        acc[def.title] = s.selectedVariant
      }
      return acc
    }, {} as Record<string, string>),
    [stepsState]
  )

  return {
    currentStep,
    stepDefinition,
    stepState,
    completedSteps,
    totalSteps: STEP_DEFINITIONS.length,
    isGenerating: isLoading,
    handleInputChange,
    handleGenerate,
    handleSelectVariant,
    goToStep,
    nextStep,
    prevStep,
    getFunnelData,
    canProceed: !!stepState.selectedVariant,
  }
}