import type { SafeUser, UserRole, UserWithSub } from '@/types/globalTypes.js'

export type { UserRole }
export function toSafeUser(user: UserWithSub): SafeUser {
  const role = user.role

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    role,
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
    subscriptionStatus: user.subscription?.status ?? 'NONE',
    subscriptionPlan: user.subscription?.planCode ?? 'free',
    trialEndsAt: user.subscription?.trialEndsAt?.toISOString() ?? null,
    isTrialActive: false,
  }
}
