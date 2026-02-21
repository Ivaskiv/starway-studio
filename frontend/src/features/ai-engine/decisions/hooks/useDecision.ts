// frontend/src/features/aiDecisionEngine/hooks/useDecision.ts
import { runDecisionEngine } from '@/features/ai-engine/decisions/engine/decisionEngine';
import {
  DecisionContext,
  DecisionResult,
} from '@/features/ai-engine/decisions/types/decisions.types';
import { useState } from 'react';

export const useDecision = (ctx: Omit<DecisionContext, 'userId'> & { userId: string }) => {
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const run = async (overrideCtx?: Partial<DecisionContext>) => {
    setLoading(true);
    setError(null);
    try {
      const decision = await runDecisionEngine({ ...ctx, ...overrideCtx });
      setResult(decision);
      return decision;
    } catch (err: any) {
      setError(err);
      console.error('[useDecision] Error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, error, run };
};

let lastDecisionCache: DecisionResult | null = null;
let listeners: Array<(d: DecisionResult | null) => void> = [];

export const setLastDecision = (decision: DecisionResult) => {
  lastDecisionCache = decision;
  listeners.forEach(l => l(decision));
};

export const useLastDecision = () => {
  const [decision, setDecision] = useState<DecisionResult | null>(lastDecisionCache);

  if (!listeners.includes(setDecision)) {
    listeners.push(setDecision);
  }

  return decision;
};
