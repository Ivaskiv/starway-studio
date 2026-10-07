import { prisma } from '../../../../db/client.js'
import { notifyCommercePaid } from '../../../zoom/commerce/zoom.commerce-telegram.js'
import { checkWayForPayTransactionStatus } from '../wayforpay/service.js'
import { processPaymentWebhook } from './processing.js'

/**
 * Recovers a missed commerce callback by first asking WayForPay for the
 * authoritative state, then using the normal verified-payment completion path.
 */
export async function recoverApprovedWayForPayCommercePayment(orderReference: string) {
  const normalizedOrderReference = String(orderReference ?? '').trim()
  if (!/^zoom_commerce_individual_[0-9a-f-]+$/i.test(normalizedOrderReference)) {
    throw new Error('WAYFORPAY_COMMERCE_RECOVERY_ORDER_REFERENCE_INVALID')
  }

  const provider = await checkWayForPayTransactionStatus(normalizedOrderReference)
  const payment = await processPaymentWebhook({
    order_reference: provider.orderReference,
    amount: provider.amount,
    currency: provider.currency,
    transaction_status: provider.transactionStatus,
    ...(provider.clientAccountId ? { clientAccountId: provider.clientAccountId } : {}),
    ...(provider.transactionId ? { transaction_id: provider.transactionId } : {}),
  }, prisma)

  if (payment.scope !== 'zoom' || payment.payRef !== normalizedOrderReference) {
    throw new Error('WAYFORPAY_COMMERCE_RECOVERY_PAYMENT_TARGET_MISMATCH')
  }

  await notifyCommercePaid(normalizedOrderReference)
  return { provider, payment }
}
