import type { Context } from 'telegraf'
import { Markup } from 'telegraf'
import type { KeyboardButton } from '@telegraf/types'

import { prisma } from '../../../db/client.js'
import {
  COACH_AGENTS_RETURN_TARGET,
  generateCoachAgentsWebDeepLink,
  generateCoachZoomWebDeepLink,
} from '../../../modules/deeplinks/service.js'
import { toMutableReplyKeyboard } from '../../../utils/keyboard.js'
import { coachBotContent } from '../../content/coachBot.content.js'
import { resolveCoachUserId } from './access.js'
import { resolveCoachWebAppBaseUrl } from '../../../config/webapp.js'
import {
  buildExpertScopeWhere,
  replyOrEditPanelMessage,
  resolveCoachAccess,
} from '../coach-content/shared.js'

const lastCoachAgentsMessageByChat = new Map<string, number>()

export const MENU_CONDUCT_PATTERN =
  /^(?:🎙️?\s*)?(?:Новий\s+Zoom|Провести)$/iu

export const MENU_LIBRARY_PATTERN =
  /^(?:📚\s*)?(?:Бібліотека(?:\s+Zoom)?)$/iu

export const MENU_ANALYTICS_PATTERN =
  /^(?:📊\s*)?Аналітика$/iu

export const MENU_AGENTS_PATTERN =
  /^(?:🤖\s*)?(?:AI-)?Агенти$/iu

export const MENU_SETTINGS_PATTERN =
  /^(?:⚙️\s*)?(?:Система|Налаштування)$/iu
const COACH_SETTINGS_BACK_ACTION = 'coach:settings:back'

export const MENU_CALENDAR_PATTERN =
  /^(?:📅\s*)?Календар(?:\s+Zoom)?$/iu

export const MENU_NOTIFICATIONS_PATTERN =
  /^(?:🔔\s*)?Нагадування$/iu

export const MENU_PAYMENTS_PATTERN =
  /^(?:💳\s*)?Оплати$/iu

async function resolveCoachAgentsUrl(ctx: Context): Promise<string> {
  const coachUserId = await resolveCoachUserId(ctx)
  if (!coachUserId) {
    throw new Error('COACH_USER_NOT_RESOLVED_FOR_AGENTS_LINK')
  }

  return generateCoachAgentsWebDeepLink(coachUserId)
}

async function resolveCoachCalendarUrl(ctx: Context): Promise<string> {
  const coachUserId = await resolveCoachUserId(ctx)
  if (!coachUserId) {
    throw new Error('COACH_USER_NOT_RESOLVED_FOR_ZOOM_LINK')
  }

  return generateCoachZoomWebDeepLink(coachUserId)
}

export async function showCoachMenu(ctx: Context): Promise<void> {
  const coach = await resolveCoachAccess(ctx)
  const firstName = String(ctx.from?.first_name ?? '').trim() || 'коуч'

  const nextSession = coach
    ? await prisma.zoomSession.findFirst({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { gt: new Date() },
          ...buildExpertScopeWhere(coach),
        },
        orderBy: { scheduledAt: 'asc' },
        select: {
          scheduledAt: true,
          _count: {
            select: {
              attendees: true,
            },
          },
        },
      })
    : null

  const nextSessionLabel = nextSession
    ? [
        nextSession.scheduledAt.toLocaleDateString('uk-UA', {
          timeZone: 'Europe/Kyiv',
          day: 'numeric',
          month: 'long',
        }),
        nextSession.scheduledAt.toLocaleTimeString('uk-UA', {
          timeZone: 'Europe/Kyiv',
          hour: '2-digit',
          minute: '2-digit',
        }),
      ].join(' · ')
    : coachBotContent.start.upcomingEmpty

  const nextSessionAttendance = nextSession
    ? `${nextSession._count.attendees} учасників`
    : null

  const text = [
    coachBotContent.start.title,
    '',
    `Вітаю, ${firstName}.`,
    '',
    coachBotContent.start.upcomingTitle,
    nextSessionLabel,
    ...(nextSessionAttendance ? [nextSessionAttendance, ''] : ['']),
    coachBotContent.start.subtitle,
  ].join('\n')

  await ctx.reply(text, buildCoachMainMenuReplyMarkup(coach?.role ?? 'EXPERT'))
}

