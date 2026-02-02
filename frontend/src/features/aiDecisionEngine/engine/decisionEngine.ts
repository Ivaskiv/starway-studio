// /features/aiDecisionEngine/engine/decisionEngine.ts
import { DecisionContext, DecisionResult } from '../types'
import { resolveUpsell } from './subscription/upsell.logic'
import { questionsSchedulerRule } from './rules/questionsScheduler.rules'

const rulesMap: Record<string, (ctx: DecisionContext) => Promise<DecisionResult>> = {
  questionsScheduler: questionsSchedulerRule,
}

export const runDecisionEngine = async (ctx: DecisionContext): Promise<DecisionResult> => {
  console.log('[DecisionEngine] Context:', ctx)

  const rules = rulesMap[ctx.source]
  if (!rules) {
    console.warn(`[DecisionEngine] No rules for source: ${ctx.source}`)
    return {}
  }

  const result = await rules(ctx)
  const upsell = resolveUpsell(ctx)
  if (upsell) {
    result.upsell = upsell.upsell
  }

  console.log('[DecisionEngine] Result:', result)
  return result
}
