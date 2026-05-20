// backend/src/modules/subscriptions/payments/callback.ts
// Express handler для WayForPay webhook — верифікує підпис, обробляє платіж, логує
// Приклад: POST /api/subscriptions/payments/wayforpay/callback

import { findByAmount } from '@/lib/payments/registry.js'
import { markAbTestPaymentSuccess } from '@/products/ab-system/telegram/abTest.service.js'
import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { createOnceInviteLink } from '@/products/focus/payments/inviteLink.js'
import { stankeyManifest } from '@/products/stankey/product.manifest.js'
import type { Prisma } from '@starway/db/prisma-client'
import type { Request, Response } from 'express'
import {
  buildRuntimeTelemetry,
  withRuntimeAdvisoryLock,
} from '../../../core/runtime/runtimeIdempotency.js'
import { buildRequestFingerprint } from '../../../core/state-machine/securityFoundation.js'
import { prisma } from '../../../db/client.js'
import { sendDedupedTelegramMessage } from '../../../lib/telegram.js'
import { resolveNotificationType } from '../../../services/notifications/domain/notificationPolicy.js'
import { NotificationEvent } from '../../../services/notifications/NotificationEvent.js'
import { notificationService } from '../../../services/notifications/NotificationService.js'
import { runWeeklyAnalysis } from '../../ai-mentor/weekly-analysis/service.js'
import { getContentAttributionEventPayload } from '../../events/contentAttribution.service.js'
import { trackEvent } from '../../events/service.js'
import { sendBillingSuccessTelegramMessage } from '../../telegram-mentor/handlers/billing.js'
import { resolveUserState } from '../../telegram-mentor/handlers/start.js'
import type { PaymentCallbackData } from '../types.js'
import {
  buildEcosystemPaymentCheckoutUrl,
  FOCUS_DOJIM_TIMER_IDS,
  processEcosystemPayment,
  processPayment,
  resolveEcosystemPaymentTarget,
  resolveFocusChannelInviteLink,
  simulateFocusActivation,
  type EcosystemPaymentPlanId,
  type EcosystemPaymentProduct,
} from './business.js'
import { verifySignature } from './crypto.js'
import { parseStankeyOrderReference } from './wayforpay.checkout.js'

type WebhookPaymentScope = 'stankey' | 'ecosystem' | 'legacy'

type ResolvedWebhookTarget = {
  scope: WebhookPaymentScope
  userId: string | null
  productId: string | null
  planId: string | null
  amount: number
  payRef: string
  ecosystemProductId?: EcosystemPaymentProduct
  ecosystemPlanId?: EcosystemPaymentPlanId
}

type ProcessPaymentWebhookResult = {
  duplicate: boolean
  scope: WebhookPaymentScope
  productId: string | null
  planId: string | null
  payRef: string
  amount: number
  result:
    | Awaited<ReturnType<typeof processPayment>>
    | Awaited<ReturnType<typeof processEcosystemPayment>>
    | null
}

