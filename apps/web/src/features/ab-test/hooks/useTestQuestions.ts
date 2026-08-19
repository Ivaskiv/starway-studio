import type { AbTestQuestionsResponse } from '../model/types'
import { useEffect } from 'react'
import { AB_TEST_FALLBACK_QUESTIONS_RESPONSE } from '@/features/ab-test/data/abTest.questions'
import { resolveApiUrl } from '@/services/api'
export function useTestQuestions(ctx: any) {
  const {
    isResultRoute,
    setLoading,
    setError,
    setQuestions,
  } = ctx

useEffect(() => {
      if (isResultRoute) {
        return
      }
  
      let cancelled = false
  
      async function loadQuestions() {
        setLoading(true)
        setError(null)
  
        try {
          const response = await fetch(resolveApiUrl('/ab-test/questions'), {
            credentials: 'include',
          })
  
          if (!response.ok) {
            throw new Error(`Failed to load questions (${response.status})`)
          }
  
          const data = (await response.json()) as AbTestQuestionsResponse
          if (!cancelled) {
            setQuestions(data.questions.slice(0, 8))
          }
        } catch {
          if (!cancelled) {
            setQuestions(
              AB_TEST_FALLBACK_QUESTIONS_RESPONSE.questions.slice(0, 8)
            )
            setError(null)
          }
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      }
  
      void loadQuestions()
  
      return () => {
        cancelled = true
      }
    }, [isResultRoute])
}
