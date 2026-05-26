import type { EcosystemPaymentPlanId, EcosystemPaymentProduct, EcosystemPaymentCheckoutSession } from './business.types.js'
import { buildPaymentRequest } from './wayforpay.js'
import { buildShortWayForPayCheckoutUrl, buildShortWayForPayCheckoutUrlSync } from './wayforpay.checkout.js'
import { resolveEcosystemPaymentPlan } from './business.catalog.js'

function getBackendBaseUrl() {
  return (
    process.env.PUBLIC_API_URL?.trim() ||
    process.env.INTERNAL_API_URL?.trim()?.replace(/\/api$/, '') ||
    process.env.TELEGRAM_WEBHOOK_URL?.trim()?.replace(/\/api\/telegram.*$/, '') ||
    (process.env.PORT
      ? `http://127.0.0.1:${process.env.PORT}`
      : 'http://127.0.0.1:3001')
  ).replace(/\/$/, '')
}

function getFrontendBaseUrl() {
  return (
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim() ||
    process.env.PUBLIC_FRONTEND_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    (process.env.NODE_ENV !== 'production' ? process.env.DEV_FRONTEND_URL?.trim() : '') ||
    ''
  ).replace(/\/$/, '')
}

export function buildWayForPayReturnUrl(backendBaseUrl: string, frontendBaseUrl?: string): string {
  const safeBackend = backendBaseUrl.replace(/\/$/, '')
  const target = (frontendBaseUrl ?? '').replace(/\/$/, '')
  if (target) {
    return `${safeBackend}/api/subscriptions/payments/wayforpay/return?target=${encodeURIComponent(
      `${target}/miniapp?startapp=billing-success`
    )}`
  }
  return `${safeBackend}/api/subscriptions/payments/wayforpay/return`
}

export function buildEcosystemPaymentCheckoutUrl(
  productId: EcosystemPaymentProduct,
  planId: EcosystemPaymentPlanId,
  userId: string
) {
  const plan = resolveEcosystemPaymentPlan(productId, planId)
  if (!plan) {
    throw new Error('invalid_ecosystem_plan')
  }
  const payRef = `${productId}_${planId}_${userId}_${Date.now()}`
  const payment = buildPaymentRequest({
    userId,
    productId,
    amount: plan.amount,
    currency: 'UAH',
    payRef,
    product_name: [productId === 'focus' ? 'FOCUS' : 'ABSystem AI'],
    product_count: [1],
    product_price: [plan.amount],
  })
  const checkoutUrl = buildShortWayForPayCheckoutUrlSync(getBackendBaseUrl(), payment, {
    product: productId,
    plan: planId,
  })
  return checkoutUrl
}

export async function buildEcosystemPaymentCheckoutSession(
  productId: EcosystemPaymentProduct,
  planId: EcosystemPaymentPlanId,
  userId: string,
  options?: {
    amountOverride?: number
    orderRefTag?: string
  }
): Promise<EcosystemPaymentCheckoutSession> {
  const plan = resolveEcosystemPaymentPlan(productId, planId)
  if (!plan) {
    throw new Error('invalid_ecosystem_plan')
  }

  const merchantAccount = process.env.WAYFORPAY_MERCHANT?.trim() || ''
  const merchantDomain = process.env.WAYFORPAY_MERCHANT_DOMAIN?.trim() || ''
  const merchantSecret = process.env.WAYFORPAY_SECRET?.trim() || ''

  if (!merchantAccount || !merchantDomain || !merchantSecret) {
    console.error('[WAYFORPAY_CHECKOUT] ❌ Missing WayForPay credentials', {
      hasMerchantAccount: Boolean(merchantAccount),
      hasMerchantDomain: Boolean(merchantDomain),
      hasSecret: Boolean(merchantSecret),
    })
    throw new Error('WAYFORPAY_CREDENTIALS_MISSING')
  }

  const payRefTag = options?.orderRefTag?.trim() ? `_${options.orderRefTag.trim()}` : ''
  const payRef = `${productId}_${planId}_${userId}_${Date.now()}${payRefTag}`
  const checkoutAmount = typeof options?.amountOverride === 'number' && Number.isFinite(options.amountOverride)
    ? options.amountOverride
    : plan.amount
  const payment = buildPaymentRequest({
    userId,
    productId,
    amount: checkoutAmount,
    currency: 'UAH',
    payRef,
    product_name: [productId === 'focus' ? 'FOCUS' : 'ABSystem AI'],
    product_count: [1],
    product_price: [checkoutAmount],
  })

  const backendBase = getBackendBaseUrl()
  const frontendBaseUrl = getFrontendBaseUrl()
  payment.returnUrl = buildWayForPayReturnUrl(backendBase, frontendBaseUrl)
  const isProduction = process.env.NODE_ENV === 'production'
  if (
    isProduction &&
    (backendBase.includes('127.0.0.1') || backendBase.includes('localhost'))
  ) {
    console.error(
      '[WAYFORPAY_CHECKOUT] ❌ Backend base URL is localhost in production:',
      backendBase
    )
    throw new Error('WAYFORPAY_INVALID_BACKEND_URL')
  }

  const checkoutUrl = await buildShortWayForPayCheckoutUrl(backendBase, payment, {
    product: productId,
    plan: planId,
  })

  console.log('[WAYFORPAY_CHECKOUT] ✅ Checkout URL built', {
    productId,
    planId,
    payRef,
    amount: checkoutAmount,
    currency: 'UAH',
    hasReturnUrl: Boolean(frontendBaseUrl),
    hasServiceUrl: Boolean(process.env.WAYFORPAY_CALLBACK_URL?.trim()),
    checkoutUrlPrefix: checkoutUrl.slice(0, 80),
  })

  console.log('[DYNAMIC CHECKOUT]', {
    userId,
    planId,
    generatedOrderReference: payRef,
    generatedCheckoutUrl: checkoutUrl,
  })

  return {
    checkoutUrl,
    orderReference: payRef,
  }
}

export function buildAbsystemAiUpgradeCheckoutUrl(userId: string) {
  return buildEcosystemPaymentCheckoutUrl(
    'absystem_ai',
    '1month_upgrade',
    userId
  )
}
