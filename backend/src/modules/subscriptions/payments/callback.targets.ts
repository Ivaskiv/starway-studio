import { findByAmount } from '@/lib/payments/registry.js'
import { stankeyManifest } from '@/products/stankey/product.manifest.js'
import type { PaymentCallbackData } from '../types.js'
import { resolveEcosystemPaymentTarget, type EcosystemPaymentPlanId } from './business.js'
import type { ResolvedWebhookTarget } from './callback.types.js'
import { parseStankeyOrderReference } from './wayforpay.checkout.js'

export function resolveWebhookPaymentTarget(
  data: PaymentCallbackData
): ResolvedWebhookTarget | null {
  const stankeyOrder = parseStankeyOrderReference(
    String(data.order_reference ?? '')
  )
  const payRef = String(data.order_reference ?? '').trim()
  const amount = Number(data.amount)

  if (stankeyOrder) {
    return {
      scope: 'stankey',
      userId: stankeyOrder.userId,
      productId: stankeyManifest.productId,
      planId: stankeyOrder.planId,
      amount,
      payRef,
    }
  }

  if (payRef.startsWith('focus_')) {
    const focusUserId =
      typeof data.clientAccountId === 'string' ? data.clientAccountId : null
    const focusTarget = resolveEcosystemPaymentTarget(amount)
    const focusPlanId: EcosystemPaymentPlanId =
      focusTarget?.productId === 'focus'
        ? focusTarget.planId
        : 'welcome_test'
    console.log('[WEBHOOK] focus_ prefix resolved', {
      userId: focusUserId ?? 'NULL — hosted button, no clientAccountId',
      amount,
      planId: focusPlanId,
      payRef,
    })
    return {
      scope: 'ecosystem',
      userId: focusUserId,
      productId: 'focus',
      planId: focusPlanId,
      amount,
      payRef,
      ecosystemProductId: 'focus',
      ecosystemPlanId: focusPlanId,
    }
  }

  if (payRef.startsWith('zoom_swap_')) {
    return {
      scope: 'zoom',
      userId:
        typeof data.clientAccountId === 'string' ? data.clientAccountId : null,
      productId: 'zoom_swap',
      planId: null,
      amount,
      payRef,
    }
  }

  if (payRef.startsWith('battle_entry_99_')) {
    const battleUserIdMatch = payRef.match(/^battle_entry_99_([0-9a-f-]+)_\d+$/i)
    return {
      scope: 'zoom',
      userId:
        typeof data.clientAccountId === 'string'
          ? data.clientAccountId
          : battleUserIdMatch?.[1] ?? null,
      productId: 'battle_entry',
      planId: 'single',
      amount,
      payRef,
    }
  }

  const catalogEntry = findByAmount(amount)
  if (catalogEntry) {
    console.log(`[WayForPay] Catalog match`, {
      paymentKey: catalogEntry.paymentKey,
      amount,
      hasClientAccountId: Boolean(data.clientAccountId),
    })
  } else {
    console.warn(`[WayForPay] No catalog entry for amount`, { amount })
  }

  const ecosystemTarget = resolveEcosystemPaymentTarget(amount)
  if (ecosystemTarget) {
    return {
      scope: 'ecosystem',
      userId:
        typeof data.clientAccountId === 'string' ? data.clientAccountId : null,
      productId: ecosystemTarget.productId,
      planId: ecosystemTarget.planId,
      amount,
      payRef,
      ecosystemProductId: ecosystemTarget.productId,
      ecosystemPlanId: ecosystemTarget.planId,
    }
  }

  // fix with kimi 2026-05-28: removed legacy fallback — unresolvable orderReference must return null, not a guess. PRODUCT_NOT_FOUND guard in callback.handler.ts handles this case.
  console.error('[PAYMENT_TARGET] unresolvable_order_reference', {
    orderReference: data.order_reference,
    productName: data.product_name,
  })
  return null
}
