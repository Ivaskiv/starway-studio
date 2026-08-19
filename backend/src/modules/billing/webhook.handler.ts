import type { Request, Response } from 'express'
import type { Prisma } from '@starway/db/prisma-client'

import { trackEvent } from '../events/service.js'
import type { PaymentCallbackData } from '../subscriptions/types.js'

import { handleBillingWebhook } from './billing.service.js'
import { buildRequestFingerprint } from '../../core/state-machine/securityFoundation.js'
import { claimRuntimeEventReplay, buildRuntimeTelemetry, withRuntimeAdvisoryLock } from '../../core/runtime/idempotency.js'

export async function billingWebhookHandler(req: Request, res: Response) {
  try {
    const payload = req.body as PaymentCallbackData
    const requestFingerprint = buildRequestFingerprint({
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | null | undefined,
      payload: payload as unknown as Prisma.JsonValue,
    })
    const runtime = buildRuntimeTelemetry({
      scope: 'billing_webhook',
      type: 'payment_success',
      source: 'web',
      userId: typeof payload.clientAccountId === 'string' ? payload.clientAccountId : null,
      tenantId: typeof payload.product_name?.[0] === 'string' ? payload.product_name[0] : null,
      requestFingerprint,
      runtimeStage: 'payment',
      orchestrationPath: ['billing', 'webhook'],
    })
    const replay = await withRuntimeAdvisoryLock({
      scope: 'billing_webhook',
      type: 'payment_success',
      source: 'web',
      userId: typeof payload.clientAccountId === 'string' ? payload.clientAccountId : null,
      state: payload.transaction_status ?? null,
      tenantId: typeof payload.product_name?.[0] === 'string' ? payload.product_name[0] : null,
      requestFingerprint,
      runtimeStage: runtime.runtime_stage,
    }, async () => {
      const result = await handleBillingWebhook(payload)
      const variantMatch = typeof payload.order_reference === 'string'
        ? payload.order_reference.match(/^billing_(monthly|yearly)_([AB])_/)
        : null
      const variant = variantMatch?.[2] ?? null

      if (!result.ok) {
        await trackEvent({
          userId: typeof payload.clientAccountId === 'string' ? payload.clientAccountId : null,
          type: 'billing_webhook_invalid',
          source: 'web',
          state: payload.transaction_status ?? null,
          productId: typeof payload.product_name?.[0] === 'string' ? payload.product_name[0] : null,
          payload: {
            orderReference: payload.order_reference ?? null,
            security: {
              callback_signature_failure: true,
              suspicious_activity: true,
              request_fingerprint: requestFingerprint,
              webhook_trust_source: 'wayforpay',
            },
          },
        })
        return null
      }

      const replayFence = await claimRuntimeEventReplay({
        scope: 'billing_webhook',
        type: 'payment_success',
        source: 'web',
        userId: result.subscription?.userId ?? (typeof payload.clientAccountId === 'string' ? payload.clientAccountId : null),
        state: result.subscription?.plan ?? payload.transaction_status ?? null,
        tenantId: result.subscription?.plan ?? (typeof payload.product_name?.[0] === 'string' ? payload.product_name[0] : null),
        requestFingerprint,
        payload: {
          orderReference: payload.order_reference ?? null,
          runtime,
        } satisfies Prisma.JsonValue,
        ttlMs: 24 * 60 * 60 * 1000,
      })

      if (replayFence.duplicate) {
        return replayFence
      }

      if (result.subscription) {
        await trackEvent({
          userId: result.subscription.userId,
          type: 'payment_success',
          source: 'web',
          state: result.subscription.plan,
          productId: result.subscription.plan,
          payload: {
            provider: result.subscription.provider,
            duplicate: result.duplicate ?? false,
            expiresAt: result.subscription.expiresAt.toISOString(),
            variant,
            security: {
              request_fingerprint: requestFingerprint,
              tenant_id: result.subscription.plan,
              webhook_trust_source: 'wayforpay',
            },
          },
        })
      }

      return replayFence
    })

    return res.status(200).send('OK')
  } catch (error) {
    console.error('❌ billingWebhookHandler error', error)
    return res.status(500).send('FAIL')
  }
}
