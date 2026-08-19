import type { Telegraf } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { sendTelegramMessage } from '../../../lib/telegram/messageFormatter.js'
import { FOCUS_PRODUCT_CODES } from '../../subscriptions/payments/focus-access.js'
import type { ZoomSession } from '../types.js'
import { buildZoomCalendarUrl } from '../urls.js'

function resolveZoomCalendarUrl(): string { return buildZoomCalendarUrl() }
function canUseTelegramWebAppButton(url: string | null | undefined): boolean { return Boolean(url && url.startsWith('https://') && !url.includes('localhost') && !url.includes('127.0.0.1')) }
function getSafeName(firstName?: string | null): string { if (!firstName) return ''; const trimmed=firstName.replace(/[<>{}\[\]]/g,'' ).replace(/\s+/g,' ').trim().slice(0,40); if (!trimmed) return ''; const lowered=trimmed.toLowerCase(); if (['undefined','null','user','test','admin','bot','учень','coach'].includes(lowered) || lowered.startsWith('telegram-guest') || /^\d+$/.test(trimmed) || trimmed.length<2) return ''; return trimmed }

export async function notifySubscribersNewSession(
  telegramBot: Telegraf,
  session: ZoomSession
): Promise<void> {
  const zoomUrl = resolveZoomCalendarUrl()
  const inviteUrl = process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK?.trim() ?? ''

  const paidUsers = await prisma.user.findMany({
    where: {
      productSubscriptions: {
        some: {
          status: 'ACTIVE',
          product: {
            is: {
              code: { in: [...FOCUS_PRODUCT_CODES] },
            },
          },
        },
      },
      deletedAt: null,
    },
    select: {
      firstName: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const dt = new Date(session.scheduledAt)
  const dateStr = dt.toLocaleString('uk-UA', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

  for (const user of paidUsers) {
    const tgId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null
    if (!tgId) continue

    const safeName = getSafeName(user.firstName)
    const greeting = safeName ? `${safeName}, ` : ''
    const text =
      `${greeting}опубліковано нову Zoom-практику.\n\n` +
      `${dateStr}\n` +
      `${session.topic}\n\n` +
      'Посилання на підключення надійде за 2 год до початку.'

    const calendarButton = canUseTelegramWebAppButton(zoomUrl)
      ? { text: 'Переглянути календар', web_app: { url: zoomUrl } }
      : { text: 'Переглянути календар', url: zoomUrl }
    const secondRow = inviteUrl
      ? [{ text: 'УВІЙТИ У ФОКУС', url: inviteUrl }]
      : []

    try {
      await sendTelegramMessage(telegramBot, tgId, text, {
        replyMarkup: {
          inline_keyboard: [
            [calendarButton],
            ...(secondRow.length > 0 ? [secondRow] : []),
          ],
        },
      })
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (err) {
      console.warn(`[notify paid] failed ${tgId}:`, err)
    }
  }

  const unpaidLeads = await prisma.user.findMany({
    where: {
      testResultType: { not: null },
      productSubscriptions: {
        none: { status: 'ACTIVE' },
      },
      deletedAt: null,
    },
    select: {
      firstName: true,
      testResultType: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const RESULT_LABEL: Record<string, string> = {
    STATE: 'СТАН',
    GOAL: 'ЦІЛЬ',
    CHOICE: 'ВИБІР',
    DECISION: 'РІШЕННЯ',
    ACTION: 'ДІЯ',
  }

  for (const user of unpaidLeads) {
    const tgId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null
    if (!tgId) continue
    const name = getSafeName(user.firstName)
    const greeting = name ? `${name}, ` : ''
    const focus = RESULT_LABEL[user.testResultType ?? ''] ?? 'поточний запит'
    const leadText =
      `${greeting}відбудеться Zoom-практика ФОКУС.\n\n` +
      `${dateStr}\n${session.topic}\n\n` +
      `Діагностика зафіксувала пріоритетну точку: ${focus}.\n` +
      'Саме цей патерн розбирається на живих практиках ФОКУС.\n\n' +
      'Для участі необхідно активувати доступ.'
    try {
      await sendTelegramMessage(telegramBot, tgId, leadText, {
        replyMarkup: {
          inline_keyboard: [
            [
              {
                text: 'Активувати доступ до ФОКУС',
                callback_data: 'open_focus_payment',
              },
            ],
          ],
        },
      })
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (err) {
      console.warn(`[notify lead] failed ${tgId}:`, err)
    }
  }
}
