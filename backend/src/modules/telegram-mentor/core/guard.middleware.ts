import type { Context, MiddlewareFn } from 'telegraf'

import { isLockedState, resolveUserState, type UserState } from './state.service.js'
import { resolveDecision } from '../../../core/decision/decision.resolver.js'
import { buildRecoveryCopy, resolveConversationProfile } from '../../../core/state-machine/conversationPresentation.js'
import { resolveRelationshipMemory } from '../../../core/memory/relationshipMemory.js'
import { planAck } from '../conversation/delivery/planDelivery.js'
import { getTelegramAiRequestContext } from '../services/requestContext.service.js'

type GuardState = {
  userId?: string | null
  userState?: UserState
}

function isAllowedPreAccessCallback(action: string): boolean {
  if (!action) return false
  if (action === 'continue_task' || action === 'dismiss_task') return true
  if (action === 'open_faq') return true
  if (action.startsWith('faq:')) return true
  if (action === 'ab_test:entry' || action === 'ab_test:intro' || action === 'ab_test:start' || action === 'ab_test:restart' || action === 'ab_test:show_result' || action === 'ab_test:continue') return true
  if (action === 'ab_test:menu' || action === 'ab_test:focus_info' || action === 'open_focus_info') return true
  if (action.startsWith('ab_test_answer:') || action.startsWith('ab_test_edit:')) return true
  if (action === 'open_focus_payment' || action.startsWith('open_focus_payment:')) return true
  if (action === 'resend_focus_block12') return true
  if (action === 'skip_email_before_result' || action === 'confirm_profile_email_for_result' || action === 'change_email_for_result' || action.startsWith('show_inside_')) return true
  return false
}

export const guard: MiddlewareFn<Context> = async (ctx, next) => {
  const state = ctx.state as GuardState
  const userId = state.userId ?? null

  if (!userId) {
    return next()
  }

  const requestContext = await getTelegramAiRequestContext(ctx).catch(() => null)
  const userState = requestContext?.userState ?? await resolveUserState(userId)
  state.userState = userState

  const { decision } = await resolveDecision(userId, 'guard_check')

  if (decision.nextAction === 'bind_user' || decision.nextAction === 'show_funnel' || decision.nextAction === 'show_funnel_step') {
    if ('callbackQuery' in ctx && ctx.callbackQuery) {
      const action = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
      if (isAllowedPreAccessCallback(action)) {
        return next()
      }
      const relationship = await resolveRelationshipMemory(userId, 'stankey').catch(() => null)
      const copy = buildRecoveryCopy('stale_callback', resolveConversationProfile('stankey'), {
        relationship,
      })
      await planAck(ctx, 'ctx.answerCbQuery', 'guard_pre_access_block', copy.body).catch(() => undefined)
    }
    return
  }

  if (isLockedState(userState)) {
    if ('callbackQuery' in ctx && ctx.callbackQuery) {
      const action = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
      if (isAllowedPreAccessCallback(action)) {
        return next()
      }
      const relationship = await resolveRelationshipMemory(userId, 'stankey').catch(() => null)
      const copy = buildRecoveryCopy('flow_interrupted', resolveConversationProfile('stankey'), {
        relationship,
      })
      await planAck(ctx, 'ctx.answerCbQuery', 'guard_locked_state_block', copy.body).catch(() => undefined)
    }
    return
  }

  return next()
}
