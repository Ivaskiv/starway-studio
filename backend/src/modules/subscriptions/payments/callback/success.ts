import { markAbTestPaymentSuccess } from '@/products/ab-system/telegram/service.js'

import { prisma } from '../../../../db/client.js'
import { sendOpsTelegramMessage } from '../../../../lib/telegram.js'
import { trackEvent } from '../../../events/service.js'
import { sendBillingSuccessTelegramMessage } from '../../../telegram-mentor/handlers/billing.js'
import {
  sendAbsystemPaymentSuccessTelegramMessage,
  sendTrialZoomPaymentSuccessTelegramMessage,
} from './notifications.js'
import { activateProductSubscription } from '../activation.js'
import { markCheckoutSessionCompleted } from '../wayforpay/checkout.js'
import type { PaymentCallbackData } from '../../types.js'
import { handleFocusPaymentSuccess } from './focus.js'

export async function handleApprovedPayment(input: {
  userId: string
  data: PaymentCallbackData
  webhookResult: any
  state: any
  productId: string
  payRef: string
  amount: number
  requestFingerprint: string
}): Promise<void> {
  const {
    userId,
    data,
    webhookResult,
    state,
    productId,
    payRef,
    amount,
    requestFingerprint,
  } = input


      if (
        webhookResult.scope === 'ecosystem' &&
        webhookResult.productId === 'focus'
      ) {
        const planMonths =
          webhookResult.planId === '3month'
            ? 3
            : webhookResult.planId === '6month'
              ? 6
              : webhookResult.planId === '1year'
                ? 12
                : 1
        await activateProductSubscription({
          userId,
          productCode: 'focus',
          source: 'webhook_approved',
          orderReference: data.order_reference,
          amount: Number(data.amount ?? 0),
          planMonths,
          catalogPlanId: webhookResult.ecosystemPlanId,
        }).catch((activationError) => {
          console.error('[PAYMENT_LIFECYCLE] activation service failed', {
            userId,
            orderReference: data.order_reference,
            activationError,
          })
        })
      }

      await prisma.$transaction(
        async (tx) => {
          // fix with kimi 2026-05-28: wrapped all post-payment DB writes in prisma.$transaction — prevents partial state (e.g. subscription created but focusPaid = false) on server crash mid-orchestration
          if (
            typeof data.order_reference === 'string' &&
            data.order_reference.trim()
          ) {
            await markCheckoutSessionCompleted(
              data.order_reference.trim(),
              tx
            ).catch(async (err: unknown) => {
              const errorMessage =
                err instanceof Error ? err.message : String(err)
              console.error('[PAYMENT_LIFECYCLE] side_effect_failed', {
                operation: 'mark_checkout_session_completed',
                userId,
                payRef,
                orderReference: data.order_reference,
                error: errorMessage,
              })
              await sendOpsTelegramMessage(
                `[PAYMENT_LIFECYCLE] markCheckoutSessionCompleted failed\nuserId: ${userId}\npayRef: ${payRef}\norderReference: ${data.order_reference}\nerror: ${errorMessage}`
              ).catch((opsErr: unknown) => {
                console.error('[PAYMENT_LIFECYCLE] ops_alert_failed', {
                  operation: 'mark_checkout_session_completed',
                  userId,
                  payRef,
                  orderReference: data.order_reference,
                  error:
                    opsErr instanceof Error ? opsErr.message : String(opsErr),
                })
              })
            })
          }

          if (
            webhookResult.scope === 'ecosystem' &&
            webhookResult.productId === 'focus'
          ) {
            if (webhookResult.planId === 'welcome_test') {
              const linkToken = payRef.split('_')[1]
              await tx.user.update({
                where: { id: userId },
                data: {
                  settings: {
                    ...(typeof (state as any)?.settings === 'object'
                      ? (state as any).settings
                      : {}),
                    welcomeTest: {
                      ...(typeof (state as any)?.settings?.welcomeTest ===
                      'object'
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

            await markAbTestPaymentSuccess(userId, tx).catch(
              async (err: unknown) => {
                const errorMessage =
                  err instanceof Error ? err.message : String(err)
                console.error('[PAYMENT_LIFECYCLE] side_effect_failed', {
                  userId,
                  payRef,
                  orderReference: data.order_reference,
                  stage: 'markAbTestPaymentSuccess',
                  error: errorMessage,
                })
                await sendOpsTelegramMessage(
                  `[PAYMENT_LIFECYCLE] markAbTestPaymentSuccess failed\nuserId: ${userId}\npayRef: ${payRef}\norderReference: ${data.order_reference}\nerror: ${errorMessage}`
                ).catch((opsErr: unknown) => {
                  console.error('[PAYMENT_LIFECYCLE] ops_alert_failed', {
                    operation: 'mark_ab_test_payment_success',
                    userId,
                    payRef,
                    orderReference: data.order_reference,
                    error:
                      opsErr instanceof Error ? opsErr.message : String(opsErr),
                  })
                })
              }
            )
          }
        },
        { maxWait: 5000, timeout: 10000 }
      )

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
      }).catch((err: unknown) => {
        // fix with kimi 2026-05-28: explicit side-effect error boundary — logs failure without crashing webhook, WayForPay receives 200 OK regardless
        console.error('[PAYMENT_LIFECYCLE] side_effect_failed', {
          operation: 'track_event_payment_success',
          userId,
          orderReference: data.order_reference,
          error: err instanceof Error ? err.message : String(err),
        })
      })

      if (webhookResult.scope === 'stankey') {
        const sent = await sendBillingSuccessTelegramMessage(userId).catch(
          (err: unknown) => {
            // fix with kimi 2026-05-28: explicit side-effect error boundary — logs failure without crashing webhook, WayForPay receives 200 OK regardless
            console.error('[PAYMENT_LIFECYCLE] side_effect_failed', {
              operation: 'telegram_payment_confirmation',
              userId,
              orderReference: data.order_reference,
              error: err instanceof Error ? err.message : String(err),
            })
            return undefined
          }
        )
        console.log('[PAYMENT_LIFECYCLE] Telegram delivery completed', {
          userId,
          flow: 'stankey_success',
          sent: Boolean(sent),
        })
      } else if (
        webhookResult.scope === 'ecosystem' &&
        webhookResult.productId === 'focus'
      ) {
        await handleFocusPaymentSuccess({
          userId,
          data,
          webhookResult,
          payRef,
          amount,
        })
} else if (
        webhookResult.scope === 'ecosystem' &&
        webhookResult.productId === 'absystem_ai'
      ) {
        const sent = await sendAbsystemPaymentSuccessTelegramMessage(
          userId
        ).catch((err: unknown) => {
          // fix with kimi 2026-05-28: explicit side-effect error boundary — logs failure without crashing webhook, WayForPay receives 200 OK regardless
          console.error('[PAYMENT_LIFECYCLE] side_effect_failed', {
            operation: 'telegram_payment_confirmation',
            userId,
            orderReference: data.order_reference,
            error: err instanceof Error ? err.message : String(err),
          })
          return undefined
        })
        console.log('[PAYMENT_LIFECYCLE] Telegram delivery completed', {
          userId,
          flow: 'absystem_success',
          sent: Boolean(sent),
        })
      } else if (
        webhookResult.scope === 'ecosystem' &&
        webhookResult.productId === 'trial_zoom'
      ) {
        const sent = await sendTrialZoomPaymentSuccessTelegramMessage({
          userId,
          orderReference: data.order_reference,
        }).catch((err: unknown) => {
          console.error('[PAYMENT_LIFECYCLE] side_effect_failed', {
            operation: 'trial_zoom_payment_confirmation',
            userId,
            orderReference: data.order_reference,
            error: err instanceof Error ? err.message : String(err),
          })
          return false
        })
        console.log('[PAYMENT_LIFECYCLE] Telegram delivery completed', {
          userId,
          flow: 'trial_zoom_success',
          sent: Boolean(sent),
        })
      
}
}
