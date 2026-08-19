import type { Telegraf } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { sendTelegramMessage } from '../../../lib/telegram/messageFormatter.js'
import { FOCUS_PRODUCT_CODES } from '../../subscriptions/payments/focus-access.js'
import type { ZoomSession } from '../types.js'
import { buildZoomCalendarUrl } from '../urls.js'
import { getCoachReminderUserIds, scheduleReminders } from './zoom.reminders.service.js'

function resolveZoomCalendarUrl(): string { return buildZoomCalendarUrl() }
function canUseTelegramWebAppButton(url: string | null | undefined): boolean { return Boolean(url && url.startsWith('https://') && !url.includes('localhost') && !url.includes('127.0.0.1')) }
function isGroupPracticeRequest(requests: unknown): boolean { return Boolean(requests && !Array.isArray(requests) && typeof requests === 'object' && (requests as Record<string, unknown>).type === 'group_practice') }
function getSafeName(firstName?: string | null): string { if (!firstName) return ''; const trimmed=firstName.replace(/[<>{}\[\]]/g,'' ).replace(/\s+/g,' ').trim().slice(0,40); if (!trimmed) return ''; const lowered=trimmed.toLowerCase(); if (['undefined','null','user','test','admin','bot','учень','coach'].includes(lowered) || lowered.startsWith('telegram-guest') || /^\d+$/.test(trimmed) || trimmed.length<2) return ''; return trimmed }

export async function notifyMonthSchedule(
  telegramBot: Telegraf,
  sessions: ZoomSession[]
): Promise<void> {
  if (sessions.length === 0) return

  const upcomingGroupSessions = sessions
    .filter((session) => isGroupPracticeRequest(session.requests))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())

  if (upcomingGroupSessions.length === 0) return

  const focusInviteUrl =
    process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK?.trim() ?? ''
  const zoomUrl = resolveZoomCalendarUrl()

  const scheduleLines = upcomingGroupSessions
    .map((session) => {
      const dt = new Date(session.scheduledAt)
      return (
        dt.toLocaleString('uk-UA', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }) + ` — ${session.topic}`
      )
    })
    .join('\n')

  const firstDt = new Date(upcomingGroupSessions[0].scheduledAt)
  const monthLabel = firstDt.toLocaleString('uk-UA', {
    month: 'long',
    year: 'numeric',
  })

  const activeSubscriptionUsers = await prisma.user.findMany({
    where: {
      productSubscriptions: { some: { status: 'ACTIVE' } },
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
      productSubscriptions: {
        where: { status: 'ACTIVE' },
        select: {
          product: {
            select: { code: true },
          },
        },
      },
    },
  })

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
      id: true,
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

  const selectedUserIds = new Set(paidUsers.map((user) => user.id))
  for (const user of activeSubscriptionUsers) {
    const products = user.productSubscriptions
      .map((subscription) => subscription.product.code)
      .filter((code): code is string => Boolean(code))
    const selected = selectedUserIds.has(user.id)
    console.info('[FOCUS_AUDIENCE]', {
      userId: user.id,
      product: products.length > 0 ? products.join(',') : 'none',
      selected,
      reason: selected
        ? 'active_focus_subscription'
        : 'active_non_focus_subscription',
    })
  }

  const paidText =
    `Розклад Zoom-практик ФОКУС — ${monthLabel}\n\n` +
    `${scheduleLines}\n\n` +
    'Посилання на підключення надходить автоматично за 2 год до початку кожної практики.'

  const calBtn = canUseTelegramWebAppButton(zoomUrl)
    ? { text: 'Переглянути календар', web_app: { url: zoomUrl } }
    : { text: 'Переглянути календар', url: zoomUrl }

  for (const user of paidUsers) {
    const tgId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null
    if (!tgId) continue
    const name = getSafeName(user.firstName)
    const greeting = name ? `${name}, ` : ''
    const secondRow = focusInviteUrl
      ? [{ text: 'УВІЙТИ У ФОКУС', url: focusInviteUrl }]
      : []
    try {
      await sendTelegramMessage(telegramBot, tgId, `${greeting}${paidText}`, {
        replyMarkup: {
          inline_keyboard: [
            [calBtn],
            ...(secondRow.length > 0 ? [secondRow] : []),
          ],
        },
      })
      for (const session of upcomingGroupSessions) {
        await scheduleReminders(user.id, session)
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (err) {
      console.warn(`[notifyMonth paid] ${tgId}:`, err)
    }
  }

  for (const session of upcomingGroupSessions) {
    for (const coachId of await getCoachReminderUserIds(session.expertId)) {
      await scheduleReminders(coachId, session)
    }
  }

  const leads = await prisma.user.findMany({
    where: {
      testResultType: { not: null },
      productSubscriptions: { none: { status: 'ACTIVE' } },
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

  const resultContext: Record<string, string> = {
    STATE:
      'Діагностика зафіксувала точку: СТАН. На практиках ФОКУС розбираємо саме цей патерн.',
    GOAL: 'Діагностика зафіксувала точку: ЦІЛЬ. На практиках ФОКУС переводимо запит у конкретний крок.',
    CHOICE:
      'Діагностика зафіксувала точку: ВИБІР. На практиках ФОКУС працюємо з блоком вибору.',
    DECISION:
      'Діагностика зафіксувала точку: РІШЕННЯ. На практиках ФОКУС доводимо до фіксації і дії.',
    ACTION:
      'Діагностика зафіксувала точку: ДІЯ. На практиках ФОКУС декомпозуємо крок до виконуваного формату.',
  }

  for (const lead of leads) {
    const tgId = lead.telegramChatId ?? lead.telegramLinks[0]?.chatId ?? null
    if (!tgId) continue
    const name = getSafeName(lead.firstName)
    const greeting = name ? `${name}, ` : ''
    const context = resultContext[lead.testResultType ?? ''] ?? ''
    const text =
      `${greeting}опубліковано розклад Zoom-практик ФОКУС на ${monthLabel}.\n\n` +
      `${scheduleLines}\n\n` +
      `${context ? `${context}\n\n` : ''}` +
      'Для участі необхідно активувати доступ.'

    try {
      await sendTelegramMessage(telegramBot, tgId, text, {
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
      console.warn(`[notifyMonth lead] ${tgId}:`, err)
    }
  }

  console.log(
    `[notifyMonthSchedule] paid=${paidUsers.length} leads=${leads.length} sessions=${upcomingGroupSessions.length}`
  )
}
