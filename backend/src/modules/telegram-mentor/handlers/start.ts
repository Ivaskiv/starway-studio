import type { UserLifecycleState } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { resolveOrCreateUser } from '../../user/resolveOrCreateUser.js'
import { UserCreationSource } from '../../user/userCreation.service.js'
import { upsertTelegramBinding } from '../services/linking.service.js'
import { clearPendingTelegramIdentity, getPendingTelegramIdentity, isValidEmail, setPendingTelegramIdentity } from '../services/pendingIdentity.service.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'
import {
  type StartContext,
  getStartPayload,
  resolveLinkedUserIdFromContext,
  syncAccessAwareChatEntryPoints,
} from './start.shared.js'
import {
  type StartMessagePayload,
  aiMentorMenuMessage,
  focusPaidMessage,
  magicLinkReadyMessage,
  offerShownMessage,
  testDoneMessage,
  testInProgressMessage,
  welcomeMessage,
  testNotStartedMessage,
  zoomMemberMessage,
} from './abTest.start.js'
import { generateMagicLink } from '../../deeplinks/service.js'
import { handleAbTestEmailCaptureText } from '@/products/ab-system/telegram/abTest.service.js'

export * from './start.shared.js'

const processedStartUpdateIds = new Set<number>()
const activeStartProcessing = new Set<string>()

type StartUserSnapshot = {
  id: string
  lifecycleState: UserLifecycleState
  testStartedAt: Date | null
  testCompletedAt: Date | null
  offerShownAt: Date | null
  testResultType: string | null
  updatedAt: Date
}

function getHoursSince(date: Date | null | undefined): number {
  if (!date) return Number.POSITIVE_INFINITY
  const diffMs = Date.now() - date.getTime()
  return diffMs > 0 ? diffMs / 3_600_000 : 0
}

function buildTelegramGuestEmail(telegramUserId: string): string {
  const normalized = String(telegramUserId ?? '').trim()
  return `telegram-${normalized}@starway.local`
}

async function setLifecycleState(userId: string, lifecycleState: UserLifecycleState): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lifecycleState },
  })
}

async function loadUserSnapshot(userId: string): Promise<StartUserSnapshot> {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      lifecycleState: true,
      testStartedAt: true,
      testCompletedAt: true,
      offerShownAt: true,
      testResultType: true,
      updatedAt: true,
    },
  })
}

async function deliver(
  ctx: StartContext,
  payload: { text: string; reply_markup: { inline_keyboard: StartMessagePayload['buttons'] } },
): Promise<void> {
  const deliveryChatId = ctx.chat?.id ?? ctx.from?.id
  if (!deliveryChatId) return
  await ctx.telegram.sendMessage(deliveryChatId, payload.text, {
    parse_mode: 'HTML',
    reply_markup: payload.reply_markup,
  })
}

async function promptForEmail(ctx: StartContext, chatId: string, telegramUserId: string): Promise<void> {
  await setPendingTelegramIdentity({
    chatId,
    telegramUserId,
    telegramUserName: ctx.from?.username ?? null,
    firstName: ctx.from?.first_name ?? null,
    source: 'telegram_start',
    requestId: Number.isFinite((ctx.update as { update_id?: number }).update_id)
      ? String((ctx.update as { update_id?: number }).update_id)
      : null,
  })

  await planMessage(
    ctx,
    'ctx.reply',
    'telegram_identity_email_prompt',
    [
      'Щоб прив’язати акаунт, надішліть email одним повідомленням.',
      '',
      'Якщо акаунт уже є на сайті, ми під’єднаємо його до Telegram.',
    ].join('\n'),
  )
}