function resolveWebhookPaymentTarget(
  data: PaymentCallbackData
): ResolvedWebhookTarget | null {
  const stankeyOrder = parseStankeyOrderReference(
    String(data.order_reference ?? '')
  )
  const payRef = String(data.order_reference ?? '').trim()
  const amount = Number(data.amount)

  if (stankeyOrder) {
    return {
      scope: 'stankey',
      userId: stankeyOrder.userId,
      productId: stankeyManifest.productId,
      planId: stankeyOrder.planId,
      amount,
      payRef,
    }
  }

  if (payRef.startsWith('focus_')) {
    // FIX(18.05.2026): resolve planId from amount — hardcoded 'welcome_test' was not in catalog — Claude
    const focusUserId =
      typeof data.clientAccountId === 'string' ? data.clientAccountId : null
    const focusTarget = resolveEcosystemPaymentTarget(amount)
    const focusPlanId: EcosystemPaymentPlanId =
      focusTarget?.productId === 'focus'
        ? focusTarget.planId
        : ('welcome_test' as any)
    console.log('[WEBHOOK] focus_ prefix resolved', {
      userId: focusUserId ?? 'NULL — hosted button, no clientAccountId',
      amount,
      planId: focusPlanId,
      payRef,
    })
    return {
      scope: 'ecosystem',
      userId: focusUserId,
      productId: 'focus',
      planId: focusPlanId,
      amount,
      payRef,
      ecosystemProductId: 'focus',
      ecosystemPlanId: focusPlanId,
    }
  }

  const catalogEntry = findByAmount(amount)
  // TEMP(18.05.2026): catalog resolution trace — Claude
  if (catalogEntry) {
    console.log(`[WayForPay] Catalog match`, {
      paymentKey: catalogEntry.paymentKey,
      amount,
      hasClientAccountId: Boolean(data.clientAccountId),
    })
  } else {
    console.warn(`[WayForPay] No catalog entry for amount`, { amount })
  }

  const ecosystemTarget = resolveEcosystemPaymentTarget(amount)
  if (ecosystemTarget) {
    return {
      scope: 'ecosystem',
      userId:
        typeof data.clientAccountId === 'string' ? data.clientAccountId : null,
      productId: ecosystemTarget.productId,
      planId: ecosystemTarget.planId,
      amount,
      payRef,
      ecosystemProductId: ecosystemTarget.productId,
      ecosystemPlanId: ecosystemTarget.planId,
    }
  }

  return {
    scope: 'legacy',
    userId:
      typeof data.clientAccountId === 'string' ? data.clientAccountId : null,
    productId: data.product_name?.[0] ?? null,
    planId: null,
    amount,
    payRef,
  }
}

async function sendFocusPaymentSuccessTelegramMessage(userId: string) {
  const subscription = await prisma.productSubscription.findFirst({
    where: { userId, productId: 'focus' },
    select: { id: true, focusWelcomedAt: true, focusChannelInviteLink: true },
  })

  if (subscription?.focusWelcomedAt) {
    console.info(
      `[Focus] Welcome message already sent for userId=${userId}, skipping`
    )
    return false
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const chatId = user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null
  if (!chatId) {
    console.warn(
      `[Focus] No telegramChatId for userId=${userId} — welcome message not sent`
    )
    return false
  }

  const inviteUrl = await createOnceInviteLink(chatId)
  const billing = absystemContent.BILLING.FOCUS_PAID
  const text = billing.text.replace('{inviteLink}', inviteUrl)

  const sent = await sendDedupedTelegramMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [[{ text: billing.cta, url: inviteUrl }]],
    },
  })

  if (sent && subscription?.id) {
    await prisma.productSubscription
      .update({
        where: { id: subscription.id },
        data: {
          focusWelcomedAt: new Date(),
          focusChannelInviteLink: inviteUrl,
        },
      })
      .catch((err) =>
        console.error(
          '[Focus] Failed to update subscription after welcome',
          err
        )
      )
  }

  return sent
}

async function cancelPendingFocusDojims(userId: string): Promise<number> {
  const jobs = await prisma.notificationJob
    .findMany({
      where: {
        type: resolveNotificationType(NotificationEvent.AB_TEST_FOLLOWUP),
        status: 'PENDING',
        payload: { path: ['userId'], equals: userId },
      },
      select: {
        id: true,
        payload: true,
      },
    })
    .catch(() => [])

  const ids = jobs
    .filter((job) => {
      const payload = job.payload as Prisma.JsonObject | null
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return false
      }

      const payloadUserId =
        typeof payload.userId === 'string' ? payload.userId : null
      const flowTimerId =
        typeof payload.flow_timer_id === 'string'
          ? payload.flow_timer_id
          : typeof payload.flowTimerId === 'string'
            ? payload.flowTimerId
            : null

      return (
        payloadUserId === userId &&
        flowTimerId !== null &&
        FOCUS_DOJIM_TIMER_IDS.includes(
          flowTimerId as (typeof FOCUS_DOJIM_TIMER_IDS)[number]
        )
      )
    })
    .map((job) => job.id)

  if (!ids.length) {
    return 0
  }

  await prisma.notificationJob.deleteMany({
    where: {
      id: { in: ids },
    },
  })

  return ids.length
}

