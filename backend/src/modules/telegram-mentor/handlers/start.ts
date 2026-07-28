import type { Role, UserLifecycleState } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { resolveOrCreateUser } from '../../user/resolveOrCreateUser.js'
import { UserCreationSource } from '../../user/userCreation.service.js'
import { upsertTelegramBinding } from '../services/linking.service.js'
import { clearPendingTelegramIdentity, getPendingTelegramIdentity, isValidEmail, setPendingTelegramIdentity, setPendingName, hasPendingName, clearPendingName } from '../services/pendingIdentity.service.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'
import {
  type StartContext,
  getStartPayload,
  parseFirstTouchPayload,
  resolveLinkedUserIdFromContext,
  syncAccessAwareChatEntryPoints,
} from './start.shared.js'
import { hasActiveFocusSubscription } from '../../subscriptions/payments/focus.access.js'
import {
  type StartMessagePayload,
  magicLinkReadyMessage,
  welcomeMessage,
} from './abTest.start.js'
import { buildHomeScreen } from './homeScreen.builder.js'
import { loadAbTestProgress } from '@/products/ab-system/telegram/abTest.progress.js'
import { generateMagicLink } from '../../deeplinks/service.js'
import { handleAbTestEmailCaptureText } from '@/products/ab-system/telegram/abTest.service.js'
import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { AB_TEST_ACTIONS } from '@/packages/abTestActions.js'
import { getUserAccessState, type UserAccessState } from '../../subscriptions/payments/focus.access.js'

export * from './start.shared.js'

const processedStartUpdateIds = new Set<number>()
const activeStartProcessing = new Set<string>()
const recentStartPayloadByChat = new Map<
  string,
  { signature: string; sentAt: number }
>()
const START_PAYLOAD_DEDUP_WINDOW_MS = 15_000

export type StartUserSnapshot = {
  id: string
  role: Role
  activeRole: Role
  lifecycleState: UserLifecycleState
  testStartedAt: Date | null
  testCompletedAt: Date | null
  offerShownAt: Date | null
  testResultType: string | null
  updatedAt: Date
  firstName: string | null
}

const PAID_LIFECYCLE_STATES = new Set<UserLifecycleState>([
  'FOCUS_PAID',
  'ZOOM_MEMBER',
  'POST_ZOOM_1',
  'UPSELL',
])

const INTRO_LIFECYCLE_STATES = new Set<UserLifecycleState>([
  'NEW_USER',
  'TEST_NOT_STARTED',
  'TEST_IN_PROGRESS',
])

export function resolveEffectiveStartLifecycleState(input: {
  lifecycleState: UserLifecycleState
  accessState: Pick<UserAccessState, 'state' | 'isActive' | 'hasFocus'> | null
  testResultType: string | null
  progress: {
    status: string
    result_key: string | null
  } | null
}): UserLifecycleState {
  const hasCanonicalFocusAccess =
    input.accessState?.state === 'FOCUS_ACTIVE' ||
    input.accessState?.isActive === true ||
    input.accessState?.hasFocus === true

  if (hasCanonicalFocusAccess) {
    return PAID_LIFECYCLE_STATES.has(input.lifecycleState)
      ? input.lifecycleState
      : 'FOCUS_PAID'
  }

  const hasCompletedResult =
    Boolean(input.testResultType) ||
    (input.progress?.status === 'completed' && Boolean(input.progress.result_key))

  if (
    hasCompletedResult &&
    (
      INTRO_LIFECYCLE_STATES.has(input.lifecycleState) ||
      input.lifecycleState === 'OFFER_SHOWN'
    )
  ) {
    return 'TEST_DONE'
  }

  if (
    input.progress?.status === 'active' &&
    (
      INTRO_LIFECYCLE_STATES.has(input.lifecycleState) ||
      input.lifecycleState === 'TEST_DONE'
    )
  ) {
    return 'TEST_IN_PROGRESS'
  }

  return input.lifecycleState
}

