//backend/src/modules/subscriptions/payments/callback.handler.ts
import { loadAbTestProgress } from '@/products/ab-system/telegram/abTest.progress.js'
import { scheduleFollowups } from '@/products/ab-system/telegram/abTest.scheduler.js'
import { markAbTestPaymentSuccess } from '@/products/ab-system/telegram/abTest.service.js'
import { FOCUS_WELCOME } from '@/products/ab-system/content/abTest.focus.js'
import type { Prisma } from '@starway/db/prisma-client'
import type { Request, Response } from 'express'
import {
  buildRuntimeTelemetry,
  withRuntimeAdvisoryLock,
} from '../../../core/runtime/runtimeIdempotency.js'
import { buildRequestFingerprint } from '../../../core/state-machine/securityFoundation.js'
import { prisma } from '../../../db/client.js'
import { bot, coachBot, sendOpsTelegramMessage } from '../../../lib/telegram.js'
import { NotificationEvent } from '../../../services/notifications/NotificationEvent.js'
import { notificationService } from '../../../services/notifications/NotificationService.js'
import { runWeeklyAnalysis } from '../../ai-mentor/weekly-analysis/service.js'
import { getContentAttributionEventPayload } from '../../events/contentAttribution.service.js'
import { trackEvent } from '../../events/service.js'
import { sendBillingSuccessTelegramMessage } from '../../telegram-mentor/handlers/billing.js'
import { resolveUserState } from '../../telegram-mentor/handlers/start.js'
import {
  getUpcomingGroupSessions,
  scheduleReminders,
} from '../../zoom/service.js'
import type { PaymentCallbackData } from '../types.js'
import {
  buildEcosystemPaymentCheckoutUrl,
  resolveFocusChannelInviteLink,
  simulateFocusActivation,
} from './business.js'
import {
  sendAbsystemPaymentSuccessTelegramMessage,
  sendPaymentFailedTelegramMessage,
} from './callback.notifications.js'
import { alertCoachAboutPaymentIssue } from './coachAlert.service.js'
import { activateProductSubscription } from './paymentActivation.service.js'
import {
  processPaymentWebhook,
} from './callback.processing.js'
import { resolveWebhookPaymentTarget } from './callback.targets.js'
import { verifySignature } from './crypto.js'
import {
  markCheckoutSessionCompleted,
  markCheckoutSessionProcessing,
} from './wayforpay.checkout.js'

type WayForPayPayload = {
  order_reference?: string
  orderReference?: string
  transaction_status?: string
  transactionStatus?: string
  amount?: number | string
  currency?: string
  product_name?: unknown[]
  productName?: unknown[]
  product_count?: unknown[]
  productCount?: unknown[]
  product_price?: unknown[]
  productPrice?: unknown[]
  clientAccountId?: string
  client_account_id?: string
  merchant_signature?: string
  merchantSignature?: string
  transaction_id?: string
  transactionId?: string
  reason_code?: string
  reasonCode?: string
}

function parseWayForPayPayload(body: unknown): WayForPayPayload | null {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const payload = body as WayForPayPayload
    if (payload.orderReference || payload.order_reference) {
      return payload
    }
  }

  if (body && typeof body === 'object') {
    const keys = Object.keys(body as object)
    if (keys.length === 1) {
      try {
        const parsed = JSON.parse(keys[0]) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const payload = parsed as WayForPayPayload
          if (payload.orderReference || payload.order_reference) {
            return payload
          }
        }
      } catch {
        // not JSON key payload
      }
    }
  }

  return null
}

function getSafeName(firstName?: string | null): string {
  if (!firstName) return ''
  return firstName
    .replace(/[<>{}\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
}

function resolveZoomCalendarUrl(): string | null {
  const candidates = [
    process.env.TELEGRAM_WEBAPP_BASE_URL?.trim() ?? '',
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim() ?? '',
    process.env.PUBLIC_FRONTEND_URL?.trim() ?? '',
    process.env.FRONTEND_URL?.trim() ?? '',
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate)
      if (!parsed.host) continue
      return `${candidate.replace(/\/$/, '')}/miniapp/zoom-calendar`
    } catch {
      continue
    }
  }

  return null
}

function extractUserIdFromOrderRef(orderReference: string): string | null {
  const normalized = String(orderReference ?? '').trim()
  if (!normalized) return null
  const uuidMatch = normalized.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
  )
  return uuidMatch?.[0] ?? null
}

