import type { Context } from 'telegraf'
import { Markup } from 'telegraf'

import {
  COACH_AGENTS_RETURN_TARGET,
  generateCoachAgentsWebDeepLink,
} from '../../../modules/deeplinks/service.js'
import { toMutableReplyKeyboard } from '../../../utils/keyboard.js'
import { coachBotContent } from '../../content/coachBot.content.js'
import { resolveCoachUserId } from './access.js'
import { resolveCoachWebAppBaseUrl, resolveTelegramWebappBaseUrl } from '../../../config/webapp.js'

const COACH_CALENDAR_ROUTE = '/miniapp/zoom-calendar'
const lastCoachAgentsMessageByChat = new Map<string, number>()

export const MENU_CONDUCT_PATTERN =
  /^(?:🎙️?\s*)?(?:Новий\s+Zoom|Провести)$/iu

export const MENU_LIBRARY_PATTERN =
  /^(?:📚\s*)?(?:Бібліотека(?:\s+Zoom)?)$/iu

export const MENU_ANALYTICS_PATTERN =
  /^(?:📊\s*)?Аналітика$/iu

export const MENU_AGENTS_PATTERN =
  /^(?:🤖\s*)?Агенти$/iu

export const MENU_SETTINGS_PATTERN =
  /^(?:⚙️\s*)?(?:Система|Налаштування)$/iu

export const MENU_CALENDAR_PATTERN =
  /^(?:📅\s*)?Календар$/iu

function resolveCoachCalendarWebAppUrl(): string {
  const base = resolveTelegramWebappBaseUrl()
  const finalUrl = `${base.replace(/\/$/, '')}${COACH_CALENDAR_ROUTE}`
  console.info('[ZOOM_CALENDAR_BUTTON_DEBUG]', {
    source: 'coachStart.resolveCoachCalendarWebAppUrl',
    chatId: null,
    finalUrl,
    mode: 'web_app',
    envBase: {
      TELEGRAM_WEBAPP_BASE_URL:
        process.env.TELEGRAM_WEBAPP_BASE_URL?.trim() ?? null,
      PUBLIC_FRONTEND_URL: process.env.PUBLIC_FRONTEND_URL?.trim() ?? null,
    },
    route: COACH_CALENDAR_ROUTE,
  })
  return finalUrl
}

async function resolveCoachAgentsUrl(ctx: Context): Promise<string> {
  const coachUserId = await resolveCoachUserId(ctx)
  if (!coachUserId) {
    throw new Error('COACH_USER_NOT_RESOLVED_FOR_AGENTS_LINK')
  }

  return generateCoachAgentsWebDeepLink(coachUserId)
}

export async function showCoachMenu(ctx: Context): Promise<void> {
  const text = `${coachBotContent.start.title}\n\n${coachBotContent.start.subtitle}`
  await ctx.reply(text, buildCoachMainMenuReplyMarkup())
}

export function buildCoachMainMenuReplyMarkup() {
  return {
    reply_markup: toMutableReplyKeyboard({
      keyboard: [
        [coachBotContent.menu.conduct, coachBotContent.menu.library],
        [coachBotContent.menu.analytics, coachBotContent.menu.content],
        [coachBotContent.menu.settings, coachBotContent.menu.agents],
      ],
      resize_keyboard: true,
      is_persistent: true,
    }),
  }
}

export async function showCoachSystemMenu(ctx: Context): Promise<void> {
  const finalUrl = resolveCoachCalendarWebAppUrl()
  console.info('[ZOOM_CALENDAR_BUTTON_DEBUG]', {
    source: 'coachStart.showCoachSystemMenu',
    chatId: String(ctx.chat?.id ?? ctx.from?.id ?? ''),
    finalUrl,
    mode: 'web_app',
    envBase: {
      TELEGRAM_WEBAPP_BASE_URL:
        process.env.TELEGRAM_WEBAPP_BASE_URL?.trim() ?? null,
      PUBLIC_FRONTEND_URL: process.env.PUBLIC_FRONTEND_URL?.trim() ?? null,
    },
    route: COACH_CALENDAR_ROUTE,
  })

  await ctx.reply(
    `${coachBotContent.system.title}\n\n${coachBotContent.system.subtitle}`,
    {
      ...buildCoachMainMenuReplyMarkup(),
      ...Markup.inlineKeyboard([
        [Markup.button.webApp(coachBotContent.menu.schedule, finalUrl)],
        [
          Markup.button.callback(
            coachBotContent.menu.members,
            'coach:participants'
          ),
        ],
        [
          Markup.button.callback(
            coachBotContent.menu.notifications,
            'coach:notifications'
          ),
        ],
        [
          Markup.button.callback(
            coachBotContent.menu.payments,
            'coach-content:payments'
          ),
        ],
        [Markup.button.callback('Повна аналітика', 'coach:analytics')],
      ]),
    }
  )
}

export async function showCoachAgentsMenu(ctx: Context): Promise<void> {
  const agentsUrl = await resolveCoachAgentsUrl(ctx)
  const webappBase = resolveCoachWebAppBaseUrl()
  const chatId = String(ctx.chat?.id ?? ctx.from?.id ?? '').trim()
  const previousMessageId = chatId ? lastCoachAgentsMessageByChat.get(chatId) ?? null : null

  if (chatId && previousMessageId) {
    await ctx.telegram.deleteMessage(chatId, previousMessageId).catch(() => undefined)
  }

  const replyMessage = await ctx.reply(
    `${coachBotContent.system.agentsTitle}\n\n${coachBotContent.system.agentsSubtitle}`,
    {
      ...buildCoachMainMenuReplyMarkup(),
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
