/**
 * @file shared/subscription.utils.ts
 *
 * Централізована логіка підписок — єдине джерело правди.
 * Копіюється в:
 *   backend/src/shared/subscription.utils.ts
 *   frontend/src/shared/subscription.utils.ts
 *
 * Або виноситься в спільний пакет monorepo (packages/shared).
 */

// ─────────────────────────────────────────────
// TYPES (не залежать від Prisma/Redux)
// ─────────────────────────────────────────────

export type UserPlan = 'free' | 'trial' | 'paid';

export interface SubscriptionSnapshot {
  /** Статус підписки з БД (рядок, сумісний з Prisma enum) */
  subscriptionStatus: string | null;
  /** Дата закінчення trial (ISO string або Date) */
  trialEndsAt: string | Date | null;
  /** Роль користувача */
  role?: string | null;
}

export interface PlanInfo {
  plan:      UserPlan;
  isPaid:    boolean;
  isTrial:   boolean;
  isFree:    boolean;
  isAdmin:   boolean;
  daysLeft:  number | null;   // null = немає trial
  trialEnd:  Date | null;
  label:     string;          // для UI: "Premium" / "Trial · 5 д" / "Free"
}

// ─────────────────────────────────────────────
// CORE FUNCTION
// ─────────────────────────────────────────────

/**
 * Обчислює план і доступ користувача.
 * Приймає мінімальний snapshot — можна використовувати
 * як на backend (Prisma User), так і на frontend (Redux User).
 *
 * @example
 * // backend
 * const info = resolvePlan(prismaUser);
 *
 * // frontend
 * const info = resolvePlan(reduxUser);
 *
 * // menu.ts
 * export function hasPremiumAccess(user) { return resolvePlan(user).isPaid; }
 */
export function resolvePlan(snapshot: SubscriptionSnapshot | null): PlanInfo {
  const ADMIN_ROLES = ['ADMIN', 'admin', 'super_admin'];

  if (!snapshot) {
    return { plan: 'free', isPaid: false, isTrial: false, isFree: true, isAdmin: false, daysLeft: null, trialEnd: null, label: 'Free' };
  }

  const isAdmin = ADMIN_ROLES.includes(snapshot.role ?? '');

  // Admin завжди має paid-доступ
  if (isAdmin) {
    return { plan: 'paid', isPaid: true, isTrial: false, isFree: false, isAdmin: true, daysLeft: null, trialEnd: null, label: 'Admin' };
  }

  // Paid subscription
  const isPaid = snapshot.subscriptionStatus === 'ACTIVE';
  if (isPaid) {
    return { plan: 'paid', isPaid: true, isTrial: false, isFree: false, isAdmin: false, daysLeft: null, trialEnd: null, label: 'Premium' };
  }

  // Trial
  if (snapshot.trialEndsAt) {
    const trialEnd  = new Date(snapshot.trialEndsAt);
    const now       = new Date();
    const msLeft    = trialEnd.getTime() - now.getTime();
    const daysLeft  = Math.ceil(msLeft / 86_400_000);

    if (daysLeft > 0) {
      return {
        plan:    'trial',
        isPaid:  true,          // trial = має paid-доступ
        isTrial: true,
        isFree:  false,
        isAdmin: false,
        daysLeft,
        trialEnd,
        label: `Trial · ${daysLeft} д`,
      };
    }
  }

  // Free
  return { plan: 'free', isPaid: false, isTrial: false, isFree: true, isAdmin: false, daysLeft: null, trialEnd: null, label: 'Free' };
}

// ─────────────────────────────────────────────
// HELPERS (зручні shortcut-функції)
// ─────────────────────────────────────────────

export const hasPaidAccess    = (s: SubscriptionSnapshot | null) => resolvePlan(s).isPaid;
export const isTrialActive    = (s: SubscriptionSnapshot | null) => resolvePlan(s).isTrial;
export const getPlanLabel     = (s: SubscriptionSnapshot | null) => resolvePlan(s).label;
export const getPlan          = (s: SubscriptionSnapshot | null) => resolvePlan(s).plan;