async function sendAbsystemPaymentSuccessTelegramMessage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const chatId = user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null
  if (!chatId) {
    return false
  }

  const billing = absystemContent.BILLING.PLATFORM_PAID
  const platformUrl = (
    process.env.FRONTEND_URL?.trim() ||
    process.env.PUBLIC_FRONTEND_URL?.trim() ||
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim() ||
    'http://localhost:5173'
  ).replace(/\/$/, '')

  const text = [billing.text].join('\n')

  return sendDedupedTelegramMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: billing.cta, url: `${platformUrl}/app/wheel` }],
      ],
    },
  })
}

async function sendPaymentFailedTelegramMessage(
  userId: string,
  paymentUrl: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const chatId = user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null
  if (!chatId) {
    return false
  }

  const billing = absystemContent.BILLING.PAYMENT_FAILED
  return sendDedupedTelegramMessage(chatId, billing.text, {
    reply_markup: {
      inline_keyboard: [[{ text: billing.cta, url: paymentUrl }]],
    },
  })
}

export async function processPaymentWebhook(
  data: PaymentCallbackData,
  db: typeof prisma = prisma
): Promise<ProcessPaymentWebhookResult> {
  const target = resolveWebhookPaymentTarget(data)
  if (!target) {
    return {
      duplicate: false,
      scope: 'legacy',
      productId: null,
      planId: null,
      payRef: String(data.order_reference ?? ''),
      amount: Number(data.amount),
      result: {
        status: 'failed',
        userId: '',
        reason: 'UNRESOLVED_WEBHOOK_TARGET',
      },
    }
  }

  console.log(`[WayForPay] Payment target resolved`, {
    scope: target.scope,
    payRef: target.payRef,
    productId: target.productId,
    amount: target.amount,
  })

  const payRef = target.payRef
  const amount = target.amount

  if (!target.userId || !payRef || Number.isNaN(amount)) {
    // TEMP(18.05.2026): hosted button callbacks arrive without clientAccountId — userId will be null here — Claude
    console.error(`[WayForPay] ❌ MISSING_WEBHOOK_FIELDS — payment dropped`, {
      userId: target.userId ?? 'NULL',
      payRef: payRef || 'EMPTY',
      amount,
      scope: target.scope,
      productId: target.productId,
      note: !target.userId
        ? 'Hosted button callback has no clientAccountId — cannot link to user'
        : 'payRef or amount missing',
    })
    return {
      duplicate: false,
      scope: target.scope,
      productId: target.productId,
      planId: target.planId,
      payRef,
      amount,
      result: {
        status: 'failed',
        userId: target.userId ?? '',
        reason: 'MISSING_WEBHOOK_FIELDS',
      },
    }
  }

  const existingPaymentLog = await db.paymentLog
    .findUnique({
      where: { orderReference: payRef },
      select: { id: true },
    })
    .catch(() => null)

  if (existingPaymentLog) {
    console.warn('⚠️ Duplicate WayForPay webhook ignored', {
      orderReference: payRef,
    })
    return {
      duplicate: true,
      scope: target.scope,
      productId: target.productId,
      planId: target.planId,
      payRef,
      amount,
      result: null,
    }
  }

  const user = await db.user.findUnique({
    where: { id: target.userId },
    select: { expertId: true },
  })

  if (!user?.expertId) {
    console.warn(
      '⚠️ [PAYMENT:WEBHOOK] User has no expertId, using system fallback',
      {
        userId: target.userId,
        payRef,
      }
    )
  }

  let paymentLog: { id: string }
  try {
    paymentLog = await db.paymentLog.create({
      data: {
        orderReference: payRef,
        userId: target.userId,
        expertId: user?.expertId ?? 'system',
        amountCents: Math.round(amount * 100),
        currency: data.currency ?? 'EUR',
        status: 'PENDING',
        metadata: {
          orderReference: payRef,
          scope: target.scope,
          productId: target.productId,
          planId: target.planId,
          amount,
          currency: data.currency ?? 'EUR',
          transactionId: data.transaction_id ?? null,
        },
      },
      select: { id: true },
    })
    // TEMP(18.05.2026): PaymentLog creation trace — Claude
    const catalogMatch = findByAmount(amount)
    console.log(`[WayForPay] PaymentLog created`, {
      orderReference: payRef,
      userId: target.userId,
      amount,
      currency: data.currency,
      paymentKey: catalogMatch?.paymentKey ?? 'unknown',
    })
    console.log('💳 [PAYMENT:WEBHOOK] Created pending log', {
      payRef,
      userId: target.userId,
    })
  } catch (error) {
    const isUniqueViolation = Boolean(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    )

    if (isUniqueViolation) {
      console.warn('⚠️ Duplicate WayForPay webhook ignored', {
        orderReference: payRef,
      })
      return {
        duplicate: true,
        scope: target.scope,
        productId: target.productId,
        planId: target.planId,
        payRef,
        amount,
        result: null,
      }
    }

    throw error
  }

  try {
    const result =
      target.scope === 'ecosystem' &&
      target.ecosystemProductId &&
      target.ecosystemPlanId
        ? await processEcosystemPayment(
            target.ecosystemProductId,
            target.ecosystemPlanId,
            target.userId,
            {
              amount,
              currency: data.currency ?? 'UAH',
              payRef,
              orderReference: payRef,
            },
            db
          )
        : await processPayment({
            userId: target.userId,
            productId: target.productId ?? '',
            amount,
            payRef,
            currency: data.currency ?? 'EUR',
          })
    // TEMP(18.05.2026): subscription activation result trace — Claude
    console.log(`✅ [PAYMENT:WEBHOOK] Processed result: ${result.status}`, {
      payRef,
      status: result.status,
      scope: target.scope,
      productId: target.productId,
      planId: target.planId,
      userId: target.userId,
    })

    await db.paymentLog.update({
      where: { id: paymentLog.id },
      data: {
        status: result.status === 'approved' ? 'SUCCESS' : 'FAILED',
        processedAt: new Date(),
        metadata: {
          orderReference: payRef,
          scope: target.scope,
          productId: target.productId,
          planId: target.planId,
          amount,
          currency: data.currency ?? 'EUR',
          transactionId: data.transaction_id ?? null,
          result,
        },
      },
    })

    return {
      duplicate: false,
      scope: target.scope,
      productId: target.productId,
      planId: target.planId,
      payRef,
      amount,
      result,
    }
  } catch (error) {
    await db.paymentLog
      .update({
        where: { id: paymentLog.id },
        data: {
          status: 'FAILED',
          processedAt: new Date(),
          metadata: {
            orderReference: payRef,
            scope: target.scope,
            productId: target.productId,
            planId: target.planId,
            amount,
            currency: data.currency ?? 'EUR',
            transactionId: data.transaction_id ?? null,
            error: error instanceof Error ? error.message : 'unknown_error',
          },
        },
      })
      .catch(() => undefined)

    throw error
  }
}

