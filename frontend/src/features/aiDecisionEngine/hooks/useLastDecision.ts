import { useState } from 'react'
import { DecisionResult } from '@/features/aiDecisionEngine/types'

let lastDecisionCache: DecisionResult | null = null
let listeners: Array<(d: DecisionResult | null) => void> = []

export const setLastDecision = (decision: DecisionResult) => {
  lastDecisionCache = decision
  listeners.forEach((l) => l(decision))
}

export const useLastDecision = () => {
  const [decision, setDecision] = useState<DecisionResult | null>(lastDecisionCache)

  if (!listeners.includes(setDecision)) {
    listeners.push(setDecision)
  }

  return decision
}
