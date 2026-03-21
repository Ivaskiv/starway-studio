// frontend/src/features/auth/utils/roles.ts
import type { User } from '@/features/user/types/user.types'
import { hasPaidAccess } from '@/features/auth/utils/access.utils'

export function hasContentAccess(content: any, user: User | null): boolean {
  if (!content.isPremium) return true
  if (!user) return false

  // ✅ через user.access — не через subscriptionStatus/trialEndsAt
  return hasPaidAccess(user)
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