/** WayForPay callback handler — публічний ендпоінт (без authRequired) */
export async function wayForPayCallback(req: Request, res: Response) {
  try {
    const data = req.body as PaymentCallbackData

    if (!data.order_reference || !data.amount || isNaN(Number(data.amount))) {
      console.warn('[WayForPay] Invalid callback - skipping:', {
        orderReference: data.order_reference,
        amount: data.amount,
      })
      return res.status(200).json({ status: 'skipped' })
    }

    // TEMP(18.05.2026): full payload trace for hosted button callback debugging — Claude
    console.log(`[WayForPay] Callback received`, {
      orderReference: data.order_reference,
      transactionStatus: data.transaction_status,
      amount: data.amount,
      clientAccountId: data.clientAccountId ?? '⚠️ MISSING',
      productName: data.product_name,
      currency: data.currency,
    })

    const target = resolveWebhookPaymentTarget(data)
    const requestFingerprint = buildRequestFingerprint({
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | null | undefined,
      payload: data as unknown as Prisma.JsonValue,
    })
    const runtime = buildRuntimeTelemetry({
      scope: 'payment_callback',
      type: 'payment_success',
      source: 'web',
      userId:
        typeof data.clientAccountId === 'string' ? data.clientAccountId : null,
      tenantId: data.product_name?.[0] ?? null,
      requestFingerprint,
      runtimeStage: 'payment',
      orchestrationPath: ['subscriptions', 'payments', 'callback'],
    })

    // fix: timingSafeEqual в crypto.ts захищає від timing attack
    if (!verifySignature(data)) {
      console.warn('⚠️ Invalid WayForPay signature')
      console.error(`[WayForPay] Callback failed: Invalid Signature`, {
        orderReference: data.order_reference,
      })
      await trackEvent({
        userId:
          typeof data.clientAccountId === 'string'
            ? data.clientAccountId
            : null,
        type: 'payment_callback_invalid_signature',
        source: 'web',
        state: null,
        payload: {
          orderReference: data.order_reference ?? null,
          security: {
            callback_signature_failure: true,
            suspicious_activity: true,
            request_fingerprint: requestFingerprint,
            webhook_trust_source: 'wayforpay',
          },
        },
      })
      return res.status(400).send('FAIL')
    }

    console.log(`[WayForPay] Signature verified`, {
      orderReference: data.order_reference,
    })

    if (data.transaction_status !== 'Approved') {
      await trackEvent({
        userId:
          typeof data.clientAccountId === 'string'
            ? data.clientAccountId
            : null,
        type: 'payment_failed',
        source: 'web',
        state: null,
        payload: {
          orderReference: data.order_reference ?? null,
          transactionStatus: data.transaction_status,
          amount: Number(data.amount ?? 0),
          currency: data.currency ?? null,
          security: {
            webhook_trust_source: 'wayforpay',
            request_fingerprint: requestFingerprint,
          },
        },
      })

      if (
        target?.scope === 'ecosystem' &&
        target.userId &&
        target.ecosystemProductId &&
        target.ecosystemPlanId
      ) {
        const paymentUrl = buildEcosystemPaymentCheckoutUrl(
          target.ecosystemProductId,
          target.ecosystemPlanId,
          target.userId
        )
        await sendPaymentFailedTelegramMessage(target.userId, paymentUrl).catch(
          () => undefined
        )
      }

      return res.status(200).send('OK') // non-Approved — ігноруємо без помилки
    }

    const result = await withRuntimeAdvisoryLock(
      {
        scope: 'payment_callback',
        type: 'payment_success',
        source: 'web',
        userId:
          typeof data.clientAccountId === 'string'
            ? data.clientAccountId
            : null,
        state: null,
        tenantId: String(
          data.product_name?.[0] ?? data.order_reference ?? null
        ),
        requestFingerprint,
        runtimeStage: runtime.runtime_stage,
      },
      async () => processPaymentWebhook(data, prisma)
    )

    if (!result.acquired) {
      return res.status(200).send('OK')
    }

    const webhookResult = result.value
    if (webhookResult.duplicate) {
      return res.status(200).send('OK')
    }

    const userId =
      webhookResult.result?.userId ??
      (typeof data.clientAccountId === 'string' ? data.clientAccountId : null)
    const state = userId
      ? await resolveUserState(userId).catch(() => null)
      : null
    const attributionPayload = userId
      ? await getContentAttributionEventPayload(userId)
      : null
    const productId =
      webhookResult.productId ??
      String(data.product_name?.[0] ?? data.order_reference ?? '')
    const payRef = webhookResult.payRef
    const amount = webhookResult.amount
    await trackEvent({
      userId,
      type:
        webhookResult.result?.status === 'approved'
          ? 'payment_success'
          : 'payment_failed',
      source: 'web',
      state,
      productId,
      payload: {
        productId,
        payRef,
        amount,
        currency: data.currency ?? null,
        transactionId: data.transaction_id ?? null,
        transactionStatus: data.transaction_status,
        planId: webhookResult.planId,
        security: {
          webhook_trust_source: 'wayforpay',
          request_fingerprint: requestFingerprint,
          tenant_id: productId,
        },
        ...(attributionPayload ?? {}),
      },
    })

    if (webhookResult.result?.status === 'approved' && userId) {
      console.log(`[WayForPay] Subscription activated`, {
        userId,
        productId,
        payRef,
      })

      await trackEvent({
        userId,
        type: 'subscription_activated',
        source: 'telegram',
        state,
        productId,
        payload: {
          productId,
          planId: webhookResult.planId,
          payRef,
          amount,
          security: {
            webhook_trust_source: 'wayforpay',
            request_fingerprint: requestFingerprint,
            tenant_id: productId,
          },
        },
      }).catch(() => undefined)

      if (webhookResult.scope === 'stankey') {
        await sendBillingSuccessTelegramMessage(userId).catch(() => undefined)
      } else if (
        webhookResult.scope === 'ecosystem' &&
        webhookResult.productId === 'focus'
      ) {
        await sendFocusPaymentSuccessTelegramMessage(userId).catch(
          () => undefined
        )
        await markAbTestPaymentSuccess(userId).catch(() => undefined)

        // Webhook → welcome-test sync
        if (webhookResult.planId === 'welcome_test') {
          const linkToken = payRef.split('_')[1]
          await prisma.user.update({
            where: { id: userId },
            data: {
              settings: {
                ...(typeof (state as any)?.settings === 'object'
                  ? (state as any).settings
                  : {}),
                welcomeTest: {
                  ...(typeof (state as any)?.settings?.welcomeTest === 'object'
                    ? (state as any).settings.welcomeTest
                    : {}),
                  payment: {
                    status: 'PAID',
                    paidAt: new Date().toISOString(),
                    paymentId: payRef,
                    linkToken,
                  },
                },
              } as any,
            },
          })
        }

        const activation = simulateFocusActivation(userId, {
          nextZoomAt: process.env.NEXT_ZOOM_AT?.trim() || null,
          channelInviteLink: resolveFocusChannelInviteLink(),
        })

        if (activation.preZoomScheduled) {
          await Promise.all(
            activation.preZoomReminders.map((reminder) =>
              notificationService
                .schedule(
                  NotificationEvent.AB_TEST_FOLLOWUP,
                  userId,
                  reminder.sendAt,
                  {
                    flow_timer_id: reminder.timerId,
                    lifecycle_stage: activation.lifecycleState,
                    delay_ms:
                      reminder.timerId === 'ZOOM_REMINDER_24H'
                        ? 24 * 60 * 60 * 1000
                        : 2 * 60 * 60 * 1000,
                    message_key: reminder.timerId,
                    result_key: null,
                  }
                )
                .catch(() => undefined)
            )
          )
        }

        await cancelPendingFocusDojims(userId).catch(() => undefined)
      } else if (
        webhookResult.scope === 'ecosystem' &&
        webhookResult.productId === 'absystem_ai'
      ) {
        await sendAbsystemPaymentSuccessTelegramMessage(userId).catch(
          () => undefined
        )
      }

      setImmediate(() => {
        void (async () => {
          try {
            const generated = await runWeeklyAnalysis(userId)
            if (!generated) return

            await notificationService.emit(
              NotificationEvent.WEEKLY_SUMMARY,
              userId,
              {
                streak: generated.userReport.streakDays,
                wheels: generated.metrics.wheels,
                sessions: generated.metrics.sessions,
              }
            )
          } catch (generationError) {
            console.error(
              '⚠️ Weekly report generation after payment failed',
              generationError
            )
          }
        })()
      })
    }

    return res.status(200).send('OK')
  } catch (err) {
    console.error('💥 Payment callback error', err)
    console.error(`[WayForPay] Callback failed: Internal Error`, {
      error: err instanceof Error ? err.message : 'unknown',
    })
    return res.status(500).send('FAIL')
  }
}
