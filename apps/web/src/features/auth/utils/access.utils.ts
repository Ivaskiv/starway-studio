// frontend/src/shared/utils/access.utils.ts
// ═══════════════════════════════════════════════════════════════
//  Єдине місце для перевірки доступу.
//  hasAccess + getSubscriptionStatus перенесено сюди з @/config/menu
//  (menu.ts не є правильним місцем для runtime-логіки доступу)
// ═══════════════════════════════════════════════════════════════

import type { User }    from '@/features/user/types/user.types'
import type { Ability } from '@/features/auth/permissions/abilities'

// ── Платний доступ ─────────────────────────────────────────────
export const hasPaidAccess = (subject: User | null | undefined): boolean => {
  if (!subject) return false
  return (
    subject.access?.isPaid === true ||
    subject.subscriptionStatus === 'active' ||
    subject.role === 'SUPERADMIN' ||
    subject.role === 'ADMIN'
  )
}

// ── Trial ──────────────────────────────────────────────────────
export const isTrialAccess = (subject: User | null | undefined): boolean => {
  if (!subject) return false
  return subject.access?.isTrial === true || subject.access?.plan === 'trial'
}

export const isTrialUser = isTrialAccess   // alias для зворотної сумісності

// ── Роль ───────────────────────────────────────────────────────
export const hasRole = (
  subject: User | null | undefined,
  role: User['role'],
): boolean => {
  if (!subject) return false
  return subject.role === role
}

// ── Ability — FIX: ability param як Ability, не string ─────────
export const hasAbility = (
  subject:  User | null | undefined,
  ability:  Ability,
): boolean => {
  if (!subject) return false
  return subject.abilities?.includes(ability) ?? false
}

// ── MenuItem access-check (перенесено з menu.ts) ───────────────
export interface AccessibleItem {
  requiresPaid?: boolean
  requiresRole?: User['role']
  requiresAbility?: Ability
}

export const hasAccess = (
  item:    AccessibleItem,
  subject: User | null | undefined,
): boolean => {
  if (!subject) return false
  if (item.requiresPaid    && !hasPaidAccess(subject))              return false
  if (item.requiresRole    && !hasRole(subject, item.requiresRole)) return false
  if (item.requiresAbility && !hasAbility(subject, item.requiresAbility)) return false
  return true
}

// ── Trial days left (перенесено з menu.ts getSubscriptionStatus) ─
export interface SubscriptionStatus {
  isPaid:    boolean
  isTrial:   boolean
  daysLeft:  number | null
  plan:      string
}

export const getSubscriptionStatus = (
  subject: User | null | undefined,
): SubscriptionStatus | null => {
  if (!subject) return null

  const isPaid  = hasPaidAccess(subject)
  const isTrial = isTrialAccess(subject)

  let daysLeft: number | null = null
  if (isTrial && subject.access?.trialEnd) {
    const diff = new Date(subject.access.trialEnd).getTime() - Date.now()
    daysLeft   = Math.max(0, Math.ceil(diff / 86_400_000))
  }

  return {
    isPaid,
    isTrial,
    daysLeft,
    plan: subject.access?.plan ?? 'free',
  }
}