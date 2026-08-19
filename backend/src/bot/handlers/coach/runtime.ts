import type { Context } from 'telegraf'

import { coachBotContent } from '../../content/coachBot.content.js'

const COACH_RUNTIME_ERROR_MESSAGE = coachBotContent.runtime.error

export function getCommandPayload(ctx: Context): string {
  const match = Array.isArray((ctx as { match?: unknown[] }).match)
    ? (ctx as { match?: unknown[] }).match
    : null
  if (!match) return ''
  return typeof match[1] === 'string' ? match[1].trim() : ''
}

async function reportCoachRuntimeError(
  ctx: Context,
  scope: string,
  error: unknown
): Promise<void> {
  console.error(`[coach-start:${scope}] failed`, error)
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery(COACH_RUNTIME_ERROR_MESSAGE).catch(() => undefined)
  }
  await ctx.reply(COACH_RUNTIME_ERROR_MESSAGE).catch(() => undefined)
}

export function withCoachRuntimeProtection<T extends Context>(
  scope: string,
  handler: (ctx: T) => Promise<unknown>
) {
  return async (ctx: T): Promise<void> => {
    try {
      await handler(ctx)
    } catch (error) {
      await reportCoachRuntimeError(ctx, scope, error)
    }
  }
}
