import type { Context } from 'telegraf'
import { Markup } from 'telegraf'

import { coachBotContent } from '../../content/coachBot.content.js'
import { coachContent } from '../../content/coachContent.content.js'
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
import { replyOrEditPanelMessage, resolveCoachAccess } from './shared.js'
import { handleCoachUsersCommand } from './users.js'

function buildContentWorkspaceKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(coachBotContent.contentWorkspace.actions.plan, 'coach-content:planner')],
    [Markup.button.callback(coachBotContent.contentWorkspace.actions.create, 'coach-content:create')],
  ])
}

function buildContentFormatsKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(coachContent.mode.REELS_IDEAS, 'coach-content:create:reels')],
    [Markup.button.callback(coachContent.mode.FULL_CONTENT, 'coach-content:create:full')],
    [Markup.button.callback(coachBotContent.contentWorkspace.actions.back, 'coach-content:workspace')],
  ])
}

export async function showCoachContentWorkspace(ctx: Context): Promise<boolean> {
  await replyOrEditPanelMessage(
    ctx,
    [
      coachBotContent.contentWorkspace.title,
      '',
      coachBotContent.contentWorkspace.subtitle,
    ].join('\n'),
    buildContentWorkspaceKeyboard(),
  )
  return true
}

async function showCoachContentFormats(ctx: Context): Promise<boolean> {
  await replyOrEditPanelMessage(
    ctx,
    [
      coachBotContent.contentWorkspace.createTitle,
      '',
      coachBotContent.contentWorkspace.createSubtitle,
    ].join('\n'),
    buildContentFormatsKeyboard(),
  )
  return true
}

export async function handleCoachPanelAction(ctx: Context, action: string): Promise<boolean> {
  if (action === 'coach-content:workspace') {
    await ctx.answerCbQuery().catch(() => undefined)
    return showCoachContentWorkspace(ctx)
  }

  if (action === 'coach-content:create') {
    await ctx.answerCbQuery().catch(() => undefined)
    return showCoachContentFormats(ctx)
  }

  if (action === 'coach-content:create:reels') {
    await ctx.answerCbQuery(coachContent.mode.REELS_IDEAS).catch(() => undefined)
    return handleCoachContentCommand(ctx, 'REELS_IDEAS')
  }

  if (action === 'coach-content:create:full') {
    await ctx.answerCbQuery(coachContent.mode.FULL_CONTENT).catch(() => undefined)
    return handleCoachContentCommand(ctx, 'FULL_CONTENT')
  }

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
    await ctx.answerCbQuery('Оплати').catch(() => undefined)
    return handleCoachPaymentsCommand(ctx)
  }

  if (action === 'coach-content:payments:history') {
    await ctx.answerCbQuery('Історія').catch(() => undefined)
    return handleCoachPaymentsCommand(ctx, 'history')
  }

  if (action === 'coach-content:payments:issues') {
    await ctx.answerCbQuery('Проблемні оплати').catch(() => undefined)
    return handleCoachPaymentsCommand(ctx, 'issues')
  }

  return handleCoachContentAction(ctx, action)
}
