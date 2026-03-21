import type { Context, MiddlewareFn } from 'telegraf'
import { resolveLinkedUserIdFromContext, resolveUserState, sendEntryOffer } from '../modules/telegram-mentor/handlers/start.js'

function isLmOnlyModeEnabled(): boolean {
  // [LM_ONLY_MODE] added
  return process.env.APP_MODE === 'LM_ONLY'
}

function isLeadMagnetState(state: string | null): boolean {
  return state === 'lm_started'
    || state === 'lm_engaged'
    || state === 'lm_almost_done'
    || state === 'lm_completed'
    || state === 'lm_exited'
}

async function replyContinuePractice(ctx: Context): Promise<void> {
  await ctx.reply(
    'Зараз ти проходиш безкоштовний практикум 👇\nЗаверши його, щоб рухатись далі.',
    {
      reply_markup: {
        inline_keyboard: [[{ text: '▶️ Продовжити', callback_data: 'lm_continue' }]],
      },
    },
  )
}

async function resolveLmState(ctx: Context): Promise<string | null> {
  const userId = await resolveLinkedUserIdFromContext(ctx)
  if (!userId) {
    return null
  }

  return resolveUserState(userId)
}

export const lmOnlyModeMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  if (!isLmOnlyModeEnabled()) {
    return next()
  }

  const text = 'message' in ctx && ctx.message && 'text' in ctx.message
    ? String(ctx.message.text ?? '').trim()
    : ''
  const callbackData = 'callbackQuery' in ctx && ctx.callbackQuery && 'data' in ctx.callbackQuery
    ? String(ctx.callbackQuery.data)
    : ''

  if (text.startsWith('/start')) {
    return next()
  }

  const userState = await resolveLmState(ctx)
  const isLmState = isLeadMagnetState(userState)

  if (callbackData) {
    if (callbackData === 'lm_continue' || callbackData === 'lm_exit_soft') {
      return next()
    }

    if (isLmState) {
      // [LM_ONLY_MODE] added
      await replyContinuePractice(ctx)
      return
    }

    // [LM_ONLY_MODE] added
    await sendEntryOffer(ctx)
    return
  }

  if (text) {
    if (!text.startsWith('/')) {
      if (isLmState) {
        return next()
      }

      // [LM_ONLY_MODE] added
      await sendEntryOffer(ctx)
      return
    }

    if (isLmState) {
      // [LM_ONLY_MODE] added
      await replyContinuePractice(ctx)
      return
    }

    // [LM_ONLY_MODE] added
    await sendEntryOffer(ctx)
    return
  }

  return next()
}
