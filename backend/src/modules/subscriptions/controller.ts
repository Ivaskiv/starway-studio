// backend/src/modules/subscriptions/controller.ts
// HTTP handlers для підписок — використовує service.ts (getUserSubscriptionInfo)
// Приклад: GET /api/subscriptions/status → { subscription, cooldown }

import type { Request, Response } from 'express';
import { trackEvent } from '../events/service.js';
import { resolveUserState } from '../telegram-mentor/handlers/start.js';
import { resolveTelegramProductSummary } from '../telegram-mentor/services/productSummary.service.js';
import {
  buildEcosystemPaymentCheckoutSession,
  resolveEcosystemPaymentPlan,
  type EcosystemPaymentPlanId,
} from './payments/business.js';
import {
  createWayForPayCheckout,
  getCheckoutSession,
} from './payments/wayforpay.checkout.js';
import { generatePaymentSignature } from './payments/wayforpay.js';
import {
  markWelcomeTestPaymentPending,
} from '../../products/absystem/config/welcomeTest.payment.js';
import { stankeyManifest } from '@/products/stankey/product.manifest.js';
import { getUserSubscriptionInfo, getUserSubscriptions } from './service.js';
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import { prisma } from '../../db/client.js';
import { syncLifecycleForUser } from '../flow-control/service.js';
import { invalidateFunnelStage } from '../../lib/funnel/getUserFunnelStage.js';
import { getTelegramProductContext } from '@/content/telegram.product-context.js';
import { markAbTestPaymentSuccess } from '@/products/ab-system/telegram/abTest.markers.js';
import { sendAbTestBlock12Welcome } from './payments/callback.notifications.js';
import { getConfiguredFocusProduct, hasActiveFocusSubscription } from './payments/focus.access.js';

type AccessGrantLike = {
  id: string
  productId: string
  grantType: string
  code: string
  expiresAt: Date | null
  usageLimit: number
  usedCount: number
  createdBy: string
  boundUserId: string | null
}

function toPlatformProductId(productId: string) {
  const normalized = String(productId).trim().toLowerCase()
  if (normalized === 'stankey') return 'stankey' as const
  if (normalized === 'focus') return 'focus' as const
  if (normalized === 'absystem') return 'absystem' as const
  return null
}

function normalizeFocusPlanCode(planCode: string): EcosystemPaymentPlanId | null {
  if (planCode === 'monthly' || planCode === '1month') return '1month'
  if (planCode === 'quarterly' || planCode === '3month') return '3month'
  return null
}

