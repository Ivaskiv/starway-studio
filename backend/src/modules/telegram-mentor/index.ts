import { Markup } from 'telegraf'
import type { Context } from 'telegraf'
import { ZoomStatus } from '@starway/db/prisma-client'

import { bot, sendOpsTelegramMessage } from '../../lib/telegram.js'
import { prisma } from '../../db/client.js'
import { trackDmStartFromContent } from '../events/contentAttribution.service.js'
import { guard } from './core/guard.middleware.js'
import { handleChat } from './handlers/chat.js'
import { handleEvening } from './handlers/evening.js'
import { handleMorning } from './handlers/morning.js'
import { handlePrivacy } from './handlers/privacy.js'
import { handleStatus } from './handlers/status.js'
import { handleVoice } from './handlers/voice.js'
import { getSession, parseQuestionState } from './session.js'
import { handleEveningAnswer } from './handlers/evening.js'
import { handleMorningAnswer } from './handlers/morning.js'
import { getAccessAwareAppReplyMarkupForContext, handleStart } from './handlers/start.js'
import { logger } from '../../utils/logger.js'
import { resolveLinkedUserIdFromContext } from './core/state.service.js'
import { resolveDecision, shouldRenderDecisionBeforeTransport } from '../../core/decision/decision.resolver.js'
import { renderTelegram } from './renderers/decisionTelegram.js'
import { dispatchTelegramCallbackEvent } from './services/telegram-event-bus.service.js'
import { handleFocusChannelJoinByTelegramUserId, sendAbTestBlock12Welcome } from '../subscriptions/payments/callback.notifications.js'
import { callProviderSafe } from '../sales-assistant/sales-assistant.providers.js'
import { conversationOrchestrator } from './conversation/orchestrator/ConversationOrchestrator.js'
import type { OrchestratedContext } from './conversation/types.js'
import { planAck, planMessage } from './conversation/delivery/planDelivery.js'
import {
  AB_TEST_ACTIONS,
} from '@/packages/abTestActions.js'
import {
  handleAbTestCallback,
  handleAbTestEmailCaptureText,
  markAbTestPaymentSuccess,
} from '@/products/ab-system/telegram/abTest.service.js'
import { hasActiveFocusSubscription } from '../subscriptions/payments/focus.access.js'
import { parseZoomChannelPost } from '../zoom/zoom.channel-parser.js'
import { resolveModelStrategyTier } from '@starway/ai/providers/routing'
import {
  afterZoomOperation,
  createFullSession,
  notifyMonthSchedule,
  syncChannelPost,
  updateSession,
} from '../zoom/service.js'
import { dispatchPipelineCallback, registerPipelineCommands } from '../content-pipeline/pipeline.controller.js'

let mentorBotRegistered = false
const processedUpdates = new Set<number>()

interface MentorBotRegistrationOptions {
  product?: string
}

function hasStructuredFields(text: string): boolean {
  const lowered = text.toLowerCase()
  return lowered.includes('дата:') && lowered.includes('час:') && lowered.includes('тема:')
}

interface MonthSessionLine {
  scheduledAt: Date
  topic: string
  zoomLink: string
}

function buildNotebookSystemPrompt(): string {
  return [
    'Ти Claude Notebook Assistant для Telegram-каналу.',
    'Користувач пише короткі нотатки, ідеї, уточнення або запити.',
    'Відповідай українською, коротко, по суті, без зайвої теорії.',
    'Якщо це нотатка, коротко структуруй її у 2-4 булети: суть, сенс, наступний крок.',
    'Якщо це запит, дай практичну відповідь у 1-3 пунктах.',
    'Не вигадуй факти. Якщо бракує контексту, скажи про це прямо.',
    'Не перевищуй 1200 символів.',
  ].join(' ')
}

