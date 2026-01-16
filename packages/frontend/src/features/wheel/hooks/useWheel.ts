// useWheel.ts
import { useAnalyzeWheelMutation, useCreateWheelAssessmentMutation } from '@/templates/ai-mentor/services/aiMentor.api'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { TOTAL_CATEGORIES, WHEEL_CATEGORIES, WheelScore } from '../types/wheel.types'

export const useWheel = (user_id: string) => {
const [state, setState] = useState<{
  currentIndex: number
  score: WheelScore[]
  isComplete: boolean
  assessmentId: string | null
}>({
  currentIndex: 0,
  score: WHEEL_CATEGORIES.map(cat => ({ category_id: cat.id, score: 5 })),
  isComplete: false,
  assessmentId: null,
})
  const [createWheel, saveState] = useCreateWheelAssessmentMutation()
  const [analyzeWheel, analyzeState] = useAnalyzeWheelMutation()

  const currentCategory = WHEEL_CATEGORIES[state.currentIndex]
  const currentScore = state.score[state.currentIndex]?.score ?? 5

  const nextStep = () => setState(prev => ({ ...prev, currentIndex: Math.min(prev.currentIndex + 1, TOTAL_CATEGORIES - 1) }))
  const prevStep = () => setState(prev => ({ ...prev, currentIndex: Math.max(prev.currentIndex - 1, 0) }))

  const setScore = (score: number) => {
    setState(prev => {
      const scoreArr = [...prev.score]
      scoreArr[prev.currentIndex] = { ...scoreArr[prev.currentIndex], score }
      return { ...prev, score: scoreArr }
    })
  }
const progress = Math.round((state.currentIndex + 1) / TOTAL_CATEGORIES * 100)
const isFirstStep = state.currentIndex === 0
const isLastStep = state.currentIndex === TOTAL_CATEGORIES - 1
const goToStep = (index: number) =>
  setState(prev => ({ ...prev, currentIndex: Math.max(0, Math.min(index, TOTAL_CATEGORIES - 1)) }))

const submit = async () => {
  const result = await createWheel({
    user_id,
    scores: state.score,
  }).unwrap()

  setState(prev => ({
    ...prev,
    isComplete: true,
    assessmentId: result.id, 
  }))

  toast.success('Колесо збережено 🎯')
  return result
}

const analyze = async () => {
  if (!state.assessmentId) return
  return analyzeWheel({
    user_id,
    assessmentId: state.assessmentId,
  }).unwrap()
}

const reset = () =>
  setState({
    currentIndex: 0,
    score: WHEEL_CATEGORIES.map(cat => ({
      category_id: cat.id,
      score: 5,
    })),
    isComplete: false,
    assessmentId: null,
  })


  const stats = useMemo(() => {
    const total = state.score.reduce((sum, s) => sum + s.score, 0)
    const average = total / TOTAL_CATEGORIES
    const sorted = [...state.score].sort((a, b) => b.score - a.score)
    return { total, average, strengths: sorted.slice(0, 3).map(s => s.category_id), gaps: sorted.slice(-3).map(s => s.category_id) }
  }, [state.score])

return { 
  ...state,
  currentCategory,
  currentScore,
  nextStep,
  prevStep,
  setScore,
  submit,
  analyze,
  reset,
  stats,
  progress,
  isFirstStep,
  isLastStep,
  goToStep,
  isSubmitting: saveState.isLoading,
  isAnalyzing: analyzeState.isLoading
}
}
