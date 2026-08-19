import type { Context } from 'telegraf'

import {
  handleCoachContentAction,
  handleCoachContentCommand,
} from '../../flows/contentPlanner.flow.js'
import {
  handleCoachAudioAction,
  handleCoachAudioCommand,
  showCoachAudioLibraryMonth,
  showCoachAudioLibrarySession,
} from './audio.js'
import { handleCoachNotifyCommand } from './notifications.js'
import { handleCoachPaymentsCommand } from './payments.js'
import { resolveCoachAccess } from './shared.js'
import { handleCoachUsersCommand } from './users.js'

export async function handleCoachPanelAction(ctx: Context, action: string): Promise<boolean> {
  if (action === 'coach-content:users') {
    await ctx.answerCbQuery('Users').catch(() => undefined)
    return handleCoachUsersCommand(ctx, '')
  }

  if (action === 'coach-content:notify') {
    await ctx.answerCbQuery('Notify').catch(() => undefined)
    return handleCoachNotifyCommand(ctx, '')
  }

  if (action === 'coach-content:audio') {
    await ctx.answerCbQuery('Audio').catch(() => undefined)
    return handleCoachAudioCommand(ctx, '')
  }

  if (action.startsWith('coach-library:month:')) {
    const month = action.replace('coach-library:month:', '').trim()
    await ctx.answerCbQuery('Місяць').catch(() => undefined)
    const coach = await resolveCoachAccess(ctx)
    if (!coach) return false
    await showCoachAudioLibraryMonth(ctx, coach, month)
    return true
  }

  if (action.startsWith('coach-library:session:')) {
    const [, , sessionId, section = 'overview'] = action.split(':')
    await ctx.answerCbQuery('Zoom card').catch(() => undefined)
    const coach = await resolveCoachAccess(ctx)
    if (!coach || !sessionId) return false
    await showCoachAudioLibrarySession(ctx, coach, sessionId, section)
    return true
  }

  if (action.startsWith('coach-content:audio-play:') || action.startsWith('coach-content:audio-download:')) {
    return handleCoachAudioAction(ctx, action)
  }

  if (action === 'coach-content:planner') {
    await ctx.answerCbQuery('Planner').catch(() => undefined)
    return handleCoachContentCommand(ctx, 'WEEKLY_PLAN')
  }

  if (action === 'coach-content:monthly') {
    await ctx.answerCbQuery('Monthly plan').catch(() => undefined)
    return handleCoachContentCommand(ctx, 'MONTHLY_PLAN')
  }

  if (action === 'coach-content:payments') {
    await ctx.answerCbQuery('Payments').catch(() => undefined)
    return handleCoachPaymentsCommand(ctx)
  }

  return handleCoachContentAction(ctx, action)
}
