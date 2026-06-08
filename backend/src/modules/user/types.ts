import type { SafeUser, UserRole, UserWithSub } from '../../types/globalTypes.js'
import { computeAvailableRoles, resolveActiveRole } from '../auth/roleUtils.js'
import { normalizeSubscriptionPlan, normalizeSubscriptionStatus } from '../subscriptions/utils.js'

export type { UserRole }
export function toSafeUser(user: UserWithSub): SafeUser {
  const role = user.role
  const availableRoles = computeAvailableRoles({ role })
  const activeRole = resolveActiveRole(user.activeRole ?? role, availableRoles)

  return {
    id: user.id,
    phone: user.phone ?? null,
    email: user.email,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
    firstName: user.firstName,
    lastName: user.lastName,
    telegramUserId: user.telegramUserId,
    telegramUserName: user.telegramUserName,
    telegramChatId: user.telegramChatId,
    role,
    activeRole,
    availableRoles,
    isAdmin: role === 'ADMIN' || role === 'SUPERADMIN',
    isSuperAdmin: role === 'SUPERADMIN',
    abilities: [],
    access: {
      plan: 'free',
      isPaid: false,
      isTrial: false,
      trialEnd: null,
    },
    stats: {
      totalPoints: user.userProgress?.totalPoints ?? 0,
      completedBlocks: user.userProgress?.completedBlocks ?? 0,
      level: user.userProgress?.level ?? 1,
    },
    settings: {
      accentColor: null,
      theme: null,
      language: null,
    },
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    subscriptionStatus: normalizeSubscriptionStatus(user.subscription?.status ?? null),
    subscriptionPlan: normalizeSubscriptionPlan(user.subscription?.planCode ?? null),
    trialEndsAt: user.subscription?.trialEndsAt?.toISOString() ?? null,
    isTrialActive: false,
  }
}
