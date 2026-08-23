import { findByAmount } from '@/lib/payments/registry.js'
import { stankeyManifest } from '@/products/stankey/product.manifest.js'
import type { PaymentCallbackData } from '../../types.js'
import { resolveEcosystemPaymentTarget, type EcosystemPaymentPlanId } from '../business/service.js'
import type { ResolvedWebhookTarget } from './types.js'
import { parseStankeyOrderReference } from '../wayforpay/checkout.js'

function parseFocusOrderReference(payRef: string): {
  userId: string | null
  planId: EcosystemPaymentPlanId | null
} | null {
  const match = String(payRef ?? '').trim().match(
    /^focus_(welcome_test|1month|3month|1year)_([0-9a-f-]{36})_\d+$/i,
  )

  if (!match) return null

  return {
    planId: match[1] as EcosystemPaymentPlanId,
    userId: match[2],
  }
}

function parseTrialZoomOrderReference(payRef: string): {
  userId: string | null
  planId: EcosystemPaymentPlanId | null
} | null {
  const match = String(payRef ?? '').trim().match(
    /^trial_zoom_(single)_([0-9a-f-]{36})_\d+$/i,
  )

  if (!match) return null

  return {
    planId: match[1] as EcosystemPaymentPlanId,
    userId: match[2],
  }
}

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
    const parsedFocusReference = parseFocusOrderReference(payRef)
    const focusUserId =
      parsedFocusReference?.userId
      ?? (typeof data.clientAccountId === 'string' ? data.clientAccountId : null)
    const focusTarget =
      parsedFocusReference?.planId
        ? { productId: 'focus' as const, planId: parsedFocusReference.planId }
        : resolveEcosystemPaymentTarget(amount)
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

  if (payRef.startsWith('trial_zoom_')) {
    const parsedTrialReference = parseTrialZoomOrderReference(payRef)
    const trialUserId =
      parsedTrialReference?.userId
      ?? (typeof data.clientAccountId === 'string' ? data.clientAccountId : null)
    const trialPlanId: EcosystemPaymentPlanId =
      parsedTrialReference?.planId ?? 'single'

    return {
      scope: 'ecosystem',
      userId: trialUserId,
      productId: 'trial_zoom',
      planId: trialPlanId,
      amount,
      payRef,
      ecosystemProductId: 'trial_zoom',
      ecosystemPlanId: trialPlanId,
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
