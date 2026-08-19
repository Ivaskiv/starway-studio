// backend/src/modules/auth/roleUtils.ts
import type { UserRole } from '../../../types/globalTypes.js'

// Role hierarchy — higher index = more privileged
const ROLE_ORDER: UserRole[] = ['USER', 'MENTOR', 'EXPERT', 'ADMIN', 'SUPERADMIN']

// Which roles a given primary role can switch to (descending hierarchy slice + USER always included)
export function computeAvailableRoles(input: {
  role: UserRole
  productAccessRoles?: string[]
}): UserRole[] {
  const available = new Set<UserRole>(['USER'])
  available.add(input.role)

  // Include all roles at or below the primary role in hierarchy
  const idx = ROLE_ORDER.indexOf(input.role)
  if (idx > 0) {
    for (let i = 1; i <= idx; i++) {
      available.add(ROLE_ORDER[i]!)
    }
  }

  // Add roles from product accesses
  for (const r of input.productAccessRoles ?? []) {
    if (r === 'ADMIN') available.add('ADMIN')
    if (r === 'EXPERT') available.add('EXPERT')
  }

  // Return in stable order matching ROLE_ORDER
  return ROLE_ORDER.filter(r => available.has(r))
}

// Validate that a requested activeRole is within the user's available roles
export function isRoleAvailable(
  requestedRole: string,
  availableRoles: UserRole[],
): requestedRole is UserRole {
  return (availableRoles as string[]).includes(requestedRole)
}

// Safe fallback: if stored activeRole is not in availableRoles, return primary role
export function resolveActiveRole(
  storedActiveRole: UserRole,
  availableRoles: UserRole[],
): UserRole {
  if (isRoleAvailable(storedActiveRole, availableRoles)) return storedActiveRole
  // Fall back to highest available role
  for (let i = ROLE_ORDER.length - 1; i >= 0; i--) {
    if (availableRoles.includes(ROLE_ORDER[i]!)) return ROLE_ORDER[i]!
  }
  return 'USER'
}
