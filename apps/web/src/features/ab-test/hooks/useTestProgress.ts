import { AB_TEST_LANDING_ROUTE } from '@/features/ab-test-landing/config'
import { TOTAL_BALLS } from '../model/config'
import type {
  AbTestProgressResponse,
  AbTestResult,
} from '../model/types'
import { useEffect } from 'react'
import { resolveApiUrl } from '@/services/api'
import { buildAuthHeaders, loadStoredState } from '../model/session'
import { buildStoredResultFromType, isAbTestResultType } from '../model/result'
export function useTestProgress(ctx: any) {
  const {
    hydrated,
    isResultRoute,
    canSyncToDb,
    setAnswers,
    setCurrentIndex,
    accessToken,
    setResult,
    result,
    routeStateResult,
    setLoading,
    resultTypeQuery,
    navigate,
    setError,
  } = ctx

useEffect(() => {
      if (!hydrated || isResultRoute) return
  
      let cancelled = false
  
      async function loadProgress() {
        if (!canSyncToDb) {
          const stored = loadStoredState()
          if (!cancelled && Object.keys(stored.answers ?? {}).length > 0) {
            setAnswers(stored.answers)
            setCurrentIndex(Math.max(0, stored.currentIndex))
          }
          return
        }
  
        try {
          const response = await fetch(resolveApiUrl('/ab-test/progress'), {
            credentials: 'include',
            headers: buildAuthHeaders(accessToken),
          })
          if (!response.ok) return
          const data = (await response.json()) as AbTestProgressResponse
          if (cancelled) return
  
          if (
            data.status === 'completed' &&
            isAbTestResultType(data.resultType)
          ) {
            setResult(buildStoredResultFromType(data.resultType))
            setCurrentIndex(TOTAL_BALLS - 1)
            return
          }
  
          if (Array.isArray(data.answers) && data.answers.length > 0) {
            const restored: Record<string, string> = {}
            for (const item of data.answers) {
              const questionId = item?.questionId ?? item?.question_id
              const answerId = item?.answerId ?? item?.answer_id
              if (questionId && answerId) {
                restored[questionId] = answerId
              }
            }
            setAnswers(restored)
            setCurrentIndex(
              Math.max(0, Number(data.currentIndex ?? data.answers.length))
            )
          }
        } catch {
          // keep existing state silently
        }
      }
  
      void loadProgress()
  
      return () => {
        cancelled = true
      }
    }, [accessToken, canSyncToDb, hydrated, isResultRoute])
  
  useEffect(() => {
      if (!isResultRoute || result) return
  
      if (routeStateResult) {
        setResult(routeStateResult)
        setLoading(false)
        return
      }
  
      if (!canSyncToDb) {
        if (isAbTestResultType(resultTypeQuery)) {
          setResult(buildStoredResultFromType(resultTypeQuery))
        } else {
          navigate(AB_TEST_LANDING_ROUTE, { replace: true })
        }
        return
      }
  
      let cancelled = false
      setLoading(true)
  
      async function loadStoredResult() {
        try {
          const response = await fetch(resolveApiUrl('/ab-test/result'), {
            credentials: 'include',
            headers: buildAuthHeaders(accessToken),
          })
  
          if (!response.ok) {
            throw new Error(`Failed to load AB test result (${response.status})`)
          }
  
          const data = (await response.json()) as Partial<AbTestResult> & {
            type?: string
          }
          if (cancelled) return
  
          if (isAbTestResultType(data.type)) {
            const storedResult = buildStoredResultFromType(data.type)
            setResult({
              ...storedResult,
              dominantBlock: data.dominantBlock ?? storedResult.dominantBlock,
              nextAction: data.nextAction ?? storedResult.nextAction,
              nextActionCta: data.nextActionCta ?? storedResult.nextActionCta,
            })
          } else if (isAbTestResultType(resultTypeQuery)) {
            setResult(buildStoredResultFromType(resultTypeQuery))
          } else {
            navigate(AB_TEST_LANDING_ROUTE, { replace: true })
          }
        } catch (loadError) {
          if (cancelled) return
  
          if (isAbTestResultType(resultTypeQuery)) {
            setResult(buildStoredResultFromType(resultTypeQuery))
          } else {
            setError(
              loadError instanceof Error
                ? loadError.message
                : 'Failed to load AB test result'
            )
          }
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      }
  
      void loadStoredResult()
  
      return () => {
        cancelled = true
      }
    }, [
      accessToken,
      canSyncToDb,
      isResultRoute,
      navigate,
      result,
      resultTypeQuery,
      routeStateResult,
    ])
}