/** WayForPay callback handler — публічний ендпоінт (без authRequired) */
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

    if (
      typeof data.order_reference === 'string' &&
      data.order_reference.trim()
    ) {
      await markCheckoutSessionProcessing(data.order_reference.trim()).catch(
        () => undefined
      )
    }

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

    if (data.transaction_status !== 'Approved') {
      const coachChatId = String(process.env.STARWAY_OPS_CHAT_ID ?? process.env.OPS_TELEGRAM_CHAT_ID ?? '').trim()
      const rawOrderRef = String(data.order_reference ?? '').trim()
      const amountNumber = Number(data.amount ?? 0)
      if (coachChatId && rawOrderRef && Number.isFinite(amountNumber)) {
        const checkoutSession = await prisma.checkoutSession.findFirst({
          where: { orderReference: rawOrderRef },
          orderBy: { createdAt: 'desc' },
          select: { token: true },
        }).catch(() => null)
        if (!checkoutSession?.token) {
          return res.status(200).send('OK')
        }
        await alertCoachAboutPaymentIssue({
          bot: coachBot,
          coachChatId,
          userId:
            (typeof data.clientAccountId === 'string' && data.clientAccountId.trim())
              || extractUserIdFromOrderRef(rawOrderRef)
              || 'unknown',
          checkoutToken: checkoutSession.token,
          orderReference: rawOrderRef,
          amount: amountNumber,
          reason: `transaction_${String(data.transaction_status ?? 'unknown')}`,
          scenario: 'B',
        }).catch((err) =>
          console.error('[COACH_NOTIFY] non_approved notify failed', err)
        )
      }
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
            ).catch(() => undefined)
          }

          if (
            webhookResult.scope === 'ecosystem' &&
            webhookResult.productId === 'focus'
          ) {
            await tx.productSubscription.updateMany({
              where: {
                userId,
                product: {
                  is: {
                    code: {
                      in: ['focus', 'FOCUS', 'stankey', 'STANKEY'],
                    },
                  },
                },
              },
              data: {
                status: 'active',
                paidAt: new Date(),
              },
            }).catch(() => undefined)

            await tx.user
              .update({
                where: { id: userId },
                data: { focusPaid: true },
              })
              .catch(() => undefined)

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

            await markAbTestPaymentSuccess(userId, tx).catch((err: unknown) => {
              console.error('[PAYMENT_LIFECYCLE] side_effect_failed', {
                userId,
                payRef,
                stage: 'markAbTestPaymentSuccess',
                error: err instanceof Error ? err.message : String(err),
              })
            })
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
                .catch((err: unknown) => {
                  // fix with kimi 2026-05-28: explicit side-effect error boundary — logs failure without crashing webhook, WayForPay receives 200 OK regardless
                  console.error('[PAYMENT_LIFECYCLE] side_effect_failed', {
                    operation: 'notification_service_schedule',
                    userId,
                    orderReference: data.order_reference,
                    error: err instanceof Error ? err.message : String(err),
                  })
                })
            )
          )
        }

        const paidUser = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            firstName: true,
            email: true,
            telegramChatId: true,
            telegramLinks: {
              where: { isActive: true, chatId: { not: null } },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { chatId: true },
            },
          },
        })
        const focusSubscription = await prisma.productSubscription.findFirst({
          where: {
            userId,
            product: {
              is: {
                code: {
                  in: ['focus', 'FOCUS', 'stankey', 'STANKEY'],
                },
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          select: { id: true, focusWelcomedAt: true },
        })
        const planLabelMap: Record<string, string> = {
          focus_1month: '1 місяць',
          focus_3month: '3 місяці',
          welcome_test: 'welcome_test',
        }
        const planLabel = webhookResult.planId
          ? (planLabelMap[webhookResult.planId] ?? webhookResult.planId)
          : 'невідомо'
        const dateStr = new Date().toLocaleString('uk-UA', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
        const activeCount = await prisma.productSubscription.count({
          where: { status: 'ACTIVE' },
        })
        const payerName = getSafeName(paidUser?.firstName)
        const opsSent = await sendOpsTelegramMessage(
          `ТРАНЗАКЦІЙНИЙ ЗВІТ\n\n` +
            `Тип події: Нова оплата\n` +
            `Учасник: ${payerName || 'Користувач'} · ${paidUser?.email ?? 'email невідомий'}\n` +
            `Тариф: ${planLabel}\n` +
            `Сума: ${amount} ${data.currency ?? 'UAH'}\n` +
            `Order: ${data.order_reference}\n` +
            `Час: ${dateStr}\n` +
            `Активних підписок: ${activeCount}`,
          process.env.PUBLIC_FRONTEND_URL?.trim()
            ? {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: 'Панель керування',
                        url: `${process.env.PUBLIC_FRONTEND_URL!.replace(/\/$/, '')}/app/dashboard`,
                      },
                    ],
                  ],
                },
              }
            : undefined
        ).catch((err) => {
          console.error('[payment] notify ops:', err)
          return false
        })
        console.log('[PAYMENT_LIFECYCLE] ops report delivered', {
          userId,
          delivered: Boolean(opsSent),
        })

        const upcoming = await getUpcomingGroupSessions(8)
        const paidChatId =
          paidUser?.telegramChatId ?? paidUser?.telegramLinks[0]?.chatId ?? null
        if (paidChatId && paidUser) {
          const zoomUrl = resolveZoomCalendarUrl()
          const lines = upcoming
            .map((session) => {
              const dt = new Date(session.scheduledAt)
              return `${dt.toLocaleString('uk-UA', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })} — ${session.topic}`
            })
            .join('\n')
          const name = getSafeName(paidUser.firstName)
          const greeting = name ? `${name}, ` : ''

          if (!zoomUrl) {
            console.warn(
              '[payment] skip upcoming schedule message: no valid zoomUrl configured'
            )
          } else {
            await bot.telegram
              .sendMessage(
                paidChatId,
                `${greeting}доступ до модуля ФОКУС активовано.\n\n` +
                  `Тариф: ${planLabel}\n` +
                  `Статус: активний\n\n` +
                  'Нижче доступний актуальний календар Zoom-практик.',
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        process.env.TELEGRAM_WEBAPP_BASE_URL?.trim()
                          ? {
                              text: 'Відкрити календар',
                              web_app: { url: zoomUrl },
                            }
                          : { text: 'Відкрити календар', url: zoomUrl },
                      ],
                    ],
                  },
                }
              )
              .catch((err: unknown) =>
                console.error('[payment] send focus access message:', err)
              )

            if (upcoming.length > 0) {
              await bot.telegram
                .sendMessage(
                  paidChatId,
                  `Календар Zoom-практик:\n\n${lines}\n\n` +
                    'Посилання на підключення надходить автоматично за 2 години до початку кожної сесії.',
                  {
                    reply_markup: {
                      inline_keyboard: [
                        [
                          process.env.TELEGRAM_WEBAPP_BASE_URL?.trim()
                            ? {
                                text: 'Переглянути календар',
                                web_app: { url: zoomUrl },
                              }
                            : { text: 'Переглянути календар', url: zoomUrl },
                        ],
                      ],
                    },
                  }
                )
                .catch((err: unknown) =>
                  console.error('[payment] send upcoming schedule:', err)
                )
            }
          }

          for (const session of upcoming) {
            await scheduleReminders(paidUser.id, session)
          }
        }

        if (!focusSubscription?.focusWelcomedAt) {
          const paidChatId =
            paidUser?.telegramChatId ?? paidUser?.telegramLinks[0]?.chatId ?? null
          const channelLink = process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK?.trim() ?? ''
          if (paidChatId) {
            await bot.telegram.sendMessage(
              paidChatId,
              FOCUS_WELCOME.msg1.body,
              channelLink
                ? {
                    reply_markup: {
                      inline_keyboard: [[{
                        text: 'Перейти в канал ФОКУС',
                        url: channelLink,
                      }]],
                    },
                  }
                : undefined,
            ).catch((err: unknown) => {
              console.error('[PAYMENT_LIFECYCLE] side_effect_failed', {
                operation: 'focus_block12_send',
                userId,
                orderReference: data.order_reference,
                error: err instanceof Error ? err.message : String(err),
              })
            })
            if (focusSubscription?.id) {
              await prisma.productSubscription.update({
                where: { id: focusSubscription.id },
                data: { focusWelcomedAt: new Date() },
              }).catch(() => undefined)
            }
            console.log('[FOCUS_BLOCK12] sent', {
              userId,
              channelLink: Boolean(channelLink),
            })
          }
        }

        void loadAbTestProgress(userId)
          .then((progress) => scheduleFollowups(userId, progress, 'S6_ZOOM'))
          .catch((err: unknown) => {
            console.warn('[Focus] S6_ZOOM followup scheduling failed', err)
            const details = err instanceof Error ? err.message : 'unknown_error'
            void sendOpsTelegramMessage(
              `Focus S6_ZOOM followup scheduling failed\nuserId: ${userId}\nerror: ${details}`
            )
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
              `⚠️ Weekly report generation after payment failed\nuserId: ${userId}\nerror: ${details}`
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
    void sendOpsTelegramMessage(`🚨 Payment callback error\nerror: ${details}`)
    return res.status(500).send('FAIL')
  }
}
