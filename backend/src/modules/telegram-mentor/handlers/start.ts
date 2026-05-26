import { absystemButtons } from '@/products/absystem/config/absystem.content.js'
import type { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'
import { resolveDeepLinkToken } from '../../deeplinks/service.js'
import { verifyTelegramLinkCode } from '../../social/service.js'
import { resolveUserState as resolveCoreUserState, type UserState as CoreUserState } from '../core/state.service.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'
import { clearSession } from '../session.js'
import { createAbTestProgress, validateAbTestProgress } from '../../../core/state-machine/abTestFoundation.js'
import { loadAbTestProgress, mergeUiSettings } from '@/products/ab-system/telegram/abTest.progress.js'
import { getAbTestResultDefinition } from '@/products/ab-system/content/abTest.results.js'
import { resolveOrCreateTelegramGuestUser } from '../../user/identity.service.js'
import { findLinkedUserId } from '../services/linking.service.js'
import {
  GENERIC_DEEPLINK_PREFIX,
  type StartContext,
  getStartPayload,
  isJsonObject,
  resolveStartContext,
  syncAccessAwareChatEntryPoints,
} from './start.shared.js'

export * from './start.shared.js'

const processedStartUpdateIds = new Set<number>()
const activeStartProcessing = new Set<string>()
const AB_RESULT_KEYS = ['state', 'goal', 'choice', 'decision', 'action'] as const
function isAbResultKey(value: string): value is (typeof AB_RESULT_KEYS)[number] {
  return (AB_RESULT_KEYS as readonly string[]).includes(value)
}

// FIX 2025-05-25 B: smart /start routing — direct MSG1 sender reused across entry states.
async function sendMsg1(ctx: StartContext): Promise<void> {
  const chatId = ctx.chat?.id ?? ctx.from?.id
  if (!chatId) return
  await ctx.telegram.sendMessage(
    chatId,
    'Привіт.\n'
    + 'Це тест AB System:\n'
    + '«Чому ти відкладаєш те, що давно хочеш зробити?»\n\n'
    + 'Він допоможе побачити, чому ти знову переносиш важливе і з чого почати.\n'
    + 'Тут не буде складних питань.\n'
    + 'Просто відповідай так, як є зараз.',
    {
      reply_markup: {
        inline_keyboard: [[
          { text: 'Почати тест', callback_data: 'ab_test:start' },
        ]],
      },
    },
  )
}

export async function handleStart(ctx: StartContext) {
  try {
    const rawChatId = ctx.chat?.id
    if (!rawChatId) {
      return
    }

    const chatId = String(rawChatId)
    const updateId = Number((ctx.update as { update_id?: number }).update_id ?? 0)
    if (Number.isFinite(updateId) && updateId > 0 && processedStartUpdateIds.has(updateId)) {
      console.warn('[FLOW_START] duplicate_update_ignored', { chatId, updateId })
      return
    }
    if (activeStartProcessing.has(chatId)) {
      console.warn('[FLOW_START] in_flight_start_ignored', { chatId, updateId })
      return
    }
    if (Number.isFinite(updateId) && updateId > 0) {
      processedStartUpdateIds.add(updateId)
      setTimeout(() => processedStartUpdateIds.delete(updateId), 60_000)
    }
    activeStartProcessing.add(chatId)
    try {
      const payload = getStartPayload(ctx)
      const firstName = ctx.from?.first_name ?? ''
      const telegramUserId = ctx.from?.id ? String(ctx.from.id) : chatId
      const telegramUserName = ctx.from?.username ?? null

      let linkedUserId: string | null = (ctx.state as { userId?: string | null }).userId ?? null

      if (payload.startsWith(GENERIC_DEEPLINK_PREFIX)) {
        const resolvedDeepLink = await resolveDeepLinkToken({
          token: payload,
          consume: true,
        })
        if (resolvedDeepLink?.userId) {
          linkedUserId = resolvedDeepLink.userId
        }
      }

      const verifiedLegacyUserId = payload
        ? await verifyTelegramLinkCode(payload)
        : null
      if (verifiedLegacyUserId) {
        linkedUserId = verifiedLegacyUserId
      }

      const linkedByIdentity = await findLinkedUserId({
        chatId,
        telegramUserId,
        telegramUserName,
      })
      if (linkedByIdentity) {
        linkedUserId = linkedByIdentity
      }

      const resolvedIdentityUserId = await resolveOrCreateTelegramGuestUser({
        linkedUserId,
        telegramUserId,
        telegramUserName,
        chatId,
        firstName: firstName || telegramUserName || 'Учень',
      })

      const userId = await prisma.$transaction(async tx => {
        const now = new Date()
        const guestEmail = `telegram-guest-${telegramUserId}@starway.local`
        const legacyGuestEmail = `telegram-${telegramUserId}@starway.local`
        const byTelegram = await tx.user.findUnique({
          where: { telegramUserId },
          select: { id: true, settings: true },
        })
        const byGuestEmail = await tx.user.findUnique({
          where: { email: guestEmail },
          select: { id: true, settings: true },
        })
        const byLegacyGuestEmail = await tx.user.findUnique({
          where: { email: legacyGuestEmail },
          select: { id: true, settings: true },
        })
        const byLinked = linkedUserId
          ? await tx.user.findUnique({
              where: { id: linkedUserId },
              select: { id: true, settings: true },
            })
          : null
        const byResolvedIdentity = await tx.user.findUnique({
          where: { id: resolvedIdentityUserId },
          select: { id: true, settings: true },
        })
        const existingIdentity = byLinked ?? byTelegram ?? byGuestEmail ?? byLegacyGuestEmail ?? byResolvedIdentity
        const resolutionSource = byLinked
          ? 'linked_user'
          : byTelegram
            ? 'telegram_user_id'
            : byGuestEmail
              ? 'guest_email'
              : byLegacyGuestEmail
                ? 'legacy_guest_email'
                : byResolvedIdentity
                  ? 'identity_service'
                  : 'created'

        const telegramIdentity = existingIdentity
          ? await tx.user.update({
              where: { id: existingIdentity.id },
              data: {
                telegramUserId,
                telegramChatId: chatId,
                telegramUserName,
                telegramEnabled: true,
                firstName: firstName || undefined,
                updatedAt: now,
              },
              select: { id: true, settings: true },
            })
          : await tx.user.create({
              data: {
                // FIX 2026-05-25 USER_DEDUP1: unify guest identity format across auth+telegram flows.
                email: guestEmail,
                telegramUserId,
                telegramChatId: chatId,
                telegramUserName,
                telegramEnabled: true,
                firstName: firstName || undefined,
                role: 'USER',
                activeRole: 'USER',
                currentState: 'NEW',
                currentStep: 'LINK_TELEGRAM',
                onboardingDone: false,
                focusPaid: false,
                createdAt: now,
                updatedAt: now,
              },
              select: { id: true, settings: true },
            })

        await tx.telegramLink.deleteMany({
          where: {
            userId: telegramIdentity.id,
            NOT: { chatId },
          },
        })
        await tx.telegramLink.upsert({
          where: { chatId },
          update: {
            userId: telegramIdentity.id,
            chatId,
            username: telegramUserName,
            firstName,
            isActive: true,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
          create: {
            userId: telegramIdentity.id,
            chatId,
            username: telegramUserName,
            firstName,
            isActive: true,
            code: `tg-${telegramUserId}-${Date.now()}`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })

        const settings = isJsonObject(telegramIdentity.settings)
          ? { ...(telegramIdentity.settings as Record<string, unknown>) }
          : {}
        const ui = isJsonObject(settings.ui) ? { ...(settings.ui as Record<string, unknown>) } : {}
        if (!ui.abTest) {
          const initialProgress = createAbTestProgress()
          await tx.user.update({
            where: { id: telegramIdentity.id },
            data: {
              settings: {
                ...settings,
                ui: mergeUiSettings(ui, initialProgress),
              } as Prisma.InputJsonValue,
            },
          })
        }

        await tx.notificationPreference.upsert({
          where: { userId: telegramIdentity.id },
          create: { userId: telegramIdentity.id, telegramEnabled: true },
          update: { telegramEnabled: true },
        })

        console.info('[USER_DEDUP]', {
          telegramUserId,
          guestEmail,
          resolutionSource,
          userId: telegramIdentity.id,
        })

        return telegramIdentity.id
      })

      ;(ctx.state as { userId?: string }).userId = userId
      console.info('[FLOW_START] user_resolved', {
        userId,
        chatId,
        telegramUserId,
        payload,
      })

      const state = await resolveCoreUserState(userId)
      ;(ctx.state as { userState?: CoreUserState }).userState = state

      await syncAccessAwareChatEntryPoints(chatId, userId)
      await clearSession(userId, chatId).catch(() => undefined)

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true, firstName: true, focusPaid: true },
      })
      void user

      const startContext = await resolveStartContext(userId)
      console.info('[FLOW_START] context_resolved', {
        userId,
        lifecycle: startContext?.lifecycle ?? null,
        testResultType: startContext?.testResultType ?? null,
        inactivityDays: startContext?.inactivityDays ?? null,
      })

      const progress = await loadAbTestProgress(userId).catch(() => null)
      const validation = progress ? validateAbTestProgress(progress) : null
      if (progress && validation && !validation.valid) {
        console.warn('[FLOW_RESUME] invalid_progress_auto_recovered', {
          userId,
          reasons: validation.reasons,
          status: progress.status,
          flowState: progress.flow_state,
          stage: progress.stage,
          answersCount: progress.answers.length,
        })
      }

      // FIX 2025-05-25 B: deterministic /start routing matrix (5 user states).
      const stage = progress?.stage ?? 'S1_TEST_STARTED'
      const status = progress?.status ?? 'idle'
      const answers = progress?.answers ?? []
      const deliveryChatId = ctx.chat?.id ?? ctx.from?.id
      if (!deliveryChatId) return

      const isNewState = !progress || (status === 'idle' && answers.length === 0 && !progress.started_at)
      if (isNewState) {
        console.info('[FLOW_START] routed_to_ab_start', { userId, payload, reason: 'state_1_new' })
        await sendMsg1(ctx)
        return
      }

      if (stage === 'S1_TEST_STARTED' && answers.length === 0) {
        console.info('[FLOW_START] routed_to_ab_start', { userId, payload, reason: 'state_2_intro_without_answers' })
        await sendMsg1(ctx)
        return
      }

      // FIX 2025-05-25: route in-progress only for 1..7 answers (not by status alone)
      if (answers.length > 0 && answers.length < 8) {
        const nextQ = answers.length + 1
        const answered = answers.length
        console.info('[FLOW_RESUME] routed_to_ab_resume', {
          userId,
          status,
          flowState: progress?.flow_state ?? null,
          resultKey: progress?.result_key ?? null,
          answersCount: answered,
        })
        await ctx.telegram.sendMessage(
          deliveryChatId,
          `Ти вже відповіла на ${answered} з 8 питань.\nПродовжимо?`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: `Продовжити з питання ${Math.min(nextQ, 8)}`, callback_data: 'ab_test:resume' }],
                [{ text: 'Почати заново', callback_data: 'ab_test:restart' }],
              ],
            },
          },
        )
        return
      }

      if (
        (answers.length >= 8 || status === 'completed') &&
        stage !== 'S4_FOCUS_INVITE' &&
        !progress?.focus_opened_at
      ) {
        const progressLegacy = progress as (Record<string, unknown> | null)
        const legacyResultKey = typeof progressLegacy?.resultKey === 'string'
          ? progressLegacy.resultKey
          : null
        const resultKey = progress?.result_key ?? legacyResultKey ?? null
        if (resultKey && isAbResultKey(resultKey)) {
          const resultDef = getAbTestResultDefinition(resultKey)
          await ctx.telegram.sendMessage(
            deliveryChatId,
            `${resultDef.title}\n\n${resultDef.body}`,
            {
              reply_markup: {
                inline_keyboard: [[{ text: 'Що з цим робити?', callback_data: 'ab_test:start_wheel' }]],
              },
            },
          )
          return
        }

        await ctx.telegram.sendMessage(
          deliveryChatId,
          'Результат ще не збережено. Можеш показати його повторно або пройти тест заново.',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Показати результат', callback_data: 'ab_test:show_result' }],
                [{ text: 'Почати заново', callback_data: 'ab_test:restart' }],
              ],
            },
          },
        )
        return
      }

      // FIX 2025-05-25 B1: paid focus member state must be checked before focus CTA-open state.
      const activeFocusSubscription = await prisma.productSubscription.findFirst({
        where: {
          userId,
          status: 'active',
          product: { is: { code: { in: ['focus', 'FOCUS'] } } },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { updatedAt: 'desc' },
        select: { expiresAt: true, createdAt: true, paidAt: true },
      })
      const isFocusPaid = Boolean(user?.focusPaid) || Boolean(activeFocusSubscription)
      if (isFocusPaid) {
        const now = Date.now()
        const paidAtMs = activeFocusSubscription?.paidAt?.getTime()
          ?? activeFocusSubscription?.createdAt?.getTime()
          ?? now
        const expiresAtMs = activeFocusSubscription?.expiresAt?.getTime()
        const durationDays = expiresAtMs ? Math.max(0, Math.round((expiresAtMs - paidAtMs) / 86400000)) : null
        const planLabel = durationDays !== null && durationDays >= 75 ? '3 місяці' : '1 місяць'
        const expiresAt = activeFocusSubscription?.expiresAt
          ? `до ${new Date(activeFocusSubscription.expiresAt).toLocaleDateString('uk-UA')}`
          : ''
        const focusInviteUrl =
          process.env.FOCUS_INVITE_LINK?.trim()
          || process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK?.trim()
          || process.env.FOCUS_CHANNEL_INVITE_URL?.trim()
          || 'https://t.me/'

        await ctx.telegram.sendMessage(
          deliveryChatId,
          `Ти учасниця ФОКУСУ 🎯\n\n`
          + `Тариф: ${planLabel}${expiresAt ? ` ${expiresAt}` : ''}\n\n`
          + 'Ось посилання на закритий канал:\n'
          + `${focusInviteUrl}\n\n`
          + 'Наступний Zoom — перевір у каналі.',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📺 Перейти в канал', url: focusInviteUrl }],
                [{ text: '🔄 Переглянути результат тесту', callback_data: 'ab_test:show_result' }],
                [{ text: '🚀 Перейти в ABSystem AI', callback_data: 'ab_test:show_platform' }],
              ],
            },
          },
        )
        return
      }

      // FIX 2025-05-25 B2: state for users who clicked/opened focus but have no active paid focus subscription.
      if (progress?.focus_opened_at || stage === 'S4_FOCUS_INVITE') {
        await ctx.telegram.sendMessage(
          deliveryChatId,
          'Ти вже проходила тест і бачила результат.\nХочеш повернутись до ФОКУСУ?',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Переглянути результат', callback_data: 'ab_test:show_result' }],
                [{ text: 'Хочу у ФОКУС', callback_data: 'open_focus_payment' }],
                [{ text: 'Пройти тест заново', callback_data: 'ab_test:restart' }],
              ],
            },
          },
        )
        return
      }

      console.info('[FLOW_START] routed_to_ab_start', { userId, payload, reason: 'fallback' })
      await sendMsg1(ctx)
      return
    } finally {
      activeStartProcessing.delete(chatId)
    }
  } catch (error) {
    console.error('[FLOW_ERROR] start_handler_failed', {
      chatId: String(ctx.chat?.id ?? ''),
      fromId: String(ctx.from?.id ?? ''),
      error: error instanceof Error ? error.message : String(error),
    })
    console.error(`[StartHandler] Prompt failed:`, error)
    await planMessage(ctx, 'ctx.reply', 'start_error_retry', 'Спробуй ще раз за хвилину.', {
      inline_keyboard: [[{ text: absystemButtons.continueInChat, callback_data: 'ab_test:menu' }]],
    })
    return
  }
}
