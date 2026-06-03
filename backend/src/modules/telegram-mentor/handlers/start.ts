import type { UserLifecycleState } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { resolveOrCreateUser } from '../../user/resolveOrCreateUser.js'
import { UserCreationSource } from '../../user/userCreation.service.js'
import { upsertTelegramBinding } from '../services/linking.service.js'
import { clearPendingTelegramIdentity, getPendingTelegramIdentity, isValidEmail, setPendingTelegramIdentity } from '../services/pendingIdentity.service.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'
import {
  type StartContext,
  resolveLinkedUserIdFromContext,
  syncAccessAwareChatEntryPoints,
} from './start.shared.js'
import {
  type StartMessagePayload,
  aiMentorMenuMessage,
  fallbackByLifecycle,
  focusPaidMessage,
  offerShownMessage,
  testDoneMessage,
  testInProgressMessage,
  welcomeMessage,
  zoomMemberMessage,
} from './abTest.start.js'

export * from './start.shared.js'

const processedStartUpdateIds = new Set<number>()
const activeStartProcessing = new Set<string>()

type StartUserSnapshot = {
  id: string
  lifecycleState: UserLifecycleState
  testStartedAt: Date | null
  testCompletedAt: Date | null
  offerShownAt: Date | null
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
    ;(ctx.state as { userId?: string | null }).userId = existingByTelegram.id
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
  ;(ctx.state as { userId?: string | null }).userId = resolved.user.id
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

  try {
    const telegramUserId = ctx.from?.id ? String(ctx.from.id) : chatId
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

    ;(ctx.state as { userId?: string | null }).userId = user.id
    await syncAccessAwareChatEntryPoints(chatId, user.id)

    switch (user.lifecycleState) {
      case 'NEW_USER': {
        await deliver(ctx, welcomeMessage())
        await setLifecycleState(user.id, 'TEST_NOT_STARTED')
        return
      }
      case 'TEST_NOT_STARTED': {
        await deliver(ctx, welcomeMessage())
        return
      }
      case 'TEST_IN_PROGRESS': {
        const r3 = getHoursSince(user.updatedAt) > 4
        await deliver(ctx, testInProgressMessage({ r3 }))
        return
      }
      case 'TEST_DONE': {
        await deliver(ctx, testDoneMessage())
        return
      }
      case 'OFFER_SHOWN': {
        await deliver(ctx, offerShownMessage())
        return
      }
      case 'FOCUS_PAID': {
        await deliver(ctx, focusPaidMessage())
        return
      }
      case 'ZOOM_MEMBER': {
        await deliver(ctx, zoomMemberMessage())
        return
      }
      case 'POST_ZOOM_1':
      case 'UPSELL':
      case 'EXPIRED': {
        await deliver(ctx, aiMentorMenuMessage())
        return
      }
      default: {
        await deliver(ctx, fallbackByLifecycle(user.lifecycleState))
        return
      }
    }
  } catch (error) {
    console.error('[FLOW_ERROR] start_handler_failed', {
      chatId,
      fromId: String(ctx.from?.id ?? ''),
      error: error instanceof Error ? error.message : String(error),
    })
    await deliver(ctx, fallbackByLifecycle('TEST_NOT_STARTED'))
  } finally {
    activeStartProcessing.delete(chatId)
  }
}