export function buildCoachMainMenuReplyMarkup(
  role: 'ADMIN' | 'EXPERT' | 'SUPERADMIN'
) {
  const keyboard: KeyboardButton[][] = [
    [coachBotContent.menu.conduct, coachBotContent.menu.calendar],
    [coachBotContent.menu.members, coachBotContent.menu.agents],
    [coachBotContent.menu.analytics, coachBotContent.menu.content],
    [coachBotContent.menu.notifications, coachBotContent.menu.payments],
  ]

  if (role === 'SUPERADMIN') {
    keyboard.push([coachBotContent.menu.settings])
  }

  return {
    reply_markup: toMutableReplyKeyboard({
      keyboard,
      resize_keyboard: true,
      is_persistent: true,
    }),
  }
}

export async function showCoachSystemMenu(ctx: Context): Promise<void> {
  const coach = await resolveCoachAccess(ctx)
  if (coach?.role !== 'SUPERADMIN') {
    await ctx.reply('Налаштування доступні лише SUPERADMIN.')
    return
  }

  await replyOrEditPanelMessage(
    ctx,
    `${coachBotContent.system.title}\n\n${coachBotContent.system.subtitle}`,
    {
      ...buildCoachMainMenuReplyMarkup(coach.role),
      ...Markup.inlineKeyboard([
        [Markup.button.callback(coachBotContent.system.actions.back, COACH_SETTINGS_BACK_ACTION)],
      ]),
    }
  )
}

export async function showCoachSettingsBack(ctx: Context): Promise<void> {
  await ctx.answerCbQuery().catch(() => undefined)
  await showCoachMenu(ctx)
}

export async function showCoachCalendarMenu(ctx: Context): Promise<void> {
  const finalUrl = await resolveCoachCalendarUrl(ctx)
  console.info('[ZOOM_CALENDAR_BUTTON_DEBUG]', {
    source: 'coachStart.showCoachCalendarMenu',
    chatId: String(ctx.chat?.id ?? ctx.from?.id ?? ''),
    finalUrl,
    mode: 'web_app',
    envBase: {
      TELEGRAM_WEBAPP_BASE_URL:
        process.env.TELEGRAM_WEBAPP_BASE_URL?.trim() ?? null,
      PUBLIC_FRONTEND_URL: process.env.PUBLIC_FRONTEND_URL?.trim() ?? null,
    },
    route: '/app/dashboard/zoom',
  })

  const coach = await resolveCoachAccess(ctx)
  await ctx.reply(
    `${coachBotContent.system.calendarTitle}\n\n${coachBotContent.system.calendarSubtitle}`,
    {
      ...buildCoachMainMenuReplyMarkup(coach?.role ?? 'EXPERT'),
      ...Markup.inlineKeyboard([
        [Markup.button.webApp(coachBotContent.system.calendarCta, finalUrl)],
      ]),
    }
  )
}

export async function showCoachAgentsMenu(ctx: Context): Promise<void> {
  const agentsUrl = await resolveCoachAgentsUrl(ctx)
  const webappBase = resolveCoachWebAppBaseUrl()
  const coach = await resolveCoachAccess(ctx)
  const chatId = String(ctx.chat?.id ?? ctx.from?.id ?? '').trim()
  const previousMessageId = chatId ? lastCoachAgentsMessageByChat.get(chatId) ?? null : null

  if (chatId && previousMessageId) {
    await ctx.telegram.deleteMessage(chatId, previousMessageId).catch(() => undefined)
  }

  const replyMessage = await ctx.reply(
    `${coachBotContent.system.agentsTitle}\n\n${coachBotContent.system.agentsSubtitle}`,
    {
      ...buildCoachMainMenuReplyMarkup(coach?.role ?? 'EXPERT'),
      ...Markup.inlineKeyboard([
        [Markup.button.webApp(coachBotContent.system.agentsCta, agentsUrl)],
      ]),
    }
  )

  if (chatId && typeof replyMessage?.message_id === 'number') {
    lastCoachAgentsMessageByChat.set(chatId, replyMessage.message_id)
  }

  console.info('[COACH_AGENTS_BUTTON_DEBUG]', {
    source: 'coachStart.showCoachAgentsMenu',
    chatId,
    finalUrl: agentsUrl,
    mode: 'web_app',
    webappBase,
    route: COACH_AGENTS_RETURN_TARGET,
  })
}
