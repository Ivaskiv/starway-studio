import type { Prisma } from '@starway/db/prisma-client'
import type { Request, Response } from 'express'
import {
  buildRuntimeTelemetry,
  withRuntimeAdvisoryLock,
} from '../../../core/runtime/runtimeIdempotency.js'
import { buildRequestFingerprint } from '../../../core/state-machine/securityFoundation.js'
import { prisma } from '../../../db/client.js'
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
  resolveFocusChannelInviteLink,
  simulateFocusActivation,
} from './business.js'
import {
  cancelPendingFocusDojims,
  sendAbsystemPaymentSuccessTelegramMessage,
  sendAbTestBlock12Welcome,
  sendFocusPaymentSuccessTelegramMessage,
  sendPaymentFailedTelegramMessage,
} from './callback.notifications.js'
import { sendOpsTelegramMessage } from '../../../lib/telegram.js'
import { isProcessedPayment, processPaymentWebhook } from './callback.processing.js'
import { resolveWebhookPaymentTarget } from './callback.targets.js'
import { verifySignature } from './crypto.js'
import { loadAbTestProgress } from '@/products/ab-system/telegram/abTest.progress.js'
import { scheduleFollowups } from '@/products/ab-system/telegram/abTest.scheduler.js'
import { markAbTestPaymentSuccess } from '@/products/ab-system/telegram/abTest.service.js'
import { markCheckoutSessionCompleted, markCheckoutSessionProcessing } from './wayforpay.checkout.js'

