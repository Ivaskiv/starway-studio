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
import { renderAbTestIntro, resumeAbTestFlow } from '@/products/ab-system/telegram/abTest.service.js'
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

      const userId = await prisma.$transaction(async tx => {
        const now = new Date()
        const byTelegram = await tx.user.findUnique({
          where: { telegramUserId },
          select: { id: true, settings: true },
        })
        const byLinked = linkedUserId
          ? await tx.user.findUnique({
              where: { id: linkedUserId },
              select: { id: true, settings: true },
            })
          : null
        const existingIdentity = byLinked ?? byTelegram

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
                email: `telegram-${telegramUserId}@starway.local`,
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
        select: { settings: true, firstName: true },
      })
      void user

      const startContext = await resolveStartContext(userId)
      console.info('[FLOW_START] context_resolved', {
        userId,
        lifecycle: startContext?.lifecycle ?? null,
        testResultType: startContext?.testResultType ?? null,
        inactivityDays: startContext?.inactivityDays ?? null,
      })

      const abProgress = await loadAbTestProgress(userId).catch(() => null)
      const validation = abProgress ? validateAbTestProgress(abProgress) : null
      const hasMeaningfulAbProgress =
        abProgress !== null &&
        validation?.resumable === true
      if (hasMeaningfulAbProgress) {
        console.info('[FLOW_RESUME] routed_to_ab_resume', {
          userId,
          status: abProgress?.status ?? null,
          flowState: abProgress?.flow_state ?? null,
          resultKey: abProgress?.result_key ?? null,
          answersCount: abProgress?.answers.length ?? 0,
        })
        await resumeAbTestFlow(ctx, userId)
        return
      }

      if (abProgress && validation && !validation.valid) {
        console.warn('[FLOW_RESUME] invalid_progress_auto_recovered', {
          userId,
          reasons: validation.reasons,
          status: abProgress.status,
          flowState: abProgress.flow_state,
          stage: abProgress.stage,
          answersCount: abProgress.answers.length,
        })
      }

      console.info('[FLOW_START] routed_to_ab_start', {
        userId,
        payload,
      })
      // FIX 2025-05-25 B: direct send MSG1 — bypass outbox for /start
      // NOTE: User link/upsert is already completed above in transaction via telegramUserId/chatId.
      const directChatId = ctx.chat?.id ?? ctx.from?.id
      if (!directChatId) return
      await ctx.reply(
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
      // DISABLED 2025-05-25: replaced by direct send fix
      // await renderAbTestIntro(ctx, userId, payload)
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
