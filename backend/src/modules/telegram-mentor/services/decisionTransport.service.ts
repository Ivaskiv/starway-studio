import type { Context } from 'telegraf'

import { resolveDecision } from '../../../core/decision/decision.resolver.js'
import type { DecisionOutput } from '../../../core/decision/decision.engine.js'
import { renderTelegram } from '../renderers/decisionTelegram.js'

type AllowedDecisionAction = DecisionOutput['nextAction']

async function resolveUserIdFromContext(ctx: Context): Promise<string | null> {
  const stateUserId = (ctx.state as { userId?: string | null }).userId
  return stateUserId ?? null
}

export async function renderDecisionUnlessAllowed(
  ctx: Context,
  event: string,
  allowedActions: AllowedDecisionAction[],
  payload?: Record<string, unknown>,
): Promise<boolean> {
  const userId = await resolveUserIdFromContext(ctx)
  const { decision } = await resolveDecision(userId, event, payload)

  if (allowedActions.includes(decision.nextAction)) {
    return false
  }

  await renderTelegram(ctx, decision, ctx.from?.first_name ?? 'Привіт')
  return true
}