// FIX(18.05.2026): controller aligned with linear payment flow — Codex
function decodeStoredCheckoutPayload(payload: string): Record<string, unknown> | null {
  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf8')
    const parsed = JSON.parse(decoded)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

function refreshCheckoutPayloadForRetry(rawPayload: Record<string, unknown>): Record<string, unknown> {
  const amount = Number(rawPayload.amount ?? 0)
  const currency = String(rawPayload.currency ?? 'UAH')
  const clientAccountId = String(rawPayload.clientAccountId ?? '').trim()
  const existingRef = String(rawPayload.orderReference ?? '').trim()
  const productName = Array.isArray(rawPayload.productName)
    ? rawPayload.productName.map((item) => String(item))
    : []
  const productPrice = Array.isArray(rawPayload.productPrice)
    ? rawPayload.productPrice.map((item) => Number(item))
    : []
  const productCount = Array.isArray(rawPayload.productCount)
    ? rawPayload.productCount.map((item) => Number(item))
    : []

  if (!existingRef || !clientAccountId || !Number.isFinite(amount) || amount <= 0 || productName.length === 0) {
    return rawPayload
  }

  const orderDate = Math.floor(Date.now() / 1000)
  const sanitizedBaseRef = existingRef.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'focus'
  // FIX 2026-05-25 PAY_RETRY1: every checkout open gets a fresh orderReference to avoid WFP 1112 duplicate id.
  const nextOrderReference = `${sanitizedBaseRef}_r${Date.now()}`
  const merchantSignature = generatePaymentSignature(
    {
      userId: clientAccountId,
      productId: productName[0] ?? 'focus',
      amount,
      payRef: nextOrderReference,
      currency,
      product_name: productName,
      product_count: productCount.length ? productCount : [1],
      product_price: productPrice.length ? productPrice : [amount],
    },
    orderDate,
  )

  return {
    ...rawPayload,
    orderReference: nextOrderReference,
    orderDate,
    merchantSignature,
  }
}

export function validateGrant(grant: AccessGrantLike | null, userId: string) {
  if (!grant) {
    return { ok: false as const, reason: 'grant_not_found' }
  }

  if (grant.boundUserId && grant.boundUserId !== userId) {
    return { ok: false as const, reason: 'grant_bound_to_other_user' }
  }

  if (grant.expiresAt && grant.expiresAt.getTime() <= Date.now()) {
    return { ok: false as const, reason: 'grant_expired' }
  }

  if (grant.usedCount >= grant.usageLimit) {
    return { ok: false as const, reason: 'grant_usage_exhausted' }
  }

  return { ok: true as const }
}

export async function activateGrantForUser(userId: string, grant: AccessGrantLike) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      expertId: true,
      onboardingStartedAt: true,
      currentStep: true,
    },
  })

  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }

  const now = new Date()
  const normalizedProductId = String(grant.productId).trim().toLowerCase()
  const platformProductId = toPlatformProductId(normalizedProductId)
  if (!platformProductId) {
    throw new Error('UNSUPPORTED_GRANT_PRODUCT')
  }
  const context = getTelegramProductContext(platformProductId)

  await prisma.$transaction(async (tx) => {
    await tx.accessGrant.update({
      where: { id: grant.id },
      data: {
        usedCount: { increment: 1 },
        ...(grant.boundUserId ? {} : { boundUserId: userId }),
      },
    })

    await tx.purchaseHistory.create({
      data: {
        userId,
        expertId: user.expertId ?? undefined,
        amountCents: 0,
        currency: 'UAH',
        metadata: {
          kind: `${normalizedProductId}_grant`,
          provider: 'grant',
          productId: normalizedProductId,
          accessSource: grant.grantType === 'affiliate' ? 'affiliate' : grant.grantType === 'bonus' ? 'bonus' : 'gifted',
          grantType: grant.grantType,
          grantCode: grant.code,
          roomId: context.roomId,
          onboardingDispatch: true,
        },
      },
    })

    if (!user.onboardingStartedAt) {
      await tx.user.update({
        where: { id: userId },
        data: {
          onboardingStartedAt: now,
          currentStep: user.currentStep === 'LINK_TELEGRAM' ? 'START_FLOW' : user.currentStep,
        },
      })
    }
  })

  await syncLifecycleForUser(userId)
  await invalidateFunnelStage(userId)

  const productSummary = await resolveTelegramProductSummary(userId)
  const activatedRoom = productSummary.allProducts.find((product) => product.roomId === context.roomId)
    ?? productSummary.primary

  return {
    success: true,
    productId: normalizedProductId,
    lifecycleState: activatedRoom?.behaviorState ?? 'gifted',
    roomSwitch: activatedRoom
      ? {
          roomId: activatedRoom.roomId,
          state: activatedRoom.state,
          selectedFlow: activatedRoom.selectedFlow,
          primaryCta: activatedRoom.behaviorPolicy.primaryCta,
        }
      : null,
  }
}