export async function handlePendingTelegramIdentityText(ctx: StartContext, text: string): Promise<boolean> {
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : chatId
  if (!chatId || !telegramUserId) return false

  const pending = await getPendingTelegramIdentity(chatId)
  if (!pending) return false

  const email = text.trim().toLowerCase()
  if (!isValidEmail(email)) {
    await planMessage(
      ctx,
      'ctx.reply',
      'telegram_identity_email_invalid',
      'Схоже, це не email. Надішліть email одним повідомленням.',
    )
    return true
  }

  const existingByTelegram = await prisma.user.findFirst({
    where: {
      OR: [
        { telegramUserId },
        { telegramChatId: chatId },
        { telegramLinks: { some: { chatId, isActive: true } } },
      ],
    },
    select: {
      id: true,
      email: true,
    },
  })

  if (pending.source === 'email_after_test') {
    if (!existingByTelegram) {
      await planMessage(
        ctx,
        'ctx.reply',
        'telegram_identity_email_after_test_missing_user',
        'Не вдалося знайти прив’язаний акаунт. Натисни /start і спробуй ще раз.',
      )
      return true
    }

    ;(ctx.state as { userId?: string | null; userIdResolved?: boolean }).userId = existingByTelegram.id
    ;(ctx.state as { userId?: string | null; userIdResolved?: boolean }).userIdResolved = true
    await clearPendingTelegramIdentity(chatId)
    await handleAbTestEmailCaptureText(ctx, existingByTelegram.id, email)
    return true
  }

  if (existingByTelegram) {
    const hasRealEmail =
      Boolean(existingByTelegram.email) && !existingByTelegram.email.includes('@placeholder.starway.app')

    if (!hasRealEmail) {
      const emailOwner = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      })

      if (emailOwner && emailOwner.id !== existingByTelegram.id) {
        await planMessage(
          ctx,
          'ctx.reply',
          'email_conflict',
          [
            'Цей email вже прив\'язаний до іншого акаунту.',
            'Напишіть інший email або пропустіть.',
          ].join('\n'),
        )
        return true
      }

      await prisma.user.update({
        where: { id: existingByTelegram.id },
        data: { email },
      })
    }

    await upsertTelegramBinding({
      userId: existingByTelegram.id,
      chatId,
      telegramUserId,
      telegramUserName: ctx.from?.username ?? null,
      firstName: ctx.from?.first_name ?? null,
    })

    await clearPendingTelegramIdentity(chatId)
    ;(ctx.state as { userId?: string | null; userIdResolved?: boolean }).userId = existingByTelegram.id
    ;(ctx.state as { userId?: string | null; userIdResolved?: boolean }).userIdResolved = true
    await handleStart(ctx)
    return true
  }

  const resolved = await resolveOrCreateUser(
    {
      email,
      telegramId: telegramUserId,
      chatId,
      telegramUserName: ctx.from?.username ?? undefined,
    },
    {
      source: UserCreationSource.TELEGRAM_START,
      requestId: pending.requestId,
      name: ctx.from?.first_name ?? null,
      createData: {
        lifecycleState: 'NEW_USER',
        currentState: 'NEW',
        currentStep: 'LINK_TELEGRAM',
        activeRole: 'USER',
        telegramLinkedAt: new Date(),
      },
    },
    )

  await upsertTelegramBinding({
    userId: resolved.user.id,
    chatId,
    telegramUserId,
    telegramUserName: ctx.from?.username ?? null,
    firstName: ctx.from?.first_name ?? null,
  })

  await clearPendingTelegramIdentity(chatId)
  ;(ctx.state as { userId?: string | null; userIdResolved?: boolean }).userId = resolved.user.id
  ;(ctx.state as { userId?: string | null; userIdResolved?: boolean }).userIdResolved = true
  await handleStart(ctx)
  return true
}

