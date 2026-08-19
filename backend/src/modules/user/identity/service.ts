import type {
  MergeReason,
} from './types.js'
import {
  prisma } from '../../../db/client.js'
import { resolveOrCreateUser } from '../resolveOrCreateUser.js'
import { UserCreationSource } from '../userCreation.service.js'

import {
  isGuestEmail,
  normalizeEmail,
} from './values.js'
import {
  canAutoMerge,
  findUserByEmailTx,
  getMergeCandidate,
} from './candidates.js'
import { mergeUsersTx } from './merge.js'

export async function mergeUsersById(
  sourceUserId: string,
  targetUserId: string,
  options: {
    normalizedEmail?: string
    reason: MergeReason
  },
): Promise<{ userId: string; merged: boolean }> {
  return prisma.$transaction(async tx => mergeUsersTx(tx, {
    sourceUserId,
    targetUserId,
    normalizedEmail: options.normalizedEmail,
    reason: options.reason,
  }))
}

export async function attachEmailToUser(
  userId: string,
  rawEmail: string,
): Promise<{ userId: string; merged: boolean }> {
  const email = normalizeEmail(rawEmail)
  if (!email || !email.includes('@')) {
    throw new Error('INVALID_EMAIL')
  }

  return prisma.$transaction(async tx => {
    const current = await getMergeCandidate(tx, userId)
    const existing = await findUserByEmailTx(tx, email)

    if (!existing || existing.id === userId) {
      await tx.user.update({
        where: { id: userId },
        data: { email },
      })
      return { userId, merged: false }
    }

    // FIX 2025-05-25 D1: preserve established email account id when merging with telegram guest.
    const preserveExistingIdentity = isGuestEmail(current.email) && !isGuestEmail(existing.email)
    return mergeUsersTx(tx, {
      sourceUserId: preserveExistingIdentity ? current.id : existing.id,
      targetUserId: preserveExistingIdentity ? existing.id : current.id,
      normalizedEmail: email,
      reason: 'email_attach',
    })
  })
}

export async function resolveOrCreateTelegramGuestUser(params: {
  linkedUserId: string | null
  telegramUserId: string
  telegramUserName: string | null
  chatId: string
  firstName: string
  source?: UserCreationSource
  requestId?: string | null
}): Promise<string> {
  if (params.linkedUserId) {
    return params.linkedUserId
  }

  const resolved = await resolveOrCreateUser(
    {
      telegramId: params.telegramUserId,
      chatId: params.chatId,
      telegramUserName: params.telegramUserName ?? undefined,
    },
    {
      source: params.source ?? UserCreationSource.TELEGRAM_MINIAPP,
      requestId: params.requestId ?? null,
      name: params.firstName,
      createData: {
        telegramLinkedAt: new Date(),
        role: 'USER',
        activeRole: 'USER',
      },
    },
  )

  return resolved.user.id
}

export async function reconcileTelegramIdentityUsers(params: {
  linkedUserId: string
  identityUserId: string
  reason?: 'link_identity_mismatch' | 'start_reconcile'
}): Promise<{ userId: string; merged: boolean }> {
  const { linkedUserId, identityUserId } = params
  if (!linkedUserId || !identityUserId || linkedUserId === identityUserId) {
    return { userId: linkedUserId || identityUserId, merged: false }
  }

  try {
    return await prisma.$transaction(async tx => {
      const linked = await getMergeCandidate(tx, linkedUserId)
      const identity = await getMergeCandidate(tx, identityUserId)

      if (!canAutoMerge(linked, identity)) {
        return { userId: linkedUserId, merged: false }
      }

      // Keep non-guest/established profile as target whenever possible.
      const linkedIsGuest = isGuestEmail(linked.email)
      const identityIsGuest = isGuestEmail(identity.email)
      const targetUserId = linkedIsGuest && !identityIsGuest ? identity.id : linked.id
      const sourceUserId = targetUserId === linked.id ? identity.id : linked.id

      return mergeUsersTx(tx, {
        sourceUserId,
        targetUserId,
        reason: 'telegram_identity',
      })
    })
  } catch (error) {
    console.warn('[USER_DEDUP] reconcile_failed', {
      linkedUserId,
      identityUserId,
      reason: params.reason ?? 'link_identity_mismatch',
      error: error instanceof Error ? error.message : String(error),
    })
    return { userId: linkedUserId, merged: false }
  }
}
