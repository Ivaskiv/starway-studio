// features/wheel/hooks/useWheel.ts

import { useState, useCallback, useMemo } from 'react'
import { WHEEL_CATEGORIES, TOTAL_CATEGORIES, type WheelScore, type WheelFormState } from '../types/wheel.types'
import { useSubmitWheelMutation, useAnalyzeWheelMutation } from '../api/wheel.api'
import toast from 'react-hot-toast'

const createInitialScores = (): WheelScore[] =>
  WHEEL_CATEGORIES.map((cat) => ({
    categoryId: cat.id,
    score: 5,
  }))

export const useWheel = (userId: string) => {
  const [submitWheel, { isLoading: isSubmitting }] = useSubmitWheelMutation()
  const [analyzeWheel, { isLoading: isAnalyzing }] = useAnalyzeWheelMutation()

  const [state, setState] = useState<WheelFormState>({
    currentIndex: 0,
    scores: createInitialScores(),
    isComplete: false,
  })

  const currentCategory = WHEEL_CATEGORIES[state.currentIndex]
  const currentScore = state.scores.find((s) => s.categoryId === currentCategory?.id)?.score ?? 5
  const isFirstStep = state.currentIndex === 0
  const isLastStep = state.currentIndex === TOTAL_CATEGORIES - 1
  const progress = ((state.currentIndex + 1) / TOTAL_CATEGORIES) * 100

  const setScore = useCallback((score: number) => {
    setState((prev) => ({
      ...prev,
      scores: prev.scores.map((s) =>
        s.categoryId === WHEEL_CATEGORIES[prev.currentIndex].id
          ? { ...s, score }
          : s
      ),
    }))
  }, [])

  const setNotes = useCallback((notes: string) => {
    setState((prev) => ({
      ...prev,
      scores: prev.scores.map((s) =>
        s.categoryId === WHEEL_CATEGORIES[prev.currentIndex].id
          ? { ...s, notes }
          : s
      ),
    }))
  }, [])

  const nextStep = useCallback(() => {
    if (!isLastStep) {
      setState((prev) => ({ ...prev, currentIndex: prev.currentIndex + 1 }))
    }
  }, [isLastStep])

  const prevStep = useCallback(() => {
    if (!isFirstStep) {
      setState((prev) => ({ ...prev, currentIndex: prev.currentIndex - 1 }))
    }
  }, [isFirstStep])

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < TOTAL_CATEGORIES) {
      setState((prev) => ({ ...prev, currentIndex: index }))
    }
  }, [])

  const submit = useCallback(async () => {
    try {
      const result = await submitWheel({ userId, scores: state.scores }).unwrap()
      setState((prev) => ({ ...prev, isComplete: true }))
      toast.success('Колесо балансу збережено! 🎯')
      return result
    } catch {
      toast.error('Помилка збереження')
      return null
    }
  }, [userId, state.scores, submitWheel])

  const analyze = useCallback(async () => {
    try {
      return await analyzeWheel({ userId, scores: state.scores }).unwrap()
    } catch {
      toast.error('Помилка аналізу')
      return null
    }
  }, [userId, state.scores, analyzeWheel])

  const reset = useCallback(() => {
    setState({
      currentIndex: 0,
      scores: createInitialScores(),
      isComplete: false,
    })
  }, [])

  // Статистика
  const stats = useMemo(() => {
    const total = state.scores.reduce((sum, s) => sum + s.score, 0)
    const average = total / TOTAL_CATEGORIES
    const sorted = [...state.scores].sort((a, b) => b.score - a.score)
    const strengths = sorted.slice(0, 3).map((s) => s.categoryId)
    const gaps = sorted.slice(-3).reverse().map((s) => s.categoryId)

    return { total, average, strengths, gaps }
  }, [state.scores])

  return {
    // State
    currentIndex: state.currentIndex,
    currentCategory,
    currentScore,
    scores: state.scores,
    isComplete: state.isComplete,
    
    // Progress
    progress,
    isFirstStep,
    isLastStep,
    
    // Actions
    setScore,
    setNotes,
    nextStep,
    prevStep,
    goToStep,
    submit,
    analyze,
    reset,
    
    // Loading
    isSubmitting,
    isAnalyzing,
    isLoading: isSubmitting || isAnalyzing,
    
    // Stats
    stats,
  }
}