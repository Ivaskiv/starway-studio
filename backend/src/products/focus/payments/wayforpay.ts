import { prisma } from '../../../db/client.js'
import { invalidateFunnelStage } from '../../../lib/funnel/getUserFunnelStage.js'
import {
  buildEcosystemPaymentCheckoutUrl,
  simulateFocusActivation,
  type EcosystemPaymentPlanId,
} from '../../../modules/subscriptions/payments/business/service.js'
import { syncLifecycleForUser } from '../../../modules/flow-control/service.js'
import { CheckoutSession, ProductPaymentProvider } from './payment.provider.js'

export const FocusWayForPayProvider: ProductPaymentProvider = {
  productId: 'focus',

  async createCheckout(
    userId: string,
    planId: EcosystemPaymentPlanId
  ): Promise<CheckoutSession> {
    // Використовуємо існуючу логіку побудови URL
    const checkoutUrl = await buildEcosystemPaymentCheckoutUrl(
      'focus',
      planId,
      userId
    )

    // Витягуємо payRef з URL (або генеруємо такий самий)
    const payRef = `focus_${planId}_${userId}_${Date.now()}`

    return { checkoutUrl, payRef }
  },

  async onPaymentSuccess(
    userId: string,
    planId: EcosystemPaymentPlanId
  ): Promise<void> {
    console.log(
      `🎯 [FOCUS:PAYMENT] Activating focus for user ${userId} with plan ${planId}`
    )

    // 1. Оновлюємо unified runtime state (без legacy lifecycleState)
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentState: 'ACTIVE',
        funnelStage: 'PAID',
      },
    })
    await syncLifecycleForUser(userId)
    await invalidateFunnelStage(userId)

    // 2. Симулюємо активацію (підготовка Zoom, чати тощо)
    // Ця функція вже є в business.ts і вона "працювала у focus"
    simulateFocusActivation(userId, {
      nextZoomAt: process.env.NEXT_ZOOM_AT,
    })
  },
}