/** GET /api/subscriptions/status — поточний стан підписки + cooldown */
export async function getSubscriptionStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const [data, productSummary] = await Promise.all([
      getUserSubscriptionInfo(userId),
      resolveTelegramProductSummary(userId).catch(() => null),
    ]);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_subscription_status_viewed',
      source: 'web',
      state,
      payload: {
        status: data.subscription?.status ?? null,
      },
    })
    return res.json({
      success: true,
      ...data,
      productRooms: productSummary?.webRooms ?? [],
      primaryProductRoom: productSummary?.primary
        ? {
            key: productSummary.primary.key,
            title: productSummary.primary.title,
            state: productSummary.primary.state,
            selectedFlow: productSummary.primary.selectedFlow,
            roomId: productSummary.primary.roomId,
            accessSource: productSummary.primary.accessSource,
            mentorMode: productSummary.primary.mentorMode,
            activationState: productSummary.primary.activationState,
            progressState: productSummary.primary.progressState,
            reminderState: productSummary.primary.reminderState,
            gamificationState: productSummary.primary.gamificationState,
            behaviorPolicy: productSummary.primary.behaviorPolicy,
            behaviorState: productSummary.primary.behaviorState,
            upsellState: productSummary.primary.upsellState,
            retentionState: productSummary.primary.retentionState,
            paymentUrl: productSummary.primary.paymentUrl,
            openUrl: productSummary.primary.openUrl,
            progressUrl: productSummary.primary.progressUrl,
          }
        : null,
      productProgress: productSummary?.progress ?? null,
    });
  } catch (err) {
    console.error('❌ getSubscriptionStatus error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/** GET /api/subscriptions — всі підписки юзера */
export async function listSubscriptions(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const subscriptions = await getUserSubscriptions(userId);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_subscriptions_list_viewed',
      source: 'web',
      state,
      payload: {
        count: subscriptions.length,
      },
    })
    return res.json({ success: true, subscriptions });
  } catch (err) {
    console.error('❌ listSubscriptions error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function activateSubscriptionGrantHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
    if (!code) {
      return res.status(400).json({ error: 'invalid_code', reason: 'missing_code' })
    }

    const grant = await prisma.accessGrant.findUnique({
      where: { code },
    })

    const validation = validateGrant(grant, userId)
    if (!validation.ok) {
      return res.status(400).json({ error: 'invalid_grant', reason: validation.reason })
    }

    if (!grant) {
      return res.status(400).json({ error: 'invalid_grant', reason: 'grant_not_found' })
    }

    const result = await activateGrantForUser(userId, grant)
    return res.json(result)
  } catch (err) {
    console.error('❌ activateSubscriptionGrantHandler error', err)
    return res.status(500).json({ error: 'server_error' })
  }
}

