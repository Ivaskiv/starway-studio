import type { Prisma } from '@starway/db/prisma-client'
import type { Request, Response } from 'express'

import {
  buildRuntimeTelemetry,
  withRuntimeAdvisoryLock,
} from '../../../../core/runtime/idempotency.js'
import { buildRequestFingerprint } from '../../../../core/state-machine/securityFoundation.js'
import { prisma } from '../../../../db/client.js'
import { coachBot, sendOpsTelegramMessage } from '../../../../lib/telegram.js'
import { getContentAttributionEventPayload } from '../../../events/contentAttribution.service.js'
import { trackEvent } from '../../../events/service.js'
import { resolveUserState } from '../../../telegram-mentor/handlers/start.js'
import type { PaymentCallbackData } from '../../types.js'
import { resolveWebhookPaymentTarget } from './targets.js'
import { processPaymentWebhook } from './processing.js'
import { verifySignature } from '../wayforpay/signature.js'
import { markCheckoutSessionProcessing } from '../wayforpay/checkout.js'
import { handleFailedPayment } from './failure.js'
import {
  extractUserIdFromOrderRef,
  sendFocusPaymentOnboardingIfNeeded,
} from './focus-onboarding.js'
import {
  parseWayForPayPayload,
  type WayForPayPayload,
} from './payload.js'
import { handleApprovedPayment } from './success.js'
import { schedulePostPaymentAnalysis } from './post-payment.js'
import { alertCoachAboutPaymentIssue } from '../coach-alert.js'

export { sendFocusPaymentOnboardingIfNeeded } from './focus-onboarding.js'

/** WayForPay callback handler — public webhook orchestration owner. */
export async function wayForPayCallback(req: Request, res: Response) {
  try {
    const parsedPayload = parseWayForPayPayload(req.body)
    const raw: WayForPayPayload = parsedPayload ?? ((req.body ?? {}) as WayForPayPayload)
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
      currency: typeof raw.currency === 'string' ? raw.currency : '',
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
      order_reference: raw.order_reference ?? raw.orderReference ?? null,
      transaction_status: raw.transaction_status ?? raw.transactionStatus ?? null,
      amount: raw.amount ?? null,
      currency: raw.currency ?? null,
      clientAccountId:
        raw.clientAccountId ?? null,
      merchant_signature_present: Boolean(raw.merchant_signature),
      merchantSignature_present: Boolean(raw.merchantSignature),
    }
    console.log('[PAYMENT_LIFECYCLE] parsed payload', parsedPayload ?? req.body)
    console.log('[PAYMENT_LIFECYCLE] normalized payload', normalizedPreview)

    if (!data.order_reference || !data.amount || isNaN(Number(data.amount))) {
      console.warn('[WayForPay] Invalid callback - skipping:', {
        orderReference: data.order_reference,
        amount: data.amount,
      })
      console.warn('[PAYMENT_LIFECYCLE] skip reason', {
        reason: 'missing_required_fields',
        expected: [
          'order_reference',
          'amount',
          'currency',
          'transaction_status',
          'merchant_signature',
        ],
        actualKeys: Object.keys(raw as object),
      })
      const rawOrderRef = String(raw.order_reference ?? raw.orderReference ?? '').trim()
      const rawAmountNumber =
        typeof raw.amount === 'number'
          ? raw.amount
          : typeof raw.amount === 'string'
            ? Number(raw.amount)
            : NaN
      const coachChatId = String(process.env.STARWAY_OPS_CHAT_ID ?? process.env.OPS_TELEGRAM_CHAT_ID ?? '').trim()
      if (rawOrderRef && Number.isFinite(rawAmountNumber) && coachChatId) {
        const checkoutSession = await prisma.checkoutSession.findFirst({
          where: { orderReference: rawOrderRef },
          orderBy: { createdAt: 'desc' },
          select: { token: true },
        }).catch(() => null)
        if (!checkoutSession?.token) {
          return res.status(200).json({ status: 'skipped' })
        }
        await alertCoachAboutPaymentIssue({
          bot: coachBot,
          coachChatId,
          userId: extractUserIdFromOrderRef(rawOrderRef) ?? 'unknown',
          checkoutToken: checkoutSession.token,
          orderReference: rawOrderRef,
          amount: rawAmountNumber,
          reason: 'webhook_parse_failed',
          scenario: 'C',
        }).catch((err) =>
          console.error('[COACH_NOTIFY] webhook_parse_failed notify failed', err)
        )
      }
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

    const isZoomSwapPayment = typeof data.order_reference === 'string'
      && data.order_reference.startsWith('zoom_swap_')
    if (isZoomSwapPayment) {
      console.info('[PAYMENT_CALLBACK] zoom_swap_detected', {
        orderReference: data.order_reference,
        transactionStatus: data.transaction_status,
      })
    }

    const target = resolveWebhookPaymentTarget(data)
    // fix with kimi 2026-05-28: moved resolveWebhookPaymentTarget to after signature verification — prevents processing malformed orderReference before request legitimacy is confirmed
    if (!target && data.transaction_status === 'Approved') {
      console.error('[PAYMENT_LIFECYCLE] PRODUCT_NOT_FOUND', {
        orderReference: data.order_reference,
        reason: 'cannot_resolve_target_from_order_reference',
      })
      await trackEvent({
        userId:
          typeof data.clientAccountId === 'string' ? data.clientAccountId : null,
        type: 'payment_callback_product_not_found',
        source: 'web',
        state: null,
        payload: {
          orderReference: data.order_reference,
          productName: data.product_name,
        },
      })
      return res.status(200).send('OK') // 200 — prevent WayForPay retry loop
    }

    // fix with kimi 2026-05-28: removed pre-lock isProcessedPayment() — race condition, deduplication handled inside withRuntimeAdvisoryLock

    if (
      await handleFailedPayment({
        data,
        target,
        requestFingerprint,
      })
    ) {
      return res.status(200).send('OK')
    }

if (
      typeof data.order_reference === 'string' &&
      data.order_reference.trim()
    ) {
      await markCheckoutSessionProcessing(data.order_reference.trim()).catch(
        () => undefined
      )
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
      await handleApprovedPayment({
        userId,
        data,
        webhookResult,
        state,
        productId,
        payRef,
        amount,
        requestFingerprint,
      })

      schedulePostPaymentAnalysis(userId)
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
    void sendOpsTelegramMessage(`🚨 Payment callback error\nerror: ${details}`)
    return res.status(500).send('FAIL')
  }
}
