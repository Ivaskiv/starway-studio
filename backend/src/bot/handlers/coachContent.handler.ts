import type { Context, Telegraf } from 'telegraf'

import { coachOnly } from '../../middleware/coachOnly.middleware.js'
import {
  handleCoachContentAction,
  handleCoachContentCommand,
  handleCoachContentNote,
  handleCoachContentText,
  handleCoachContentZooms,
} from '../flows/contentPlanner.flow.js'

function getCommandPayload(ctx: Context): string {
  const match = Array.isArray((ctx as { match?: unknown[] }).match)
    ? (ctx as { match?: unknown[] }).match
    : null
  if (!match) return ''
  return typeof match[1] === 'string' ? match[1].trim() : ''
}

export function registerCoachContentHandlers(telegramBot: Telegraf): void {
  telegramBot.hears(/^\/планер(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'WEEKLY_PLAN', payload)
  })

  telegramBot.hears(/^\/reels(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'REELS_IDEAS', payload)
  })

  telegramBot.hears(/^\/контент(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'FULL_CONTENT', payload)
  })

  telegramBot.hears(/^\/зуми(?:@\w+)?$/iu, coachOnly, async (ctx) => {
    await handleCoachContentZooms(ctx)
  })

  telegramBot.hears(/^\/нотатка(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentNote(ctx, payload)
  })

  telegramBot.action(/^coach-content:/, coachOnly, async (ctx) => {
    const raw = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
    const handled = await handleCoachContentAction(ctx, raw)
    if (!handled) {
      await ctx.answerCbQuery().catch(() => undefined)
    }
  })

  telegramBot.on('text', coachOnly, async (ctx, next) => {
    await handleCoachContentText(ctx, async () => { await next() })
  })
}