export function getHoursSince(date: Date | null | undefined): number {
  if (!date) return Number.POSITIVE_INFINITY
  const diffMs = Date.now() - date.getTime()
  return diffMs > 0 ? diffMs / 3_600_000 : 0
}

function buildTelegramGuestEmail(telegramUserId: string): string {
  const normalized = String(telegramUserId ?? '').trim()
  return `telegram-${normalized}@starway.local`
}

async function resolveValidDefaultAiExpertId(): Promise<string | undefined> {
  const expertId = String(process.env.DEFAULT_AI_EXPERT_ID ?? '').trim()
  if (!expertId) return undefined

  const expert = await prisma.expert.findUnique({
    where: { id: expertId },
    select: { id: true },
  }).catch(() => null)

  return expert?.id ?? undefined
}

async function setLifecycleState(userId: string, lifecycleState: UserLifecycleState): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lifecycleState },
  })
}

async function loadUserSnapshot(userId: string): Promise<StartUserSnapshot> {
  const snapshot = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      activeRole: true,
      lifecycleState: true,
      testStartedAt: true,
      testCompletedAt: true,
      offerShownAt: true,
      testResultType: true,
      updatedAt: true,
      firstName: true,
    },
  })

  const [accessState, progress] = await Promise.all([
    getUserAccessState(userId).catch(() => null),
    loadAbTestProgress(userId).catch(() => null),
  ])

  const effectiveLifecycleState = resolveEffectiveStartLifecycleState({
    lifecycleState: snapshot.lifecycleState,
    accessState,
    testResultType: snapshot.testResultType,
    progress: progress
      ? {
        status: progress.status,
        result_key: progress.result_key ?? null,
      }
      : null,
  })

  const isFocusActive = await hasActiveFocusSubscription(userId).catch(() => false)

  if (isFocusActive && snapshot.lifecycleState !== 'FOCUS_PAID') {
    await prisma.user
      .update({
        where: { id: userId },
        data: { lifecycleState: 'FOCUS_PAID' },
      })
      .catch(() => undefined)
  }

  console.info('[START_ROUTE_RESOLUTION]', {
    userId,
    role: snapshot.role,
    activeRole: snapshot.activeRole,
    lifecycleState: snapshot.lifecycleState,
    effectiveLifecycleState,
    hasFocusAccess: accessState?.hasFocus === true,
    focusExpiresAt: accessState?.expiresAt ?? null,
    abTestStatus: progress?.status ?? null,
    abTestResultKey: progress?.result_key ?? null,
    testResultType: snapshot.testResultType,
  })

  return {
    ...snapshot,
    lifecycleState: effectiveLifecycleState,
  }
}