async function handleNotebookChannelPost(ctx: Context, post: {
  chat?: { id?: number | string }
  message_id?: number
  text?: string
  caption?: string | null
}): Promise<boolean> {
  const rawText = String(post.text ?? post.caption ?? '').trim()
  if (!rawText) return false

  const chatId = String(post.chat?.id ?? '').trim()
  if (!chatId) return false

  const strategyTier = resolveModelStrategyTier('raw_truth')

  await ctx.telegram.sendChatAction(chatId, 'typing').catch(() => undefined)
  const result = await callProviderSafe(
    'claude',
    buildNotebookSystemPrompt(),
    [
      'Нотатка з Telegram-каналу:',
      rawText,
    ].join('\n\n'),
    {
      contentType: 'CUSTOM',
      strategyTier,
    },
  )

  if (!result.content?.trim()) {
    const err = result.error
    const isBalance = err?.status === 400 &&
      String(err?.message ?? '').toLowerCase().includes('баланс')
    const isBadRequest = err?.code === 'INVALID_PROVIDER_REQUEST'
    const reason = (isBalance || isBadRequest)
      ? '💳 Вичерпано баланс Anthropic API'
      : '⚠️ Claude API тимчасово недоступний'
    const buttons = (isBalance || isBadRequest)
      ? Markup.inlineKeyboard([[
          Markup.button.url(
            '💳 Поповнити баланс',
            'https://console.anthropic.com/settings/billing',
          ),
        ]])
      : Markup.inlineKeyboard([[
          Markup.button.callback('🔄 Спробувати ще раз', 'retry_last_action'),
        ]])

    console.warn('[NOTEBOOK] Claude returned empty response', {
      chatId,
      messageId: typeof post.message_id === 'number' ? post.message_id : null,
      hasError: Boolean(result.error),
      error: result.error ?? null,
    })
    await ctx.telegram.sendMessage(
      chatId,
      `❌ Не вдалося отримати відповідь від Claude.\n\n${reason}`,
      buttons,
    ).catch(() => undefined)
    return true
  }

  const replyText = result.content.trim().slice(0, 3900)
  console.info('[NOTEBOOK] channel post processed by Claude', {
    chatId,
    messageId: typeof post.message_id === 'number' ? post.message_id : null,
    responseLength: replyText.length,
  })

  await ctx.telegram.sendMessage(
    chatId,
    replyText,
  ).catch(() => undefined)
  return true
}

function parseMonthSchedule(
  text: string,
  year: number,
): { lines: MonthSessionLine[]; errors: string[] } {
  const errors: string[] = []
  const lines: MonthSessionLine[] = []
  const rows = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[A-Za-zА-Яа-яІіЇїЄєҐґ]{2}\s+\d{2}\.\d{2}/.test(line))

  for (const row of rows) {
    const parts = row.split('|').map((part) => part.trim())
    if (parts.length < 2) {
      errors.push(`Невірний рядок: ${row}`)
      continue
    }

    const dateMatch = parts[0].match(/(\d{2})\.(\d{2})/)
    if (!dateMatch) {
      errors.push(`Не вдалось розпізнати дату: ${parts[0]}`)
      continue
    }

    const day = Number(dateMatch[1])
    const month = Number(dateMatch[2])
    const timeMatch = parts[0].match(/(\d{2}):(\d{2})/)
    const hours = timeMatch ? Number(timeMatch[1]) : 19
    const minutes = timeMatch ? Number(timeMatch[2]) : 0
    const scheduledAt = new Date(year, month - 1, day, hours, minutes, 0, 0)

    if (
      Number.isNaN(scheduledAt.getTime())
      || scheduledAt <= new Date()
      || scheduledAt.getMonth() !== month - 1
      || scheduledAt.getDate() !== day
    ) {
      errors.push(`Дата в минулому або невірна: ${parts[0]}`)
      continue
    }

    const topic = parts[1] || 'Zoom-практика ФОКУС'
    const zoomLink = parts[2] ?? ''
    if (zoomLink && !zoomLink.startsWith('https://')) {
      errors.push(`Link має починатись з https://: ${zoomLink}`)
      continue
    }

    lines.push({ scheduledAt, topic, zoomLink })
  }

  return { lines, errors }
}

