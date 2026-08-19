import { TOTAL_BALLS } from '../model/config'
import { useEffect } from 'react'
import { resolveApiUrl } from '@/services/api'
import { buildAuthHeaders, buildSubmissionAnswers } from '../model/session'
export function useTestSubmission(ctx: any) {
  const {
    hydrated,
    isResultRoute,
    canSyncToDb,
    questions,
    answers,
    accessToken,
  } = ctx

useEffect(() => {
      if (!hydrated || isResultRoute || !canSyncToDb) return
  
      const handleUnload = () => {
        const partialAnswers = buildSubmissionAnswers(questions, answers)
        if (partialAnswers.length === 0 || partialAnswers.length >= TOTAL_BALLS) {
          return
        }
  
        const payload = JSON.stringify({
          answers: partialAnswers,
          partial: true,
        })
        const authHeaders = buildAuthHeaders(accessToken)
  
        if (authHeaders.Authorization) {
          void fetch(resolveApiUrl('/ab-test/submit-partial'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders,
            },
            credentials: 'include',
            keepalive: true,
            body: payload,
          })
          return
        }
  
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon(resolveApiUrl('/ab-test/submit-partial'), blob)
      }
  
      window.addEventListener('beforeunload', handleUnload)
      return () => window.removeEventListener('beforeunload', handleUnload)
    }, [accessToken, answers, canSyncToDb, hydrated, isResultRoute, questions])
}
