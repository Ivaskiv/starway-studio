import type { Context, MiddlewareFn } from 'telegraf'
import { isLeadMagnetActive, resolveLinkedUserIdFromContext, resolveUserState } from '../modules/telegram-mentor/handlers/start.js'

function isLmOnlyModeEnabled(): boolean {
  // [LM_ONLY_MODE] added
  return process.env.APP_MODE === 'LM_ONLY'
}

async function resolveLmState(ctx: Context): Promise<string | null> {
  const userId = await resolveLinkedUserIdFromContext(ctx)
  if (!userId) {
    return null
  }

  return resolveUserState(userId)
}

export const lmOnlyModeMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  const text = 'message' in ctx && ctx.message && 'text' in ctx.message
    ? String(ctx.message.text ?? '').trim()
    : ''
  const callbackData = 'callbackQuery' in ctx && ctx.callbackQuery && 'data' in ctx.callbackQuery
    ? String(ctx.callbackQuery.data)
    : ''

  const userState = await resolveLmState(ctx)
  const isLmState = isLeadMagnetActive(userState as Parameters<typeof isLeadMagnetActive>[0])

  if (isLmState) {
    if ('callbackQuery' in ctx && ctx.callbackQuery) {
      await ctx.answerCbQuery().catch(() => {})
    }
    return
  }

  if (!isLmOnlyModeEnabled()) {
    return next()
  }

  if (text.startsWith('/start')) {
    return next()
  }

  if (callbackData) {
    await ctx.answerCbQuery().catch(() => {})
    return
  }

  if (text) {
    if (!text.startsWith('/start')) {
      return
    }
    return
  }

  return next()
}
