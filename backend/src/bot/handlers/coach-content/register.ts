import type { Telegraf } from 'telegraf'

import { coachOnly } from '../../../middleware/coachOnly.middleware.js'
import {
  handleCoachContentCommand,
  handleCoachContentNote,
  handleCoachContentText,
  handleCoachContentZooms,
} from '../../flows/contentPlanner.flow.js'
import { handleCoachPanelAction, showCoachContentWorkspace } from './actions.js'
import {
  enqueueCoachAudioUpload,
  handleCoachAudioCommand,
} from './audio.js'
import { handleCoachNotifyCommand } from './notifications.js'
import { handleCoachPaymentsCommand } from './payments.js'
import {
  getCommandPayload,
  reportCoachRuntimeError,
  validateCoachContentCatalog,
  withCoachRuntimeProtection,
} from './shared.js'
import { handleCoachStatsCommand } from './analytics.js'
import { handleCoachUsersCommand } from './users.js'

export function registerCoachContentHandlers(telegramBot: Telegraf): void {
  validateCoachContentCatalog()

  telegramBot.hears(/^(?:🎬\s*)?Контент$/iu, coachOnly, withCoachRuntimeProtection('menu:content', async (ctx) => {
    await showCoachContentWorkspace(ctx)
  }))

  telegramBot.hears(/^\/planner(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:planner', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'WEEKLY_PLAN', payload)
  }))

  telegramBot.hears(/^\/планер(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:планер', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'WEEKLY_PLAN', payload)
  }))

  telegramBot.hears(/^\/місяць(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:місяць', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'MONTHLY_PLAN', payload)
  }))

  telegramBot.hears(/^\/monthly(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:monthly', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'MONTHLY_PLAN', payload)
  }))

  telegramBot.hears(/^\/reels(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:reels', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'REELS_IDEAS', payload)
  }))

  telegramBot.hears(/^\/контент(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:контент', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'FULL_CONTENT', payload)
  }))

  telegramBot.hears(/^\/зуми(?:@\w+)?$/iu, coachOnly, withCoachRuntimeProtection('command:зуми', async (ctx) => {
    await handleCoachContentZooms(ctx)
  }))

  telegramBot.hears(/^\/audio(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:audio', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachAudioCommand(ctx, payload)
  }))

  telegramBot.hears(/^\/users(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:users', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachUsersCommand(ctx, payload)
  }))

  telegramBot.hears(/^\/notify(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:notify', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachNotifyCommand(ctx, payload)
  }))

  telegramBot.hears(/^\/stats(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:stats', async (ctx) => {
    await handleCoachStatsCommand(ctx)
  }))

  telegramBot.hears(/^\/payments(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:payments', async (ctx) => {
    await handleCoachPaymentsCommand(ctx)
  }))

  telegramBot.hears(/^\/нотатка(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:нотатка', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentNote(ctx, payload)
  }))

  telegramBot.action(/^coach-content:/, coachOnly, async (ctx) => {
    const raw = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
    try {
      const handled = await handleCoachPanelAction(ctx, raw)
      if (!handled) {
        await ctx.answerCbQuery().catch(() => undefined)
      }
    } catch (error) {
      await reportCoachRuntimeError(ctx, raw || 'coach-content:unknown', error)
    }
  })

  telegramBot.on('text', coachOnly, async (ctx, next) => {
    try {
      await handleCoachContentText(ctx, async () => { await next() })
    } catch (error) {
      await reportCoachRuntimeError(ctx, 'text', error)
    }
  })

  telegramBot.on(['audio', 'document', 'voice'], coachOnly, withCoachRuntimeProtection('media:zoom-audio-upload', async (ctx) => {
    await enqueueCoachAudioUpload(ctx)
  }))
}
