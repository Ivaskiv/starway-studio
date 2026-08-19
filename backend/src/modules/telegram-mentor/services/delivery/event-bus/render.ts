import type { Context } from 'telegraf'
import { resolveDecision } from '../../../../../core/decision/decision.resolver.js'
import { renderTelegram } from '../../../renderers/decisionTelegram.js'

export async function renderDecisionForContext(
  ctx: Context,
  userId: string | null,
  event: string,
  payload?: Record<string, unknown>,
): Promise<boolean> {
  const firstName = ctx.from?.first_name ?? 'Привіт'
  const { decision } = await resolveDecision(userId, event, payload)
  return renderTelegram(ctx, decision, firstName)
}
