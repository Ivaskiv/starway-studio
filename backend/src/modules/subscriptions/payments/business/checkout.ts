import type { EcosystemPaymentPlanId, EcosystemPaymentProduct, EcosystemPaymentCheckoutSession } from './types.js'
import { prisma } from '../../../../db/client.js'
import { buildPaymentRequest, readWayForPayCredentials } from '../wayforpay/service.js'
import { buildShortWayForPayCheckoutUrl, buildShortWayForPayCheckoutUrlSync } from '../wayforpay/checkout.js'
import { resolveEcosystemPaymentPlan } from './catalog.js'

type CheckoutEntrySource = 'web' | 'telegram'
type CheckoutEntryOptions = {
  source?: CheckoutEntrySource
  targetPath?: string
}

function normalizeCheckoutEntryOptions(
  input: CheckoutEntryOptions | CheckoutEntrySource | undefined,
): Required<Pick<CheckoutEntryOptions, 'source'>> & Pick<CheckoutEntryOptions, 'targetPath'> {
  if (typeof input === 'string') {
    return { source: input }
  }

  return {
    source: input?.source ?? 'web',
    targetPath: input?.targetPath,
  }
}

function resolveDevelopmentPaymentAmount(
  productId: EcosystemPaymentProduct,
  planId: EcosystemPaymentPlanId,
  originalAmount: number
) {
  if (process.env.NODE_ENV !== 'development') {
    return originalAmount
  }

  const shouldOverride =
    (productId === 'focus' && (planId === '1month' || planId === '3month' || planId === '1year')) ||
    (productId === 'trial_zoom' && planId === 'single') ||
    (productId === 'absystem_ai' &&
      (planId === '1month' || planId === '6month' || planId === '1year'))

  if (!shouldOverride) {
    return originalAmount
  }

  console.log('[DEV PAYMENT MODE]')
  console.log(`Original amount: ${originalAmount}`)
  console.log('Sandbox amount: 1 UAH')

  return 1
}

function resolveProductLabel(productId: EcosystemPaymentProduct): string {
  if (productId === 'focus') return 'FOCUS'
  if (productId === 'trial_zoom') return 'Пробний Zoom'
  return 'ABSystem AI'
}

async function assertTrialZoomPurchaseAvailable(userId: string): Promise<void> {
  const [existingSubscription, existingPayment] = await Promise.all([
    prisma.productSubscription.findFirst({
      where: {
        userId,
        product: {
          code: { equals: 'trial_zoom', mode: 'insensitive' },
        },
      },
      select: { id: true },
    }),
    prisma.paymentLog.findFirst({
      where: {
        userId,
        OR: [
          { orderReference: { startsWith: 'trial_zoom_single_' } },
          { metadata: { path: ['productId'], equals: 'trial_zoom' } },
        ],
      },
      select: { id: true },
    }),
  ])

  if (existingSubscription || existingPayment) {
    throw new Error('TRIAL_ZOOM_ALREADY_USED')
  }
}

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

export function buildWayForPayReturnUrl(
  backendBaseUrl: string,
  frontendBaseUrl?: string,
  source: CheckoutEntrySource = 'web',
  targetPath?: string
): string {
  const safeBackend = backendBaseUrl.replace(/\/$/, '')
  if (source === 'telegram') {
    return `${safeBackend}/api/subscriptions/payments/wayforpay/return?source=telegram`
  }
  const target = (frontendBaseUrl ?? '').replace(/\/$/, '')
  if (target) {
    const resolvedTarget =
      targetPath && targetPath.trim()
        ? `${target}${targetPath.startsWith('/') ? targetPath : `/${targetPath}`}`
        : `${target}/miniapp?startapp=billing-success`
    return `${safeBackend}/api/subscriptions/payments/wayforpay/return?target=${encodeURIComponent(
      resolvedTarget
    )}`
  }
  return `${safeBackend}/api/subscriptions/payments/wayforpay/return`
}

export function buildEcosystemPaymentCheckoutUrl(
  productId: EcosystemPaymentProduct,
  planId: EcosystemPaymentPlanId,
  userId: string,
  options: CheckoutEntryOptions | CheckoutEntrySource = {}
) {
  const normalizedOptions = normalizeCheckoutEntryOptions(options)
  const source = normalizedOptions.source
  const plan = resolveEcosystemPaymentPlan(productId, planId)
  if (!plan) {
    throw new Error('invalid_ecosystem_plan')
  }
  const payRef = `${productId}_${planId}_${userId}_${Date.now()}`
  const checkoutAmount = resolveDevelopmentPaymentAmount(
    productId,
    planId,
    plan.amount
  )
  const payment = buildPaymentRequest({
    userId,
    productId,
    amount: checkoutAmount,
    currency: 'UAH',
    payRef,
    product_name: [resolveProductLabel(productId)],
    product_count: [1],
    product_price: [checkoutAmount],
  })
  payment.returnUrl = buildWayForPayReturnUrl(
    getBackendBaseUrl(),
    getFrontendBaseUrl(),
    source,
    normalizedOptions.targetPath,
  )
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
  options: CheckoutEntryOptions | CheckoutEntrySource = {}
): Promise<EcosystemPaymentCheckoutSession> {
  const normalizedOptions = normalizeCheckoutEntryOptions(options)
  const source = normalizedOptions.source
  const plan = resolveEcosystemPaymentPlan(productId, planId)
  if (!plan) {
    throw new Error('invalid_ecosystem_plan')
  }

  if (productId === 'trial_zoom') {
    await assertTrialZoomPurchaseAvailable(userId)
  }

  const { merchantAccount, merchantDomain, merchantSecret } = readWayForPayCredentials()

  if (!merchantAccount || !merchantDomain || !merchantSecret) {
    console.error('[WAYFORPAY_CHECKOUT] ❌ Missing WayForPay credentials', {
      hasMerchantAccount: Boolean(merchantAccount),
      hasMerchantDomain: Boolean(merchantDomain),
      hasSecret: Boolean(merchantSecret),
    })
    throw new Error('WAYFORPAY_CREDENTIALS_MISSING')
  }

  const payRef = `${productId}_${planId}_${userId}_${Date.now()}`
  const checkoutAmount = resolveDevelopmentPaymentAmount(
    productId,
    planId,
    plan.amount
  )
  const payment = buildPaymentRequest({
    userId,
    productId,
    amount: checkoutAmount,
    currency: 'UAH',
    payRef,
    product_name: [resolveProductLabel(productId)],
    product_count: [1],
    product_price: [checkoutAmount],
  })

  const backendBase = getBackendBaseUrl()
  const frontendBaseUrl = getFrontendBaseUrl()
  payment.returnUrl = buildWayForPayReturnUrl(
    backendBase,
    frontendBaseUrl,
    source,
    normalizedOptions.targetPath,
  )
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
    userId,
    'telegram'
  )
}