/** WayForPay callback handler — публічний ендпоінт (без authRequired) */
export async function wayForPayCallback(req: Request, res: Response) {
  try {
    const raw = (req.body ?? {}) as Record<string, unknown>
    const data = {
      order_reference:
        typeof raw.order_reference === 'string'
          ? raw.order_reference
          : typeof raw.orderReference === 'string'
            ? raw.orderReference
            : '',
      amount:
        typeof raw.amount === 'number'
          ? raw.amount
          : typeof raw.amount === 'string'
            ? Number(raw.amount)
            : NaN,
      currency:
        typeof raw.currency === 'string' ? raw.currency : '',
      product_name: Array.isArray(raw.product_name)
        ? raw.product_name.map((v) => String(v))
        : Array.isArray(raw.productName)
          ? raw.productName.map((v) => String(v))
          : undefined,
      product_count: Array.isArray(raw.product_count)
        ? raw.product_count.map((v) => Number(v))
        : Array.isArray(raw.productCount)
          ? raw.productCount.map((v) => Number(v))
          : undefined,
      product_price: Array.isArray(raw.product_price)
        ? raw.product_price.map((v) => Number(v))
        : Array.isArray(raw.productPrice)
          ? raw.productPrice.map((v) => Number(v))
          : undefined,
      clientAccountId:
        typeof raw.clientAccountId === 'string'
          ? raw.clientAccountId
          : typeof raw.client_account_id === 'string'
            ? raw.client_account_id
            : undefined,
      merchant_signature:
        typeof raw.merchant_signature === 'string'
          ? raw.merchant_signature
          : typeof raw.merchantSignature === 'string'
            ? raw.merchantSignature
            : undefined,
      transaction_status:
        typeof raw.transaction_status === 'string'
          ? raw.transaction_status
          : typeof raw.transactionStatus === 'string'
            ? raw.transactionStatus
            : undefined,
      transaction_id:
        typeof raw.transaction_id === 'string'
          ? raw.transaction_id
          : typeof raw.transactionId === 'string'
            ? raw.transactionId
            : undefined,
      reason_code:
        typeof raw.reason_code === 'string'
          ? raw.reason_code
          : typeof raw.reasonCode === 'string'
            ? raw.reasonCode
            : undefined,
    } as PaymentCallbackData
    const callbackStartedAt = Date.now()
    const normalizedPreview = {
      order_reference: (req.body as Record<string, unknown>)?.order_reference ?? (req.body as Record<string, unknown>)?.orderReference ?? null,
      transaction_status: (req.body as Record<string, unknown>)?.transaction_status ?? (req.body as Record<string, unknown>)?.transactionStatus ?? null,
      amount: (req.body as Record<string, unknown>)?.amount ?? null,
      currency: (req.body as Record<string, unknown>)?.currency ?? null,
      clientAccountId: (req.body as Record<string, unknown>)?.clientAccountId ?? null,
      merchant_signature_present: Boolean((req.body as Record<string, unknown>)?.merchant_signature),
      merchantSignature_present: Boolean((req.body as Record<string, unknown>)?.merchantSignature),
    }
    console.log('[PAYMENT_LIFECYCLE] parsed payload', req.body)
    console.log('[PAYMENT_LIFECYCLE] normalized payload', normalizedPreview)

    if (!data.order_reference || !data.amount || isNaN(Number(data.amount))) {
      console.warn('[WayForPay] Invalid callback - skipping:', {
        orderReference: data.order_reference,
        amount: data.amount,
      })
      console.warn('[PAYMENT_LIFECYCLE] skip reason', {
        reason: 'missing_required_fields',
        expected: ['order_reference', 'amount', 'currency', 'transaction_status', 'merchant_signature'],
        actualKeys: Object.keys((req.body ?? {}) as Record<string, unknown>),
      })
      return res.status(200).json({ status: 'skipped' })
    }

    console.log('[PAYMENT_LIFECYCLE] callback received', {
      orderReference: data.order_reference,
      transactionStatus: data.transaction_status,
      amount: data.amount,
      clientAccountId: data.clientAccountId ?? '⚠️ MISSING',
      productName: data.product_name,
      currency: data.currency,
    })

    if (typeof data.order_reference === 'string' && data.order_reference.trim()) {
      await markCheckoutSessionProcessing(data.order_reference.trim()).catch(() => undefined)
    }

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

    const isValidSignature = verifySignature(data)
    const isDev = process.env.NODE_ENV === 'development'
    // Для локального тестування webhook без бойового підпису:
    // if (!isValidSignature && !isDev) { return res.status(400) }
    if (!isValidSignature && !isDev) {
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
      isDevBypass: !isValidSignature && isDev,
    })

    if (data.transaction_status === 'Approved') {
      const alreadyProcessed = await isProcessedPayment(data.order_reference, prisma)
      if (alreadyProcessed) {
        console.warn('[PAYMENT_LIFECYCLE] duplicate callback detected', {
          orderReference: data.order_reference,
          source: 'processedPayment_guard',
          action: 'skip_reprocessing',
        })
        return res.status(200).send('OK')
      }

      console.log('[PAYMENT_LIFECYCLE] payment verified', {
        orderReference: data.order_reference,
        signature: 'ok',
        transactionStatus: data.transaction_status,
      })
    }

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

      return res.status(200).send('OK')
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
      console.warn('[PAYMENT_LIFECYCLE] duplicate callback detected', {
        orderReference: data.order_reference,
        source: 'runtime_advisory_lock_not_acquired',
        action: 'skip_reprocessing',
      })
      return res.status(200).send('OK')
    }

    const webhookResult = result.value
    if (webhookResult.duplicate) {
      console.warn('[PAYMENT_LIFECYCLE] duplicate callback detected', {
        orderReference: data.order_reference,
        source: 'webhook_processing_duplicate',
        action: 'skip_reprocessing',
      })
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
      if (typeof data.order_reference === 'string' && data.order_reference.trim()) {
        await markCheckoutSessionCompleted(data.order_reference.trim()).catch(() => undefined)
      }
      console.log(`[WayForPay] Subscription activated`, {
        userId,
        productId,
        payRef,
      })
      console.log('[PAYMENT_LIFECYCLE] subscription activated', {
        userId,
        productId,
        planId: webhookResult.planId,
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
        const sent = await sendBillingSuccessTelegramMessage(userId).catch(() => undefined)
        console.log('[PAYMENT_LIFECYCLE] Telegram delivery completed', {
          userId,
          flow: 'stankey_success',
          sent: Boolean(sent),
        })
      } else if (
        webhookResult.scope === 'ecosystem' &&
        webhookResult.productId === 'focus'
      ) {
        const focusSuccessDelivered = await sendFocusPaymentSuccessTelegramMessage(userId).catch(
          () => undefined
        )
        console.log('[PAYMENT_LIFECYCLE] invite generated', {
          userId,
          flow: 'focus_success',
          generated: Boolean(focusSuccessDelivered),
        })
        console.log('[PAYMENT_LIFECYCLE] Telegram delivery completed', {
          userId,
          flow: 'focus_success',
          sent: Boolean(focusSuccessDelivered),
        })
        await markAbTestPaymentSuccess(userId).catch(() => undefined)
        void sendAbTestBlock12Welcome(userId).catch((err) => {
          console.warn('[Focus] Block 12 send failed', err)
          const details = err instanceof Error ? err.message : 'unknown_error'
          void sendOpsTelegramMessage(
            `⚠️ Focus Block 12 send failed\nuserId: ${userId}\nerror: ${details}`,
          )
        })
        void loadAbTestProgress(userId)
          .then((progress) => scheduleFollowups(userId, progress, 'S6_ZOOM'))
          .catch((err) => {
            console.warn('[Focus] S6_ZOOM followup scheduling failed', err)
            const details = err instanceof Error ? err.message : 'unknown_error'
            void sendOpsTelegramMessage(
              `⚠️ Focus S6_ZOOM followup scheduling failed\nuserId: ${userId}\nerror: ${details}`,
            )
          })

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
        const sent = await sendAbsystemPaymentSuccessTelegramMessage(userId).catch(
          () => undefined
        )
        console.log('[PAYMENT_LIFECYCLE] Telegram delivery completed', {
          userId,
          flow: 'absystem_success',
          sent: Boolean(sent),
        })
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
            const details =
              generationError instanceof Error
                ? generationError.message
                : 'unknown_error'
            void sendOpsTelegramMessage(
              `⚠️ Weekly report generation after payment failed\nuserId: ${userId}\nerror: ${details}`,
            )
          }
        })()
      })
    }

    console.log('[PAYMENT_LIFECYCLE] orchestration completion', {
      orderReference: data.order_reference,
      durationMs: Date.now() - callbackStartedAt,
      transactionStatus: data.transaction_status,
      runtimeStage: runtime.runtime_stage,
    })
    return res.status(200).send('OK')
  } catch (err) {
    console.error('💥 Payment callback error', err)
    console.error(`[WayForPay] Callback failed: Internal Error`, {
      error: err instanceof Error ? err.message : 'unknown',
    })
    const details = err instanceof Error ? err.message : 'unknown_error'
    void sendOpsTelegramMessage(
      `🚨 Payment callback error\nerror: ${details}`,
    )
    return res.status(500).send('FAIL')
  }
}
