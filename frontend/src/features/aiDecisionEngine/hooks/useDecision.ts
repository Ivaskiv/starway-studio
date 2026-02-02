// frontend/src/features/aiDecisionEngine/hooks/useDecision.ts
import { useState } from 'react'
import { runDecisionEngine } from '@/features/aiDecisionEngine/engine/decisionEngine'
import { DecisionContext, DecisionResult } from '@/features/aiDecisionEngine/types.ts'

export const useDecision = (ctx: Omit<DecisionContext, 'userId'> & { userId: string }) => {
  const [result, setResult] = useState<DecisionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const run = async (overrideCtx?: Partial<DecisionContext>) => {
    setLoading(true)
    setError(null)
    try {
      const decision = await runDecisionEngine({ ...ctx, ...overrideCtx })
      setResult(decision)
      return decision
    } catch (err: any) {
      setError(err)
      console.error('[useDecision] Error:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { result, loading, error, run }
}
