import { CTAType } from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'

export async function recordTelegramCtaInteraction(userId: string, callbackData: string): Promise<void> {
  const normalized = String(callbackData ?? '').trim()
  if (!userId || !normalized) {
    return
  }

  const existing = await prisma.ctaInteraction.findFirst({
    where: {
      userId,
      type: CTAType.TELEGRAM,
      moduleId: normalized,
    },
    select: { id: true },
  })

  if (existing) {
    return
  }

  await prisma.ctaInteraction.create({
    data: {
      userId,
      type: CTAType.TELEGRAM,
      moduleId: normalized,
    },
  }).catch(() => undefined)
}

export async function hasTelegramCtaInteraction(userId: string, callbackData: string): Promise<boolean> {
  const normalized = String(callbackData ?? '').trim()
  if (!userId || !normalized) {
    return false
  }

  const found = await prisma.ctaInteraction.findFirst({
    where: {
      userId,
      type: CTAType.TELEGRAM,
      moduleId: normalized,
    },
    select: { id: true },
  })

  return Boolean(found)
}
