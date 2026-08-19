import { prisma } from '../../../db/client.js'
import { processEcosystemPayment } from '../../../modules/subscriptions/payments/business/processing.js'
import { sendTrialZoomPaymentSuccessTelegramMessage } from '../../../modules/subscriptions/payments/callback/notifications.js'

export async function resolvePaymentAdminTarget(rawCallbackData: string): Promise<{
  userId: string
  orderReference: string | null
  productCode: string | null
  amount: number
  currency: string
} | null> {
  const parts = rawCallbackData.split(':')
  const firstPayloadPart = parts[2] ?? ''
  const secondPayloadPart = parts[3] ?? ''

  if (!firstPayloadPart || firstPayloadPart === 'missing_checkout_token') {
    return null
  }

  if (secondPayloadPart) {
    const legacyCheckout = await prisma.checkoutSession.findFirst({
      where: {
        userId: firstPayloadPart,
        orderReference: secondPayloadPart,
      },
      select: {
        userId: true,
        orderReference: true,
        productCode: true,
        amount: true,
        currency: true,
      },
    })

    return (
      legacyCheckout ?? {
        userId: firstPayloadPart,
        orderReference: secondPayloadPart,
        productCode: null,
        amount: 0,
        currency: 'UAH',
      }
    )
  }

  return prisma.checkoutSession.findUnique({
    where: { token: firstPayloadPart },
    select: {
      userId: true,
      orderReference: true,
      productCode: true,
      amount: true,
      currency: true,
    },
  })
}

export async function activateTrialZoomFromValidatedPayment(input: {
  userId: string
  orderReference: string
  amount: number
  currency: string
}): Promise<{ success: boolean; alreadyActive: boolean; message: string }> {
  const payment = await prisma.paymentLog.findUnique({
    where: { orderReference: input.orderReference },
    select: { id: true, status: true },
  })

  if (!payment || payment.status !== 'SUCCESS') {
    return {
      success: false,
      alreadyActive: false,
      message: 'PAYMENT_EVIDENCE_NOT_VALIDATED',
    }
  }

  const existingTrial = await prisma.productSubscription.findFirst({
    where: {
      userId: input.userId,
      status: 'trial',
      trialEndsAt: { gt: new Date() },
      product: {
        is: {
          code: { equals: 'trial_zoom', mode: 'insensitive' },
        },
      },
    },
    select: { id: true },
  })

  if (existingTrial) {
    return {
      success: true,
      alreadyActive: true,
      message: 'TRIAL_ALREADY_ACTIVE',
    }
  }

  const result = await processEcosystemPayment(
    'trial_zoom',
    'single',
    input.userId,
    {
      amount: input.amount,
      currency: input.currency,
      payRef: input.orderReference,
      orderReference: input.orderReference,
    }
  )

  if (result.status !== 'approved') {
    return {
      success: false,
      alreadyActive: false,
      message: result.reason ?? 'TRIAL_ZOOM_ACTIVATION_FAILED',
    }
  }

  await sendTrialZoomPaymentSuccessTelegramMessage({
    userId: input.userId,
    orderReference: input.orderReference,
  }).catch(() => undefined)

  return {
    success: true,
    alreadyActive: false,
    message: 'TRIAL_ZOOM_ACTIVATED',
  }
}