export async function startSuperadminTrialTestHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const role = String(req.user?.role ?? '').toUpperCase();
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (role !== 'SUPERADMIN') return res.status(403).json({ error: 'forbidden' });

    const now = new Date();
    const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          trialStartsAt: now,
          trialEndsAt: endsAt,
        },
      }),
      prisma.subscription.create({
        data: {
          userId,
          status: 'TRIAL',
          planCode: 'trial',
          startsAt: now,
          trialEndsAt: endsAt,
          autoRenew: false,
        },
      }),
    ]);
    await syncLifecycleForUser(userId);
    await invalidateFunnelStage(userId);

    await trackEvent({
      userId,
      type: 'superadmin_trial_test_started',
      source: 'web',
      state: await resolveUserState(userId).catch(() => null),
      payload: {
        endsAt: endsAt.toISOString(),
      },
    });

    return res.json({ ok: true, trialEndsAt: endsAt.toISOString() });
  } catch (err) {
    console.error('❌ startSuperadminTrialTestHandler error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function activateSuperadminPaymentTestHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const role = String(req.user?.role ?? '').toUpperCase();
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (role !== 'SUPERADMIN') return res.status(403).json({ error: 'forbidden' });

    const planCode = typeof req.body?.planCode === 'string' && req.body.planCode.trim()
      ? req.body.planCode.trim()
      : 'monthly';
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.subscription.create({
      data: {
        userId,
        status: 'ACTIVE',
        planCode,
        startsAt: now,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
      },
    });
    await syncLifecycleForUser(userId);
    await invalidateFunnelStage(userId);

    await trackEvent({
      userId,
      type: 'superadmin_payment_test_activated',
      source: 'web',
      state: await resolveUserState(userId).catch(() => null),
      payload: {
        planCode,
        currentPeriodEnd: periodEnd.toISOString(),
      },
    });

    return res.json({ ok: true, planCode, currentPeriodEnd: periodEnd.toISOString() });
  } catch (err) {
    console.error('❌ activateSuperadminPaymentTestHandler error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function initiateSubscriptionPaymentHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    const productId = typeof req.body?.productId === 'string' ? req.body.productId.trim() : ''
    const planCode = typeof req.body?.planCode === 'string' ? req.body.planCode.trim() : ''

    if (productId === 'focus') {
      const configuredFocusProduct = await getConfiguredFocusProduct()
      if (!configuredFocusProduct) {
        return res.status(503).json({
          error: 'focus_product_not_configured',
          message: 'Focus product is missing in DB',
        })
      }

      const alreadyActive = await hasActiveFocusSubscription(userId)
      if (alreadyActive) {
        return res.json({
          status: 'already_active',
          action: 'resend_access',
          message: 'Focus subscription already active',
        })
      }

      const planId = normalizeFocusPlanCode(planCode)
      if (!planId) return res.status(400).json({ error: 'invalid_plan' })
      const plan = resolveEcosystemPaymentPlan('focus', planId)
      if (!plan) return res.status(400).json({ error: 'invalid_plan' })

      console.log('[PAYMENT_INIT] focus payment requested', {
        userId,
        planId,
        amount: plan.amount,
        currency: 'UAH',
        hasMerchantAccount: Boolean(process.env.WAYFORPAY_MERCHANT),
        hasMerchantDomain: Boolean(process.env.WAYFORPAY_MERCHANT_DOMAIN),
        hasSecret: Boolean(process.env.WAYFORPAY_SECRET),
        hasCallbackUrl: Boolean(process.env.WAYFORPAY_CALLBACK_URL),
      })

      let checkout: Awaited<ReturnType<typeof buildEcosystemPaymentCheckoutSession>>
      try {
        checkout = await buildEcosystemPaymentCheckoutSession('focus', planId, userId)
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        console.error('[PAYMENT_INIT] ❌ Failed to build checkout URL', { reason })
        return res.status(500).json({ error: 'payment_not_configured', reason })
      }

      const orderReference = checkout.orderReference
      const linkToken = typeof req.body?.linkToken === 'string' ? req.body.linkToken.trim() : ''

      if (linkToken) {
        await markWelcomeTestPaymentPending(userId, { linkToken, paymentId: orderReference })
      }

      console.log('[PAYMENT_INIT] ✅ focus checkout URL generated', {
        userId,
        planId,
        orderReference,
        checkoutUrlPrefix: checkout.checkoutUrl.slice(0, 80),
      })

      await trackEvent({
        userId,
        type: 'checkout_opened',
        source: 'web',
        state: await resolveUserState(userId).catch(() => null),
        payload: {
          productId: 'focus',
          planCode: planId,
          amount: plan.amount,
          orderReference,
          linkToken: linkToken || null,
        },
      })

      return res.json({
        ok: true,
        productId: 'focus',
        planCode: planId,
        amount: plan.amount,
        currency: 'UAH',
        checkoutUrl: checkout.checkoutUrl,
        paymentUrl: checkout.checkoutUrl,
        orderReference,
      })
    }

    if (productId === stankeyManifest.productId) {
      const selectedPlan = stankeyManifest.pricing.plans.find(plan => plan.id === planCode)
      if (!selectedPlan) {
        return res.status(400).json({ error: 'invalid_plan' })
      }

      const checkout = await createWayForPayCheckout({
        user: {
          id: userId,
          email: user?.email ?? null,
        },
        product: {
          id: stankeyManifest.productId,
          title: stankeyManifest.title,
        },
        plan: selectedPlan.id,
      })

      await trackEvent({
        userId,
        type: 'checkout_opened',
        source: 'telegram',
        state: await resolveUserState(userId).catch(() => null),
        payload: {
          productId: stankeyManifest.productId,
          planCode: checkout.planId,
          amount: checkout.amount,
          currency: checkout.currency,
          orderReference: checkout.orderReference,
          hasEmail: Boolean(user?.email),
        },
      })

      return res.json({
        ok: true,
        productId: stankeyManifest.productId,
        planCode: checkout.planId,
        amount: checkout.amount,
        currency: checkout.currency,
        paymentUrl: checkout.checkoutUrl,
        payment: checkout.payment,
        payload: checkout.payload,
      })
    }

    return res.status(400).json({ error: 'invalid_product' })
  } catch (err) {
    console.error('❌ initiateSubscriptionPaymentHandler error', err)
    return res.status(500).json({ error: 'server_error' })
  }
}

export async function resendFocusBlock12DevHandler(req: Request, res: Response) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'dev_only' })
  }

  const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : ''
  if (!userId) return res.status(400).json({ error: 'user_id_required' })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) return res.status(404).json({ error: 'user_not_found' })

  const focusActive = await hasActiveFocusSubscription(userId)
  if (!focusActive) {
    return res.status(400).json({ error: 'focus_subscription_not_active' })
  }

  await markAbTestPaymentSuccess(userId)
  await sendAbTestBlock12Welcome(userId)

  return res.json({
    ok: true,
    userId,
    focusActive: true,
    block12Resent: true,
  })
}

