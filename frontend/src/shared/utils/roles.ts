// frontend/src/shared/utils/roles.ts
import type { User } from '@/features/user/types/user.types'

export function hasContentAccess(content: any, user: User | null): boolean {
  if (!content.isPremium) return true
  if (!user) return false

  // ✅ через user.access — не через subscriptionStatus/trialEndsAt
  return user.access.isPaid || user.access.isTrial
}

export function filterContentByAccess(content: any[], user: User | null) {
  return content.map(c => ({
    ...c,
    locked: !hasContentAccess(c, user),
  }))
}

export function isContentOwner(contentCreatorId: string, user: User | null): boolean {
  if (!user) return false
  return contentCreatorId === user.id || user.isAdmin || user.isSuperAdmin
}