async function handleTextMessage(ctx: Context) {
  if (!('message' in ctx) || !ctx.message || !('text' in ctx.message)) {
    return
  }

  const text = String(ctx.message.text ?? '').trim()
  if (!text || text.startsWith('/')) {
    return
  }
  const chatId = String(ctx.chat?.id ?? '')

  const normalizedText = text.toLowerCase()
  if (
    normalizedText === 'почати тест' ||
    normalizedText === 'продовжити тут' ||
    normalizedText === 'пройти тест'
  ) {
    console.info('[AB_TEST_START_DEBUG] text_fallback:start_button_text', {
      text,
      normalizedText,
      chatId,
      userId: (ctx.state as { userId?: string | null }).userId ?? null,
    })
    const started = await handleAbTestCallback(ctx, AB_TEST_ACTIONS.START)
    if (started) {
      console.info('[AB_TEST_START_DEBUG] text_fallback:start_button_handled', {
        text,
        chatId,
      })
      return
    }
    console.warn('[AB_TEST_START_DEBUG] text_fallback:start_button_not_handled', {
      text,
      chatId,
    })
  }

  if (normalizedText === 'задати питання') {
    console.info('[AB_TEST_START_DEBUG] text_fallback:faq_button_text', {
      text,
      chatId,
      userId: (ctx.state as { userId?: string | null }).userId ?? null,
    })
    const opened = await handleAbTestCallback(ctx, AB_TEST_ACTIONS.OPEN_FAQ)
    if (opened) {
      return
    }
  }

  if (normalizedText === 'дізнатись про фокус') {
    const opened = await handleAbTestCallback(ctx, AB_TEST_ACTIONS.FOCUS_INFO)
    if (opened) return
  }

  if (normalizedText === 'оплатити фокус') {
    const opened = await handleAbTestCallback(ctx, AB_TEST_ACTIONS.FOCUS_PAY)
    if (opened) return
  }

  if (normalizedText === 'підписка' || normalizedText === 'моя підписка') {
    const opened = await handleAbTestCallback(ctx, AB_TEST_ACTIONS.SUBSCRIPTION)
    if (opened) return
  }

  if (
    normalizedText === 'я вже оплатив' ||
    normalizedText === 'я вже оплатила' ||
    normalizedText === 'я вже оплатив / оплатила'
  ) {
    const opened = await handleAbTestCallback(ctx, AB_TEST_ACTIONS.FOCUS_ALREADY_PAID)
    if (opened) return
  }

  if (chatId) {
    const session = await getSession(chatId)
    const parsed = session ? parseQuestionState(session.state) : null

    if (parsed?.type === 'morning') {
      await handleMorningAnswer(ctx, text)
      return
    }

    if (parsed?.type === 'evening') {
      await handleEveningAnswer(ctx, text)
      return
    }
  }

  const userId = (ctx.state as { userId?: string | null }).userId ?? null
  const userState = (ctx.state as { userState?: string | null }).userState ?? null
  if (userId) {
    const handledEmailCapture = await handleAbTestEmailCaptureText(ctx, userId, text)
    if (handledEmailCapture) {
      return
    }
  }
  if (userId) {
    await trackDmStartFromContent(userId, text, 'telegram', typeof userState === 'string' ? userState : null)
  }

  const { decision } = await resolveDecision(userId, 'chat_requested', { text })
  if (shouldRenderDecisionBeforeTransport(decision)) {
    await renderTelegram(ctx, decision, ctx.from?.first_name ?? 'Привіт')
    return
  }

  await handleChat(ctx, text)
}

function isStaleCallback(ctx: Context, maxAgeMs = 2 * 60 * 60 * 1000): boolean {
  if (!('callbackQuery' in ctx) || !ctx.callbackQuery || !('message' in ctx.callbackQuery)) {
    return false
  }

  const message = ctx.callbackQuery.message
  if (!message || typeof message !== 'object' || !('date' in message)) {
    return false
  }

  const messageDate = Number((message as { date?: number }).date ?? 0) * 1000
  if (!Number.isFinite(messageDate) || messageDate <= 0) {
    return false
  }

  return Date.now() - messageDate > maxAgeMs
}