async function deliver(
  ctx: StartContext,
  payload: {
    text: string
    reply_markup: { inline_keyboard: StartMessagePayload['buttons'] }
    parseMode?: 'HTML'
  },
): Promise<void> {
  const deliveryChatId = ctx.chat?.id ?? ctx.from?.id
  console.info('[START_DELIVER]', { deliveryChatId, textLen: payload.text?.length ?? 0 })
  if (!deliveryChatId) {
    console.warn('[START_DELIVER] no chatId — skipped')
    return
  }

  const dedupKey = String(deliveryChatId)
  const payloadSignature = JSON.stringify({
    text: payload.text,
    reply_markup: payload.reply_markup,
    parseMode: payload.parseMode ?? null,
  })
  const now = Date.now()
  const lastPayload = recentStartPayloadByChat.get(dedupKey)
  if (
    lastPayload &&
    lastPayload.signature === payloadSignature &&
    now - lastPayload.sentAt < START_PAYLOAD_DEDUP_WINDOW_MS
  ) {
    console.info('[START_DELIVER_SKIPPED_DUPLICATE]', {
      deliveryChatId,
      dedupWindowMs: START_PAYLOAD_DEDUP_WINDOW_MS,
    })
    return
  }

  try {
    const sentMessage = await planMessage(
      ctx,
      'ctx.reply',
      'start_home_screen',
      payload.text,
      payload.reply_markup,
      payload.parseMode,
    )
    recentStartPayloadByChat.set(dedupKey, {
      signature: payloadSignature,
      sentAt: now,
    })
    setTimeout(() => {
      const current = recentStartPayloadByChat.get(dedupKey)
      if (
        current &&
        current.signature === payloadSignature &&
        current.sentAt === now
      ) {
        recentStartPayloadByChat.delete(dedupKey)
      }
    }, START_PAYLOAD_DEDUP_WINDOW_MS)
    console.info('[START_DELIVER_OK]', {
      deliveryChatId,
      messageId: sentMessage?.message_id ?? null,
      via: 'planMessage(ctx.reply)',
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[START_DELIVER_ERROR]', {
      deliveryChatId,
      error: errorMessage,
      via: 'planMessage(ctx.reply)',
    })
  }
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
    const firstTouch = parseFirstTouchPayload(startPayload)
    let resolvedUserId = await resolveLinkedUserIdFromContext(ctx)
    const identityResolutionError = (
      ctx.state as { userIdResolutionError?: 'linked_user_resolution_failed' | null }
    ).userIdResolutionError

    if (!resolvedUserId && identityResolutionError === 'linked_user_resolution_failed') {
      console.warn('[START_IDENTITY_RESOLUTION_FAILED]', {
        chatId,
        telegramUserId,
        startPayload,
      })
      await planMessage(
        ctx,
        'ctx.reply',
        'telegram_identity_resolution_failed',
        'Не вдалося знайти прив’язаний акаунт. Натисни /start і спробуй ще раз.',
      )
      startMessageSent = true
      return
    }

    if (!resolvedUserId) {
      const validDefaultAiExpertId = await resolveValidDefaultAiExpertId()
      const resolved = await resolveOrCreateUser(
        {
          telegramId: telegramUserId,
          chatId,
          telegramUserName: ctx.from?.username ?? undefined,
        },
        {
          source: UserCreationSource.TELEGRAM_START,
          expertId: validDefaultAiExpertId,
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
            firstTouchProduct: firstTouch.product,
            firstTouchSource: firstTouch.source,
            firstTouchCampaign: firstTouch.campaign,
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

      if (resolved.created) {
        console.info('[FIRST_TOUCH]', {
          userId: resolvedUserId,
          telegramId: telegramUserId,
          startPayload,
          product: firstTouch.product,
          source: firstTouch.source,
          campaign: firstTouch.campaign,
        })
      }

      console.log('[START] new user created', {
        userId: resolvedUserId,
        telegramId: telegramUserId,
        created: resolved.created,
      })
    }

    const user = await loadUserSnapshot(resolvedUserId)
    console.info('[START_SNAPSHOT]', {
      userId: user.id,
      telegramUserId,
      role: user.role,
      activeRole: user.activeRole,
      lifecycleState: user.lifecycleState,
      chatId,
    })

    ;(ctx.state as { userId?: string | null; userIdResolved?: boolean }).userId = user.id
    ;(ctx.state as { userId?: string | null; userIdResolved?: boolean }).userIdResolved = true
    // fire-and-forget: не блокуємо deliver() якщо Telegram API зависає
    void syncAccessAwareChatEntryPoints(chatId, user.id).catch(() => undefined)

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

    if (user.lifecycleState === 'NEW_USER' && !ctx.from?.first_name && !user.firstName) {
      await ctx.telegram.sendMessage(chatId, 'Як тебе звати?')
      await setPendingName(chatId)
      startMessageSent = true
      await setLifecycleState(user.id, 'TEST_NOT_STARTED')
      return
    }

    const screen = await buildHomeScreen(user, ctx)
    await deliver(ctx, screen)
    startMessageSent = true

    if (user.lifecycleState === 'NEW_USER') {
      await setLifecycleState(user.id, 'TEST_NOT_STARTED')
    }
    return
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
