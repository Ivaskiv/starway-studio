import { useEffect, useState } from 'react'

import type {
  WelcomeTestQuestion,
  WelcomeTestQuestionsResponse,
} from '@/features/welcome-test/types/welcomeTestQuestions.types'
import { WELCOME_TEST_QUESTION_ORDER } from '@/features/welcome-test/types/welcomeTest.types'
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
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Не вдалося завантажити питання'
          )
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
