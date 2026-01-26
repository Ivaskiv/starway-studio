// backend/src/services/ai-limits.ts
import type { User } from '../types/user'

const LIMITS = {
  trial: 20,
  free: 10,
  monthly: 300,
  yearly: 5000,
}

export function getDailyLimit(user: User & { plan?: string }) {
  if (user.role === 'super_admin') return Infinity
  return LIMITS[user.plan as keyof typeof LIMITS] ?? 5
}
