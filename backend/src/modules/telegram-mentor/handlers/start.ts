import type { UserLifecycleState } from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'
import { UserCreationSource } from '../../user/userCreation.service.js'
import { resolveOrCreateUser } from '../../user/resolveOrCreateUser.js'
import {
  type StartContext,
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

async function setLifecycleState(userId: string, lifecycleState: UserLifecycleState): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lifecycleState },
  })
}

async function ensureUser(ctx: StartContext, chatId: string, telegramUserId: string): Promise<StartUserSnapshot> {
  const resolved = await resolveOrCreateUser(
    {
      telegramId: telegramUserId,
      chatId,
      telegramUserName: ctx.from?.username ?? undefined,
    },
    {
      source: UserCreationSource.TELEGRAM_START,
      requestId: Number.isFinite((ctx.update as { update_id?: number }).update_id)
        ? String((ctx.update as { update_id?: number }).update_id)
        : null,
      name: ctx.from?.first_name ?? null,
      createData: {
        lifecycleState: 'NEW_USER',
        currentState: 'NEW',
        currentStep: 'LINK_TELEGRAM',
        activeRole: 'USER',
      },
    },
  )

  const created = await prisma.user.findUniqueOrThrow({
    where: { id: resolved.user.id },
    select: {
      id: true,
      lifecycleState: true,
      testStartedAt: true,
      testCompletedAt: true,
      offerShownAt: true,
      updatedAt: true,
    },
  })

  await prisma.notificationPreference.upsert({
    where: { userId: created.id },
    create: { userId: created.id, telegramEnabled: true },
    update: { telegramEnabled: true },
  })

  if (resolved.conflict) {
    console.warn('[USER_IDENTITY_CONFLICT]', {
      source: 'telegram_start',
      chatId,
      telegramUserId,
      resolvedUserId: resolved.user.id,
    })
  }

  return created
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
    const user = await ensureUser(ctx, chatId, telegramUserId)

    ;(ctx.state as { userId?: string }).userId = user.id
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
