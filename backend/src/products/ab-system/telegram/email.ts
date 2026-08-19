import type { Context } from 'telegraf'
import type { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'
import {
  buildAbTestProgressPatch,
} from '../../../core/state-machine/abTestFoundation.js'
import {
  loadAbTestProgress,
  saveAbTestProgress,
} from './progress.js'
import {
  isValidEmail,
} from './callback.js'
import { scheduleFollowups } from './scheduler.js'
import { attachEmailToUser } from '../../../modules/user/identity/service.js'
import { upsertTelegramBinding } from '../../../modules/telegram-mentor/services/identity/linking.js'
import {
  buildWebDeepLink,
  generateDeepLink,
} from '../../../modules/deeplinks/service.js'
import { sendMagicLoginEmail } from '../../../modules/auth/services/mail.js'
import { clearPendingTelegramIdentity } from '../../../modules/telegram-mentor/services/identity/pending.js'
import { testOrchestrator } from '../../../core/orchestrator/testOrchestrator.js'
import { planMessage } from '../../../modules/telegram-mentor/conversation/delivery/planDelivery.js'
import {
  clearSession,
  getSession,
} from '../../../modules/telegram-mentor/session.js'
import { zoomSection } from '../../../modules/telegram-mentor/handlers/abTest.start.js'

export async function handleAbTestEmailCaptureText(
  ctx: Context,
  userId: string,
  text: string
): Promise<boolean> {
  const currentChatId = String(ctx.chat?.id ?? '').trim()
  if (currentChatId) {
    const session = await getSession(currentChatId)
    if (session?.userId === userId && session.data?.postZoomInsightAwaiting === true) {
      await clearSession(userId, currentChatId)

      await ctx.telegram.sendMessage(
        currentChatId,
        [
          '🌿 Дякую.',
          '',
          'Навіть один зафіксований інсайт',
          'часто стає початком великих змін.',
        ].join('\n')
      )

      const payload = await zoomSection(userId)
      await ctx.telegram.sendMessage(currentChatId, payload.text, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: payload.buttons },
      })
      return true
    }
  }

  const resolvedUserId = await resolveAbTestEmailTargetUserId(ctx, userId)
  const progress = await loadAbTestProgress(resolvedUserId)
  if (progress.email_stage !== 'pending') {
    return false
  }

  const normalizedEmail = text.trim().toLowerCase()
  if (!isValidEmail(normalizedEmail)) {
    const chatId = ctx.chat?.id ?? ctx.from?.id
    if (chatId) {
      await ctx.telegram.sendMessage(
        chatId,
        'Схоже, це не email. Введіть коректний email одним повідомленням.'
      )
    }
    return true
  }

  const chatId = String(ctx.chat?.id ?? '').trim()
  const telegramUserId = String(ctx.from?.id ?? '').trim()

  try {
    const attachment = await attachEmailToUser(resolvedUserId, normalizedEmail)
    const persistedUserId = attachment.userId

    if (chatId && telegramUserId) {
      await upsertTelegramBinding({
        userId: persistedUserId,
        chatId,
        telegramUserId,
        telegramUserName: ctx.from?.username ?? null,
        firstName: ctx.from?.first_name ?? null,
      })
    }

    const deepLink = await generateDeepLink({
      userId: persistedUserId,
      action: 'magic_login',
      source: 'telegram',
      target: 'web',
      path: '/onboarding/continue',
      payload: {
        origin: 'ab_test_email_capture',
      } satisfies Prisma.InputJsonValue,
    })
    const magicLoginUrl = buildWebDeepLink(deepLink.token, deepLink.path)
    const mailSent = await sendMagicLoginEmail({
      to: normalizedEmail,
      loginUrl: magicLoginUrl,
    })

    const nowIso = new Date().toISOString()
    const next = buildAbTestProgressPatch(progress, {
      email_stage: 'captured',
      email_captured_at: nowIso,
      last_event_at: nowIso,
    })
    await saveAbTestProgress(persistedUserId, next)
    if (chatId) {
      await clearPendingTelegramIdentity(chatId)
    }

    await testOrchestrator.onTestCompleted(
      persistedUserId,
      progress.result_key ?? null,
      normalizedEmail,
      {
        startedAt: progress.started_at
          ? new Date(progress.started_at)
          : undefined,
      }
    )
    console.info('[TEST_COMPLETED]', {
      userId: persistedUserId,
      segment: progress.result_key,
      messageId: null,
      callback: 'email_capture',
    })

    if (!mailSent) {
      console.warn('[AB_TEST_EMAIL_CAPTURE] magic_login_email_not_sent', {
        userId: persistedUserId,
        email: normalizedEmail,
      })
    }

    const scheduled = await scheduleFollowups(
      persistedUserId,
      next,
      'S3_TEST_RESULT'
    ).catch((error) => {
      console.error('[AB_TEST_EMAIL_CAPTURE] followups_failed', {
        userId: persistedUserId,
        error: error instanceof Error ? error.message : String(error),
      })
      return next
    })
    if (scheduled !== next) {
      await saveAbTestProgress(persistedUserId, scheduled)
    }

    const deliveryProgress = scheduled !== next ? scheduled : next
    const { renderAbTestPostEmailSubmitSequence } = await import('./views.js')
    await renderAbTestPostEmailSubmitSequence(
      ctx,
      persistedUserId,
      deliveryProgress,
      {
        notifyOps: false,
        trigger: 'email_capture',
      }
    )
    return true
  } catch (error) {
    console.error('[AB_TEST_EMAIL_CAPTURE] persistence_failed', {
      userId,
      chatId: chatId || null,
      telegramUserId: telegramUserId || null,
      error: error instanceof Error ? error.message : String(error),
    })

    await planMessage(
      ctx,
      'ctx.reply',
      'ab_test_email_retry',
      'Не вдалося зберегти email. Спробуйте ще раз.'
    )
    return true
  }
}

async function resolveAbTestEmailTargetUserId(
  ctx: Context,
  fallbackUserId: string
): Promise<string> {
  const chatId = String(ctx.chat?.id ?? '').trim()
  const telegramUserId = String(ctx.from?.id ?? '').trim()

  const candidate = await prisma.user.findFirst({
    where: {
      OR: [
        { id: fallbackUserId },
        ...(telegramUserId ? [{ telegramUserId }] : []),
        ...(chatId ? [{ telegramChatId: chatId }] : []),
      ],
    },
    select: { id: true },
  })

  return candidate?.id ?? fallbackUserId
}