export async function handleStart(ctx: StartContext) {
  const rawChatId = ctx.chat?.id
  if (!rawChatId) return

  const chatId = String(rawChatId)
  const updateId = Number((ctx.update as { update_id?: number }).update_id ?? 0)

  if (Number.isFinite(updateId) && updateId > 0 && processedStartUpdateIds.has(updateId)) return
  if (activeStartProcessing.has(chatId)) return

  if (Number.isFinite(updateId) && updateId > 0) {
    processedStartUpdateIds.add(updateId)
    setTimeout(() => processedStartUpdateIds.delete(updateId), 60_000)
  }

  activeStartProcessing.add(chatId)
  let startMessageSent = false

  try {
    const telegramUserId = ctx.from?.id ? String(ctx.from.id) : chatId
    const startPayload = getStartPayload(ctx)
    let resolvedUserId = await resolveLinkedUserIdFromContext(ctx)

    if (!resolvedUserId) {
      const resolved = await resolveOrCreateUser(
        {
          telegramId: telegramUserId,
          chatId,
          telegramUserName: ctx.from?.username ?? undefined,
        },
        {
          source: UserCreationSource.TELEGRAM_START,
          expertId: process.env.DEFAULT_AI_EXPERT_ID ?? undefined,
          name: ctx.from?.first_name ?? undefined,
          createData: {
            email: buildTelegramGuestEmail(telegramUserId),
            lifecycleState: 'NEW_USER',
            currentState: 'NEW',
            currentStep: 'LINK_TELEGRAM',
            activeRole: 'USER',
            telegramEnabled: true,
            telegramUserId,
            telegramChatId: chatId,
            telegramUserName: ctx.from?.username ?? null,
            firstName: ctx.from?.first_name ?? null,
            telegramLinkedAt: new Date(),
          },
        },
      )

      await upsertTelegramBinding({
        userId: resolved.user.id,
        chatId,
        telegramUserId,
        telegramUserName: ctx.from?.username ?? null,
        firstName: ctx.from?.first_name ?? null,
      })

      resolvedUserId = resolved.user.id

      console.log('[START] new user created', {
        userId: resolvedUserId,
        telegramId: telegramUserId,
        created: resolved.created,
      })
    }

    const user = await loadUserSnapshot(resolvedUserId)

    ;(ctx.state as { userId?: string | null; userIdResolved?: boolean }).userId = user.id
    ;(ctx.state as { userId?: string | null; userIdResolved?: boolean }).userIdResolved = true
    await syncAccessAwareChatEntryPoints(chatId, user.id)

    if (startPayload.startsWith('ml_')) {
      const requestToken = startPayload.replace(/^ml_/, '').trim()
      const magicLink = await generateMagicLink(user.id)

      console.log('[START] magic login requested', {
        userId: user.id,
        telegramId: telegramUserId,
        requestToken: requestToken || null,
      })

      await deliver(ctx, magicLinkReadyMessage(magicLink))
      return
    }

    switch (user.lifecycleState) {
      case 'NEW_USER': {
        await deliver(ctx, welcomeMessage())
        startMessageSent = true
        await setLifecycleState(user.id, 'TEST_NOT_STARTED')
        return
      }
      case 'TEST_NOT_STARTED': {
        await deliver(ctx, testNotStartedMessage({ escalated: false }))
        startMessageSent = true
        return
      }
      case 'TEST_IN_PROGRESS': {
        const hoursSince = getHoursSince(user.updatedAt)
        if (hoursSince > 168) {
          await deliver(ctx, {
            text: 'Ти вже починала тест, але пройшло більше тижня.\n\nВідповіді можуть бути неактуальні.',
            reply_markup: {
              inline_keyboard: [[
                { text: 'Продовжити', callback_data: 'ab_test:resume' },
                { text: 'Почати заново', callback_data: 'ab_test:restart' },
              ]],
            },
          })
          startMessageSent = true
          return
        }

        await deliver(ctx, testInProgressMessage({ r3: hoursSince > 4 }))
        startMessageSent = true
        return
      }
      case 'TEST_DONE': {
        if (user.testResultType) {
          await deliver(ctx, {
            text: 'Ти вже пройшла тест.\n\nПодивитись результат або пройти заново?',
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Мій результат', callback_data: 'ab_test:show_result' }],
                [{ text: 'Пройти заново', callback_data: 'ab_test:restart' }],
              ],
            },
          })
          startMessageSent = true
          return
        }

        await deliver(ctx, testDoneMessage())
        startMessageSent = true
        return
      }
      case 'OFFER_SHOWN': {
        await deliver(ctx, offerShownMessage())
        startMessageSent = true
        return
      }
      case 'FOCUS_PAID': {
        await deliver(ctx, focusPaidMessage())
        startMessageSent = true
        return
      }
      case 'ZOOM_MEMBER': {
        await deliver(ctx, zoomMemberMessage())
        startMessageSent = true
        return
      }
      case 'POST_ZOOM_1':
      case 'UPSELL':
      case 'EXPIRED': {
        await deliver(ctx, aiMentorMenuMessage())
        startMessageSent = true
        return
      }
      default: {
        await deliver(ctx, welcomeMessage())
        startMessageSent = true
        return
      }
    }
  } catch (error) {
    console.error('[FLOW_ERROR] start_handler_failed', {
      chatId,
      fromId: String(ctx.from?.id ?? ''),
      error: error instanceof Error ? error.message : String(error),
    })
    if (!startMessageSent) {
      await deliver(ctx, welcomeMessage())
    }
  } finally {
    activeStartProcessing.delete(chatId)
  }
}
