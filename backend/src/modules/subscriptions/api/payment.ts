import type { Request, Response } from "express"
import { prisma } from "../../../db/client.js"
import type { AuthenticatedRequest } from "../../../types/globalTypes.js"
import { stankeyManifest } from "@/products/stankey/product.manifest.js"
import { markAbTestPaymentSuccess } from "@/products/ab-system/telegram/markers.js"
import { markWelcomeTestPaymentPending } from "../../../products/absystem/config/welcomeTest.payment.js"
import { coachBot } from "../../../lib/telegram.js"
import { trackEvent } from "../../events/service.js"
import { resolveUserState } from "../../telegram-mentor/handlers/start.js"
import { buildEcosystemPaymentCheckoutSession, resolveEcosystemPaymentPlan, type EcosystemPaymentPlanId } from "../payments/business/service.js"
import { createWayForPayCheckout } from "../payments/wayforpay/checkout.js"
import { readWayForPayCredentials } from "../payments/wayforpay/service.js"
import { resendFocusAccessTelegramMessage } from "../payments/callback/notifications.js"
import { alertCoachAboutPaymentIssue, findRelevantFocusCheckoutSession } from "../payments/coach-alert.js"
import { getConfiguredFocusProduct, hasActiveFocusSubscription } from "../payments/focus-access.js"

function normalizeFocusPlanCode(planCode: string): EcosystemPaymentPlanId | null {
  if (planCode === "monthly" || planCode === "1month") return "1month"
  if (planCode === "quarterly" || planCode === "3month") return "3month"
  return null
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
    const source = req.body?.source === 'telegram' ? 'telegram' : 'web'
    const targetPath = typeof req.body?.targetPath === 'string' ? req.body.targetPath.trim() : ''

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

      const credentials = readWayForPayCredentials()
      console.log('[PAYMENT_INIT] focus payment requested', {
        userId,
        planId,
        amount: plan.amount,
        currency: 'UAH',
        hasMerchantAccount: Boolean(credentials.merchantAccount),
        hasMerchantDomain: Boolean(credentials.merchantDomain),
        hasSecret: Boolean(credentials.merchantSecret),
        hasCallbackUrl: Boolean(process.env.WAYFORPAY_CALLBACK_URL),
      })

      let checkout: Awaited<ReturnType<typeof buildEcosystemPaymentCheckoutSession>>
      try {
        checkout = await buildEcosystemPaymentCheckoutSession('focus', planId, userId, {
          source,
          targetPath: targetPath || undefined,
        })
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

export async function reportFocusPaymentIssueHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const coachChatId = String(
      process.env.STARWAY_OPS_CHAT_ID ?? process.env.OPS_TELEGRAM_CHAT_ID ?? '',
    ).trim()

    if (!coachChatId) {
      return res.status(503).json({ error: 'ops_chat_not_configured' })
    }

    const checkoutSession = await findRelevantFocusCheckoutSession(userId)

    if (!checkoutSession?.token || !checkoutSession.orderReference) {
      return res.status(404).json({ error: 'focus_checkout_not_found' })
    }

    await alertCoachAboutPaymentIssue({
      bot: coachBot,
      coachChatId,
      userId,
      checkoutToken: checkoutSession.token,
      orderReference: checkoutSession.orderReference,
      amount: checkoutSession.amount,
      reason: '💳 Учасниця повідомила про проблему з оплатою',
      scenario: 'E',
    })

    return res.json({ ok: true, reported: true })
  } catch (err) {
    console.error('❌ reportFocusPaymentIssueHandler error', err)
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
  await resendFocusAccessTelegramMessage(userId)

  return res.json({
    ok: true,
    userId,
    focusActive: true,
    block12Resent: true,
  })
}
