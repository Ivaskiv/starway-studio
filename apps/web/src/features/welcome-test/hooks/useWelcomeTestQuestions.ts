import { useEffect, useState } from 'react'

import type {
  WelcomeTestQuestion,
  WelcomeTestQuestionsResponse,
} from '@/features/welcome-test/types/welcomeTestQuestions.types'
import { WELCOME_TEST_QUESTION_ORDER } from '@/features/welcome-test/types/welcomeTest.types'
import { AB_TEST_FALLBACK_QUESTIONS_RESPONSE } from '@/features/ab-test/data/abTest.questions'
import { resolveApiUrl } from '@/services/api'

export function useWelcomeTestQuestions() {
  const [questions, setQuestions] = useState<WelcomeTestQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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

        const data = (await response.json()) as WelcomeTestQuestionsResponse
        const ordered = WELCOME_TEST_QUESTION_ORDER.flatMap((questionId) => {
          const question = data.questions.find((item) => item.id === questionId)
          return question ? [question] : []
        })

        if (!cancelled) {
          setQuestions(ordered.length > 0 ? ordered : data.questions.slice(0, 8))
        }
      } catch {
        if (!cancelled) {
          const fallbackOrdered = WELCOME_TEST_QUESTION_ORDER.flatMap((questionId) => {
            const question = AB_TEST_FALLBACK_QUESTIONS_RESPONSE.questions.find((item) => item.id === questionId)
            return question ? [question] : []
          })

          setQuestions(
            fallbackOrdered.length > 0
              ? (fallbackOrdered as WelcomeTestQuestion[])
              : (AB_TEST_FALLBACK_QUESTIONS_RESPONSE.questions as WelcomeTestQuestion[])
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
  }, [])

  return { questions, loading, error }
}