export async function registerMentorBot(_options?: MentorBotRegistrationOptions) {
  if (mentorBotRegistered) return
  mentorBotRegistered = true

  bot.use(async (ctx, next) => {
    conversationOrchestrator.patchContext(ctx as OrchestratedContext)
    await next()
  })

  bot.use(async (ctx, next) => {
    const updateId = ctx.update.update_id
    if (processedUpdates.has(updateId)) {
      return
    }

    processedUpdates.add(updateId)
    setTimeout(() => processedUpdates.delete(updateId), 5_000)
    await next()
  })

  bot.use(async (ctx, next) => {
    ;(ctx.state as { userId?: string | null }).userId = await resolveLinkedUserIdFromContext(ctx)
    await next()
  })

  bot.command('start', handleStart)

  bot.use(guard)

  bot.command('morning', handleMorning)
  bot.command('evening', handleEvening)
  bot.command('status', handleStatus)
  bot.command('privacy', handlePrivacy)
  bot.command('resend_block12', async (ctx) => {
    if (process.env.NODE_ENV === 'production') {
      await ctx.reply('Команда доступна лише в dev середовищі.')
      return
    }
    const commandText =
      'message' in ctx && ctx.message && 'text' in ctx.message
        ? String(ctx.message.text ?? '').trim()
        : ''
    const [, rawTelegramId] = commandText.split(/\s+/, 2)

    if (rawTelegramId) {
      const telegramId = rawTelegramId.trim()
      const targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { telegramUserId: telegramId },
            { telegramChatId: telegramId },
            { telegramLinks: { some: { chatId: telegramId } } },
          ],
        },
        select: { id: true },
      })
      if (!targetUser) {
        await ctx.reply(`Користувача з telegram id ${telegramId} не знайдено.`)
        return
      }
      const hasActiveFocus = await hasActiveFocusSubscription(targetUser.id)
      if (!hasActiveFocus) {
        await ctx.reply(`Для ${telegramId} підписка ФОКУС неактивна.`)
        return
      }
      await markAbTestPaymentSuccess(targetUser.id)
      await sendAbTestBlock12Welcome(targetUser.id)
      await ctx.reply(`✅ Block 12 відправлено користувачу ${telegramId}.`)
      return
    }

    const resent = await handleAbTestCallback(ctx, AB_TEST_ACTIONS.FOCUS_ALREADY_PAID)
    if (!resent) {
      await ctx.reply('Не вдалося повторно надіслати Block 12. Спробуй через меню «Я вже оплатив / оплатила».')
      return
    }
    await ctx.reply('✅ Block 12 повторно надіслано.')
  })
  registerPipelineCommands(bot)
  bot.command('zoomhelp', async (ctx) => {
    const coachTelegramId = process.env.COACH_TELEGRAM_ID?.trim()
    if (!coachTelegramId || String(ctx.from?.id ?? '') !== coachTelegramId) return

    await ctx.reply(
      'Команди управління розкладом:\n\n'
      + '/zoom month ММ.РРРР\n'
      + 'Пн ДД.ММ | Тема | https://link\n'
      + '  Додати місячний розклад\n\n'
      + '/zoom edit <id> link https://новий-link\n'
      + '  Оновити Zoom-посилання\n\n'
      + '/zoom edit <id> time РРРР-ММ-ДД ГГ:ХХ\n'
      + '  Перенести час сесії\n\n'
      + '/zoomhelp — цей список',
    )
  })
  bot.hears(/^\/zoom edit ([a-z0-9-]+) (link|time) (.+)$/i, async (ctx) => {
    try {
      const coachTelegramId = process.env.COACH_TELEGRAM_ID?.trim()
      if (!coachTelegramId || String(ctx.from?.id ?? '') !== coachTelegramId) return

      const sessionId = String(ctx.match[1] ?? '').trim()
      const field = String(ctx.match[2] ?? '').trim().toLowerCase()
      const value = String(ctx.match[3] ?? '').trim()

      const session = await prisma.zoomSession.findUnique({ where: { id: sessionId } })
      if (!session) {
        await ctx.reply(`Сесію ${sessionId} не знайдено.`)
        return
      }

      if (field === 'link') {
        if (!value.startsWith('https://')) {
          await ctx.reply('Link має починатись з https://')
          return
        }
        const existingMeta =
          session.requests && typeof session.requests === 'object' && !Array.isArray(session.requests)
            ? (session.requests as Record<string, unknown>)
            : {}

        await updateSession(sessionId, {
          requests: {
            ...existingMeta,
            zoomLink: value,
          },
        })
        await ctx.reply(`Zoom-посилання оновлено.\n${session.topic}`)
        const panelBase = process.env.PUBLIC_FRONTEND_URL?.trim() ?? ''
        const panelUrl = panelBase ? `${panelBase.replace(/\/$/, '')}/app/dashboard/zoom` : ''
        void sendOpsTelegramMessage(
          `ТРАНЗАКЦІЙНИЙ ЗВІТ\n\n`
          + `Тип події: Редагування сесії\n`
          + `Сесія: ${session.topic}\n`
          + `Зміна: Zoom-посилання\n`
          + `Нове значення: ${value}`,
          panelUrl
            ? { reply_markup: { inline_keyboard: [[{ text: 'Панель керування', url: panelUrl }]] } }
            : undefined,
        ).catch((err) => console.error('[zoom edit] ops report:', err))
        return
      }

      const normalized = value.replace(' ', 'T')
      const parsedDate = new Date(normalized)
      if (Number.isNaN(parsedDate.getTime())) {
        await ctx.reply('Невірний формат.\nПриклад: /zoom edit <id> time 2026-06-09 19:00')
        return
      }

      const updated = await updateSession(sessionId, {
        scheduledAt: parsedDate,
      })
      const attendees = await prisma.zoomSessionAttendee.findMany({
        where: { sessionId },
        select: { userId: true },
      })
      void afterZoomOperation(bot, {
        operation: 'update',
        sessionId,
        affectedUserIds: attendees.map((attendee) => attendee.userId),
      }).catch((err) => console.error('[zoom edit] afterZoomOperation:', err))

      await ctx.reply(
        `Час сесії оновлено.\n${updated.topic}\n`
        + `Новий час: ${updated.scheduledAt.toLocaleString('uk-UA')}\n`
        + 'Нагадування перераховано.',
      )
      const panelBase = process.env.PUBLIC_FRONTEND_URL?.trim() ?? ''
      const panelUrl = panelBase ? `${panelBase.replace(/\/$/, '')}/app/dashboard/zoom` : ''
      void sendOpsTelegramMessage(
        `ТРАНЗАКЦІЙНИЙ ЗВІТ\n\n`
        + `Тип події: Редагування сесії\n`
        + `Сесія: ${updated.topic}\n`
        + `Зміна: Час\n`
        + `Нове значення: ${updated.scheduledAt.toLocaleString('uk-UA')}`,
        panelUrl
          ? { reply_markup: { inline_keyboard: [[{ text: 'Панель керування', url: panelUrl }]] } }
          : undefined,
      ).catch((err) => console.error('[zoom edit] ops report:', err))
    } catch (error) {
      logger.error('[telegram-thin-client:zoom_edit]', error)
      await ctx.reply('Не вдалося оновити сесію. Перевір параметри і повтори.')
    }
  })
  bot.hears(/^\/zoom month\s+([\s\S]+)/, async (ctx) => {
    try {
      const coachTelegramId = process.env.COACH_TELEGRAM_ID?.trim()
      if (!coachTelegramId || String(ctx.from?.id ?? '') !== coachTelegramId) return

      const raw = ctx.match[1]
      const fullText = typeof raw === 'string' ? raw.trim() : ''
      if (!fullText) {
        await ctx.reply('Не передано тіло розкладу. Формат: /zoom month ММ.РРРР + рядки сесій.')
        return
      }

      await ctx.reply('Обробка розкладу...')
      await ctx.telegram.sendChatAction(ctx.chat.id, 'typing')

      const headerMatch = fullText.match(/(\d{2})\.(\d{4})/)
      if (!headerMatch) {
        await ctx.reply('Не вдалось розпізнати місяць. Формат першого рядка: /zoom month ММ.РРРР')
        return
      }
      const year = Number(headerMatch[2])
      const { lines, errors } = parseMonthSchedule(fullText, year)

      if (errors.length > 0) {
        await ctx.reply(`Знайдено помилки в розкладі:\n\n${errors.join('\n')}\n\nВиправ і надішли ще раз.`)
        return
      }
      if (lines.length === 0) {
        await ctx.reply('Рядки розкладу не знайдено. Перевір формат.')
        return
      }

      const expert = await prisma.expert.findFirst({
        where: { users: { some: { telegramUserId: coachTelegramId } } },
        select: { id: true },
      }) ?? await prisma.expert.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })

      if (!expert) {
        await ctx.reply('Expert не знайдено в БД.')
        return
      }

      const created = []
      const skipped: string[] = []

      for (const line of lines) {
        const existing = await prisma.zoomSession.findFirst({
          where: {
            expertId: expert.id,
            scheduledAt: line.scheduledAt,
            status: { not: ZoomStatus.CANCELLED },
          },
          select: { id: true },
        })

        if (existing) {
          skipped.push(`${line.scheduledAt.toLocaleDateString('uk-UA')} — вже існує`)
          continue
        }

        const session = await createFullSession({
          expertId: expert.id,
          scheduledAt: line.scheduledAt,
          topic: line.topic,
          requests: {
            type: 'group_practice',
            zoomLink: line.zoomLink,
            notify24h: true,
            notify2h: true,
            notifiedAt24h: null,
            notifiedAt2h: null,
          },
        }, {
          suppressAutomation: true,
          suppressSessionNotification: true,
        })
        created.push(session)
      }

      const createdLines = created
        .map((session) => {
          const dt = new Date(session.scheduledAt)
          return `${dt.toLocaleString('uk-UA', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })} — ${session.topic}`
        })
        .join('\n')

      await ctx.reply(
        `Розклад збережено: ${created.length} сесій.\n\n`
          + `${createdLines || 'Нових сесій не створено.'}`
          + (skipped.length > 0 ? `\n\nПропущено (вже існує):\n${skipped.join('\n')}` : ''),
      )

      if (created.length === 0) return

      void syncChannelPost(bot).catch((err) => console.error('[zoom month] syncChannelPost:', err))
      void notifyMonthSchedule(bot, created).catch((err) => console.error('[zoom month] notifyMonth:', err))
    } catch (error) {
      logger.error('[telegram-thin-client:zoom_month]', error)
      await ctx.reply('Не вдалося обробити розклад. Перевір формат і повтори.')
    }
  })

  bot.on('text', async (ctx) => {
    try {
      await handleTextMessage(ctx)
    } catch (error) {
      logger.error('[telegram-thin-client:text]', error)
      const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
      await planMessage(ctx, 'ctx.reply', 'telegram_text_error', 'Не вдалося обробити повідомлення.', replyMarkup)
    }
  })

  bot.on(['voice', 'audio'], async (ctx) => {
    try {
      await handleVoice(ctx)
    } catch (error) {
      logger.error('[telegram-thin-client:voice]', error)
      const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
      await planMessage(ctx, 'ctx.reply', 'telegram_voice_error', 'Не вдалося обробити голосове повідомлення.', replyMarkup)
    }
  })

  bot.on('callback_query', async (ctx) => {
    const action = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
    // FIX 2025-05-25 B1: remove global callback ack; ack is handled inside concrete callback handlers
    // FIX 2026-05-25 C2: temporary callback diagnostic log
    console.log('[BOT][CB] data:', action, 'from:', ctx.from?.id)
    console.info('[AB_TEST_START_DEBUG] callback_query:received', {
      action,
      chatId: String(ctx.chat?.id ?? ''),
      fromId: String(ctx.from?.id ?? ''),
      userId: (ctx.state as { userId?: string | null }).userId ?? null,
    })
    try {
      if (await dispatchPipelineCallback(bot, ctx, action)) {
        return
      }

      if (isStaleCallback(ctx)) {
        await planAck(ctx, 'ctx.answerCbQuery', 'telegram_stale_callback', 'Посилання застаріло — натисни /start').catch(() => undefined)
        console.warn('[AB_TEST_START_DEBUG] callback_query:stale_rejected', {
          action,
          chatId: String(ctx.chat?.id ?? ''),
        })
        return
      }

      const handled = await dispatchTelegramCallbackEvent(ctx, action)
      console.info('[CALLBACK_FLOW_RESULT]', {
  action,
  handled,
})

      if (!handled) {
        console.warn('[AB_TEST_START_DEBUG] callback_query:not_handled', {
          action,
          chatId: String(ctx.chat?.id ?? ''),
        })
        await planAck(ctx, 'ctx.answerCbQuery', 'telegram_callback_not_handled', 'Відкрий Mini App для продовження').catch(() => undefined)
      } else {
        console.info('[AB_TEST_START_DEBUG] callback_query:handled', {
          action,
          chatId: String(ctx.chat?.id ?? ''),
        })
      }
    } catch (error) {
      logger.error('[telegram-thin-client:callback]', error)
      await planAck(ctx, 'ctx.answerCbQuery', 'telegram_callback_restore_failed', 'Не вдалося відновити сесію').catch(() => undefined)
    }
  })

  const isParticipantStatus = (status: string | undefined): boolean =>
    status === 'member' || status === 'administrator' || status === 'creator' || status === 'restricted'

  const handleChannelJoinUpdate = async (ctx: Context) => {
    const update = ctx.update as {
      chat_member?: {
        chat?: { id?: number | string }
        old_chat_member?: { status?: string }
        new_chat_member?: { status?: string; user?: { id?: number | string } }
      }
      my_chat_member?: {
        chat?: { id?: number | string }
        old_chat_member?: { status?: string }
        new_chat_member?: { status?: string; user?: { id?: number | string } }
      }
    }

    const memberUpdate = update.chat_member ?? update.my_chat_member
    if (!memberUpdate) return

    const oldStatus = memberUpdate.old_chat_member?.status
    const newStatus = memberUpdate.new_chat_member?.status
    const becameParticipant = !isParticipantStatus(oldStatus) && isParticipantStatus(newStatus)
    if (!becameParticipant) return

    const telegramUserId = String(memberUpdate.new_chat_member?.user?.id ?? '').trim()
    const chatId = String(memberUpdate.chat?.id ?? '').trim()
    if (!telegramUserId || !chatId) return

    await handleFocusChannelJoinByTelegramUserId(telegramUserId, chatId).catch((error) => {
      logger.warn('[focus:block12:post-join] failed', error)
    })
  }

  bot.on('chat_member', async (ctx) => {
    await handleChannelJoinUpdate(ctx)
  })

  bot.on('my_chat_member', async (ctx) => {
    await handleChannelJoinUpdate(ctx)
  })

  bot.on('channel_post', async (ctx) => {
    try {
      const post = (ctx.update as {
        channel_post?: {
          chat?: { id?: number | string }
          message_id?: number
          text?: string
          caption?: string | null
          from?: { id?: number | string }
          voice?: { file_id?: string; file_unique_id?: string; mime_type?: string | null }
          audio?: {
            file_id?: string
            file_unique_id?: string
            mime_type?: string | null
            file_name?: string | null
          }
          document?: {
            file_id?: string
            file_unique_id?: string
            mime_type?: string | null
            file_name?: string | null
          }
        }
      }).channel_post
      console.log('[DEBUG channel_post] отримано update:', {
        chatId: post?.chat?.id,
        text: post?.text?.slice(0, 100),
        type: post?.chat ? 'channel' : undefined,
      })
      if (!post?.chat?.id) return

      const chatId = String(post.chat.id).trim()
      const focusChannelId = process.env.FOCUS_TELEGRAM_CHANNEL_ID?.trim()

      if (focusChannelId && chatId === focusChannelId) {
        if (!post.text) return

        const parsed = parseZoomChannelPost(post.text)
        if (!parsed.isValid) {
          if (parsed.errors.length > 0 && hasStructuredFields(post.text)) {
            const expertTgId = process.env.COACH_TELEGRAM_ID?.trim()
            if (expertTgId) {
              await ctx.telegram.sendMessage(
                expertTgId,
                'Помилка в шаблоні Zoom-сесії:\n\n'
                  + parsed.errors.join('\n')
                  + '\n\nШаблон:\n'
                  + '#zoom\n'
                  + 'Дата: DD.MM.YYYY\n'
                  + 'Час: HH:MM\n'
                  + 'Тема: назва практики\n'
                  + 'Link: https://zoom.us/j/...',
              )
            }
          }
          return
        }

        const coachTelegramId = process.env.COACH_TELEGRAM_ID?.trim()
        if (coachTelegramId && post.from?.id && String(post.from.id) !== coachTelegramId) {
          return
        }

        const expert = coachTelegramId
          ? await prisma.expert.findFirst({
              where: { users: { some: { telegramUserId: coachTelegramId } } },
              select: { id: true },
            })
          : await prisma.expert.findFirst({
              where: { isActive: true },
              orderBy: { createdAt: 'asc' },
              select: { id: true },
            })

        if (!expert) {
          console.warn('[zoom-parser] expert not found')
          return
        }

        const existing = await prisma.zoomSession.findFirst({
          where: {
            expertId: expert.id,
            scheduledAt: parsed.scheduledAt,
            status: { not: ZoomStatus.CANCELLED },
          },
        })

        let isCreated = false

        if (existing) {
          const existingMeta =
            existing.requests && typeof existing.requests === 'object' && !Array.isArray(existing.requests)
              ? (existing.requests as Record<string, unknown>)
              : {}

          await updateSession(existing.id, {
            topic: parsed.topic,
            requests: {
              ...existingMeta,
              type: 'group_practice',
              zoomLink: parsed.zoomLink,
            },
          })
        } else {
          await createFullSession({
            expertId: expert.id,
            scheduledAt: parsed.scheduledAt,
            topic: parsed.topic,
            requests: {
              type: 'group_practice',
              zoomLink: parsed.zoomLink,
              notify24h: true,
              notify2h: true,
              notifiedAt24h: null,
              notifiedAt2h: null,
            },
          })
          isCreated = true
        }

        const expertTgId = process.env.COACH_TELEGRAM_ID?.trim()
        if (expertTgId) {
          const dateStr = parsed.scheduledAt.toLocaleString('uk-UA', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })
          await ctx.telegram.sendMessage(
            expertTgId,
            `Zoom-сесію ${isCreated ? 'додано' : 'оновлено'} в системі.\n\n`
              + `${dateStr}\n`
              + `${parsed.topic}\n\n`
              + 'Нагадування заплановані.',
          )
        }
        return
      }

      if (post.text || post.caption) {
        const handledNotebook = await handleNotebookChannelPost(ctx, post)
        if (handledNotebook) {
          return
        }
      }

      return
    } catch (error) {
      logger.error('[telegram-thin-client:channel_post]', error)
    }
  })

  bot.catch((err, ctx) => {
    void (async () => {
      logger.error('[telegram-thin-client:catch]', err)
      const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
      await planMessage(ctx, 'ctx.reply', 'telegram_global_catch', 'Спробуй ще раз за хвилину.', replyMarkup).catch(() => undefined)
    })()
  })

  // await bot.telegram.setMyCommands([
  //   { command: 'start', description: 'Відкрити Starway' },
  //   { command: 'morning', description: 'Запустити ранкову сесію' },
  //   { command: 'evening', description: 'Запустити вечірню сесію' },
  //   { command: 'status', description: 'Подивитися прогрес' },
  //   { command: 'privacy', description: 'Політика приватності' },
  // ])

  console.log('✅ [TelegramMentor] Thin client handlers registered')
}
