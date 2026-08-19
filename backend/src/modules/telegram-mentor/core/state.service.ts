import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { resolveUserLifecycle } from '../../flow-control/service.js'
import { findLinkedUserId } from '../services/identity/linking.js'
import type { UserLifecycleSnapshot } from '../../flow-control/types.js'

export type UserState =
  | 'LEAD_MAGNET'
  | 'WAITLIST'
  | 'ONBOARDING'
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAUSED'

type LinkedUserState = {
  userId?: string | null
  userIdResolved?: boolean
  userIdResolutionError?: 'linked_user_resolution_failed' | null
}

const linkedUserResolutionCache = new WeakMap<Context, Promise<string | null>>()

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
  const cached = linkedUserResolutionCache.get(ctx)
  if (cached) {
    return cached
  }

  const resolver = (async () => {
    const chatId = ctx.chat?.id ? String(ctx.chat.id) : null
    const telegramUserId = ctx.from?.id ? String(ctx.from.id) : chatId
    const telegramUserName = ctx.from?.username ?? null

    if (!chatId || !telegramUserId) {
      return null
    }

    const resolvedUserId = await findLinkedUserId({
      chatId,
      telegramUserId,
      telegramUserName,
    }).catch((error) => {
      const state = ctx.state as LinkedUserState
      state.userId = null
      state.userIdResolved = true
      state.userIdResolutionError = 'linked_user_resolution_failed'
      console.warn('[telegram/state] linked user resolution failed, fallback to anonymous context', {
        chatId,
        telegramUserId,
        telegramUserName,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    })
    const state = ctx.state as LinkedUserState
    state.userId = resolvedUserId
    state.userIdResolved = true
    state.userIdResolutionError = null
    return resolvedUserId
  })()

  linkedUserResolutionCache.set(ctx, resolver)
  return resolver
}

export async function resolveUserState(userId: string): Promise<UserState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentState: true,
      currentStep: true,
    },
  })

  if (isWaitlistFlag(user?.currentState) || isWaitlistFlag(user?.currentStep)) {
    return 'WAITLIST'
  }

  const snapshot = await resolveUserLifecycle(userId)
  return resolveUserStateFromSnapshot({
    currentState: user?.currentState ?? null,
    currentStep: user?.currentStep ?? null,
    lifecycle: snapshot,
  })
}

export function resolveUserStateFromSnapshot(input: {
  currentState: string | null | undefined
  currentStep: string | null | undefined
  lifecycle: UserLifecycleSnapshot
}): UserState {
  if (isWaitlistFlag(input.currentState) || isWaitlistFlag(input.currentStep)) {
    return 'WAITLIST'
  }

  const snapshot = input.lifecycle
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

export async function isExplicitWaitlistUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentState: true,
      currentStep: true,
    },
  })

  if (!user) {
    return false
  }

  return isWaitlistFlag(user.currentState) || isWaitlistFlag(user.currentStep)
}
