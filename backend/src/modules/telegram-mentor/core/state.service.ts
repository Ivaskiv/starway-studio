import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { resolveUserLifecycle } from '../../flow-control/service.js'
import { findLinkedUserId } from '../services/linking.service.js'

export type UserState =
  | 'LEAD_MAGNET'
  | 'WAITLIST'
  | 'ONBOARDING'
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAUSED'

function isWaitlistFlag(value: string | null | undefined): boolean {
  const normalized = String(value ?? '').trim().toUpperCase()
  return normalized.includes('WAITLIST') || normalized.includes('EARLY_ACCESS')
}

export function isLockedState(state: UserState) {
  return state === 'LEAD_MAGNET' || state === 'WAITLIST'
}

export function isLeadMagnetPayload(payload: string): boolean {
  return /^[a-f0-9]{24}$/.test(payload)
    || payload.startsWith('sp_')
    || payload.startsWith('lead_')
    || payload.startsWith('tgr_')
}

export async function resolveLinkedUserIdFromContext(ctx: Context): Promise<string | null> {
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : null
  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : chatId
  const telegramUserName = ctx.from?.username ?? null

  if (!chatId || !telegramUserId) {
    return null
  }

  return findLinkedUserId({
    chatId,
    telegramUserId,
    telegramUserName,
  })
}

export async function resolveUserState(userId: string): Promise<UserState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      onboardingStage: true,
      currentStep: true,
    },
  })

  if (isWaitlistFlag(user?.onboardingStage) || isWaitlistFlag(user?.currentStep)) {
    return 'WAITLIST'
  }

  const snapshot = await resolveUserLifecycle(userId)
  switch (snapshot.state) {
    case 'lead_magnet':
      return 'LEAD_MAGNET'
    case 'onboarding':
      return 'ONBOARDING'
    case 'trial':
      return 'TRIAL'
    case 'paid':
      return 'ACTIVE'
    case 'expired':
      return 'PAUSED'
    case 'guest':
    default:
      return 'WAITLIST'
  }
}
