import type {
  MergeCandidate,
  Tx,
} from './types.js'
import {
  Role } from '@starway/db/prisma-client'

import {  isGuestEmail,
} from './values.js'

export async function getMergeCandidate(tx: Tx, userId: string): Promise<MergeCandidate> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
            firstName: true,
      lastName: true,
      passwordHash: true,
      telegramUserId: true,
      telegramUserName: true,
      telegramChatId: true,
      telegramLinkedAt: true,
      currentState: true,
      currentStep: true,
            onboardingStartedAt: true,
      trialStartsAt: true,
      trialEndsAt: true,
            settings: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }

  return user
}

export async function findUserByEmailTx(tx: Tx, email: string): Promise<{ id: string; email: string | null } | null> {
  return tx.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  })
}

export function canAutoMerge(target: MergeCandidate, source: MergeCandidate): boolean {
  if (target.id === source.id) return false

  const guestInvolved = isGuestEmail(target.email) || isGuestEmail(source.email)
  if (!guestInvolved) return false

  const allowedRoles = new Set<Role>([Role.USER])
  if (allowedRoles.has(target.role) && allowedRoles.has(source.role)) {
    return true
  }

  // FIX 2025-05-25 C1: allow guest identity merge into established account roles.
  // Used when Telegram guest later provides email of an existing account.
  const privilegedRoles = new Set<Role>([Role.ADMIN, Role.SUPERADMIN])
  const targetIsGuest = isGuestEmail(target.email)
  const sourceIsGuest = isGuestEmail(source.email)
  if (targetIsGuest && privilegedRoles.has(source.role)) {
    return true
  }
  if (sourceIsGuest && privilegedRoles.has(target.role)) {
    return true
  }

  return false
}
