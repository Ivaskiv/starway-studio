import { useEffect } from 'react'
import { clearStoredState, loadStoredState, persistStoredState } from '../model/session'
export function useTestHydration(ctx: any) {
  const {
    isResultRoute,
    setHydrated,
    canSyncToDb,
    setCurrentIndex,
    setAnswers,
    setResult,
    hydrated,
    currentIndex,
    answers,
    result,
  } = ctx

useEffect(() => {
      if (isResultRoute) {
        setHydrated(true)
        return
      }
  
      const stored = loadStoredState()
      if (!canSyncToDb && stored.result) {
        clearStoredState()
        setCurrentIndex(0)
        setAnswers({})
        setResult(null)
        setHydrated(true)
        return
      }
  
      setCurrentIndex(stored.currentIndex)
      setAnswers(stored.answers)
      setResult(stored.result)
      setHydrated(true)
    }, [canSyncToDb, isResultRoute])
  
  useEffect(() => {
      if (!hydrated || isResultRoute) return
      persistStoredState({
        currentIndex,
        answers,
        result,
        source: canSyncToDb ? 'authenticated' : 'anonymous',
      })
    }, [answers, canSyncToDb, currentIndex, hydrated, isResultRoute, result])
}
