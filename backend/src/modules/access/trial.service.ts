import { prisma } from '../../db/client.js'
import type { Prisma } from '@starway/db/prisma-client'
import type { AccessUserSnapshot } from './snapshot.service.js'

export function hasActiveAbsystemAiEntitlement(
  user: Pick<
    AccessUserSnapshot,
    'absystemAiActive' | 'absystemTrialExpiresAt'
  >,
  now: Date,
) {
  return user.absystemAiActive || (
    !!user.absystemTrialExpiresAt &&
    user.absystemTrialExpiresAt > now
  )
}

export type AbsystemTrialActivationResult =
  | 'ACTIVATED'
  | 'ALREADY_ACTIVE'
  | 'PAID_ACCESS_EXISTS'
  | 'NO_CHANGE'
  | 'USER_NOT_FOUND'

export const LEGACY_FOCUS_GIFT_MANUAL_NOTE = 'Legacy Gift Focus until 20.07.2027'

function addAbsystemTrialDays(attendedAt: Date) {
  return new Date(attendedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
}

export async function resolveLegacyGiftFocus(params: {
  userId: string
  now?: Date
  tx?: Prisma.TransactionClient
}): Promise<{
  isLegacyGift: boolean
  focusExpiresAt: Date | null
}> {
  const { userId, tx } = params
  const now = params.now ?? new Date()
  const db = tx ?? prisma

  const focusSubscription = await db.productSubscription.findFirst({
    where: {
      userId,
      product: {
        code: { equals: 'focus', mode: 'insensitive' },
      },
      status: { in: ['active', 'paid', 'trial'] },
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: now } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      expiresAt: true,
      manuallyGrantedBy: true,
      manualGrantNote: true,
    },
  })

  return {
    isLegacyGift: focusSubscription?.manuallyGrantedBy === 'admin_manual'
      && focusSubscription?.manualGrantNote === LEGACY_FOCUS_GIFT_MANUAL_NOTE
      && !!focusSubscription.expiresAt,
    focusExpiresAt: focusSubscription?.expiresAt ?? null,
  }
}

export async function activateAbsystemTrialAfterFirstZoom(params: {
  userId: string
  attendedAt: Date
  tx?: Prisma.TransactionClient
}): Promise<{
  status: AbsystemTrialActivationResult
  startsAt: Date
  expiresAt: Date
}> {
  const { userId, attendedAt, tx } = params
  const db = tx ?? prisma
  const expiresAt = addAbsystemTrialDays(attendedAt)
  const now = new Date()

  const [user, activePaidSubscription] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        absystemAiActive: true,
        absystemTrialExpiresAt: true,
        absystemGrantSource: true,
      },
    }),
    db.productSubscription.findFirst({
      where: {
        userId,
        product: {
          code: { in: ['absystem_ai', 'absystem'] },
        },
        status: { in: ['active', 'paid'] },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      select: {
        id: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  if (!user) {
    return {
      status: 'USER_NOT_FOUND',
      startsAt: attendedAt,
      expiresAt,
    }
  }

  if (activePaidSubscription || user.absystemAiActive) {
    return {
      status: 'PAID_ACCESS_EXISTS',
      startsAt: attendedAt,
      expiresAt,
    }
  }

  if (user.absystemTrialExpiresAt) {
    return {
      status: user.absystemTrialExpiresAt > now ? 'ALREADY_ACTIVE' : 'NO_CHANGE',
      startsAt: attendedAt,
      expiresAt: user.absystemTrialExpiresAt,
    }
  }

  await db.user.update({
    where: { id: userId },
    data: {
      absystemAiActive: false,
      absystemTrialExpiresAt: expiresAt,
      absystemGrantSource: 'post_zoom',
    },
  })

  return {
    status: 'ACTIVATED',
    startsAt: attendedAt,
    expiresAt,
  }
}