export async function renderWayForPayCheckoutPageHandler(req: Request, res: Response) {
  const token = typeof req.params.token === 'string' ? req.params.token.trim() : ''
  const storedPayload = token ? await getCheckoutSession(token) : null
  const payloadFromSession = storedPayload ? decodeStoredCheckoutPayload(storedPayload) : null
  const fallbackPayloadRaw = typeof req.query.payload === 'string' ? req.query.payload.trim() : ''
  // FIX 2026-05-25 TP3: recover from token miss using signed payload fallback in query.
  const payloadFromFallback = !payloadFromSession && fallbackPayloadRaw
    ? decodeStoredCheckoutPayload(fallbackPayloadRaw)
    : null
  const payload = payloadFromSession ?? payloadFromFallback

  if (!payload) {
    console.error('[WAYFORPAY_CHECKOUT] ❌ Invalid or expired checkout token', {
      product: req.query.product,
      plan: req.query.plan,
      hasToken: Boolean(token),
      hasFallbackPayload: Boolean(fallbackPayloadRaw),
    })
    return res.status(400).send('Invalid checkout token')
  }

  if (!payloadFromSession && payloadFromFallback) {
    console.warn('[CHECKOUT_TRACE] token_miss_payload_fallback', {
      product: req.query.product,
      plan: req.query.plan,
      hasToken: Boolean(token),
      hasFallbackPayload: true,
    })
  }

  // FIX 2026-05-25 PAY_RETRY2: regenerate order reference/signature so repeated pay attempts stay valid.
  const replaySafePayload = refreshCheckoutPayloadForRetry(payload)
  if (String(replaySafePayload.orderReference ?? '') !== String(payload.orderReference ?? '')) {
    console.warn('[PAYMENT_RETRY]', {
      oldRef: String(payload.orderReference ?? ''),
      newRef: String(replaySafePayload.orderReference ?? ''),
    })
    console.info('[PAYMENT_TRACE]', {
      step: 'invoice_create',
      note: 'checkout_retry_regenerated',
      previousOrderReference: payload.orderReference,
      nextOrderReference: replaySafePayload.orderReference,
    })
  }

  console.log('[WAYFORPAY_CHECKOUT] rendering form', {
    product: req.query.product,
    plan: req.query.plan,
    merchantAccount: String(payload.merchantAccount ?? '').slice(0, 8) + '...',
    orderReference: replaySafePayload.orderReference,
    amount: replaySafePayload.amount,
    currency: replaySafePayload.currency,
    hasSignature: Boolean(replaySafePayload.merchantSignature),
    hasReturnUrl: Boolean(replaySafePayload.returnUrl),
    hasServiceUrl: Boolean(replaySafePayload.serviceUrl),
  })

  const formInputs = Object.entries(replaySafePayload)
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) =>
          `<input type="hidden" name="${key}" value="${String(item ?? '').replace(/"/g, '&quot;')}" />`,
        )
      }

      const normalizedValue = typeof value === 'object'
        ? JSON.stringify(value)
        : String(value ?? '')
      return `<input type="hidden" name="${key}" value="${normalizedValue.replace(/"/g, '&quot;')}" />`
    })
    .join('\n')

  const html = [
    '<!doctype html>',
    '<html lang="uk">',
    '<head><meta charset="utf-8" /><title>WayForPay Checkout</title></head>',
    '<body>',
    '<form id="wayforpay-checkout" method="post" action="https://secure.wayforpay.com/pay">',
    formInputs,
    '<noscript><button type="submit">Continue to payment</button></noscript>',
    '</form>',
    '<script>document.getElementById("wayforpay-checkout").submit();</script>',
    '</body>',
    '</html>',
  ].join('')

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(200).send(html)
}

export async function wayForPayReturnHandler(req: Request, res: Response) {
  const targetRaw = typeof req.query.target === 'string' ? req.query.target.trim() : ''
  const frontendBase = (
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim() ||
    process.env.PUBLIC_FRONTEND_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    ''
  ).replace(/\/$/, '')
  const fallbackTarget = frontendBase ? `${frontendBase}/miniapp?startapp=billing-success` : ''

  const target = targetRaw || fallbackTarget
  if (target.startsWith('http://') || target.startsWith('https://')) {
    return res.redirect(302, target)
  }

  const html = [
    '<!doctype html>',
    '<html lang="uk"><head><meta charset="utf-8" /><title>Оплата успішна</title></head><body>',
    '<h3>Оплата успішна</h3>',
    '<p>Поверніться у застосунок.</p>',
    '</body></html>',
  ].join('')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(200).send(html)
}
