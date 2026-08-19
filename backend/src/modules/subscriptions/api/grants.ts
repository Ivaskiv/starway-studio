import type { Response } from "express"
import { prisma } from "../../../db/client.js"
import type { AuthenticatedRequest } from "../../../types/globalTypes.js"
import { invalidateFunnelStage } from "../../../lib/funnel/getUserFunnelStage.js"
import { getTelegramProductContext } from "@/content/telegram.product-context.js"
import { syncLifecycleForUser } from "../../flow-control/service.js"
import { resolveTelegramProductSummary } from "../../telegram-mentor/services/product/summary.js"

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
