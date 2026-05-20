import type { Context, MiddlewareFn } from 'telegraf'

import { isLockedState, resolveUserState, type UserState } from './state.service.js'
import { resolveDecision } from '../../../core/decision/decision.resolver.js'
import { buildRecoveryCopy, resolveConversationProfile } from '../../../core/state-machine/conversationPresentation.js'
import { resolveRelationshipMemory } from '../../../core/memory/relationshipMemory.js'

type GuardState = {
  userId?: string | null
  userState?: UserState
}

export const guard: MiddlewareFn<Context> = async (ctx, next) => {
  const state = ctx.state as GuardState
  const userId = state.userId ?? null

  if (!userId) {
    return next()
  }

  const userState = await resolveUserState(userId)
  state.userState = userState

  const { decision } = await resolveDecision(userId, 'guard_check')

  if (decision.nextAction === 'bind_user' || decision.nextAction === 'show_funnel' || decision.nextAction === 'show_funnel_step') {
    if ('callbackQuery' in ctx && ctx.callbackQuery) {
      const action = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
      if (action === 'continue_task' || action === 'dismiss_task') {
        return next()
      }
      const relationship = await resolveRelationshipMemory(userId, 'stankey').catch(() => null)
      const copy = buildRecoveryCopy('stale_callback', resolveConversationProfile('stankey'), {
        relationship,
      })
      await ctx.answerCbQuery(copy.body).catch(() => undefined)
    }
    return
  }

  if (isLockedState(userState)) {
    if ('callbackQuery' in ctx && ctx.callbackQuery) {
      const relationship = await resolveRelationshipMemory(userId, 'stankey').catch(() => null)
      const copy = buildRecoveryCopy('flow_interrupted', resolveConversationProfile('stankey'), {
        relationship,
      })
      await ctx.answerCbQuery(copy.body).catch(() => undefined)
    }
    return
  }

  return next()
}
