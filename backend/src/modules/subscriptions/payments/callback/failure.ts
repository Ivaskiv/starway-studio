import { prisma } from '../../../../db/client.js'
import { coachBot } from '../../../../lib/telegram.js'
import { trackEvent } from '../../../events/service.js'
import { buildEcosystemPaymentCheckoutUrl } from '../business/service.js'
import { sendPaymentFailedTelegramMessage } from './notifications.js'
import { alertCoachAboutPaymentIssue } from '../coach-alert.js'
import type { PaymentCallbackData } from '../../types.js'
import { extractUserIdFromOrderRef } from './focus-onboarding.js'
import type { resolveWebhookPaymentTarget } from './targets.js'

type ReturnTypeResolveWebhookTarget = ReturnType<typeof resolveWebhookPaymentTarget>

export async function handleFailedPayment(input: {
  data: PaymentCallbackData
  target: ReturnTypeResolveWebhookTarget
  requestFingerprint: string
}): Promise<boolean> {
  const { data, target, requestFingerprint } = input

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
          return true
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

      return true
    }

  return false
}
