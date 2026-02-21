// features/ai-mentor/hooks/useMentorAccess.ts
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';

const DEV_BYPASS = import.meta.env.DEV;

export type MentorAccessLevel = 'none' | 'trial' | 'paid';

export interface MentorAccess {
  level: MentorAccessLevel;
  isPaid: boolean;
  isTrial: boolean;
  trialDaysRemaining: number;
  canAccessAll: boolean;
}

export function useMentorAccess(): MentorAccess {
  const user = useSelector((state: RootState) => state.auth.user);

  // =========================
  // DEV MODE — бачиш ВСЕ
  // =========================
  if (DEV_BYPASS) {
    return {
      level: 'paid',
      isPaid: true,
      isTrial: false,
      trialDaysRemaining: 999,
      canAccessAll: true,
    };
  }

  if (!user?.subscription) {
    return {
      level: 'none',
      isPaid: false,
      isTrial: false,
      trialDaysRemaining: 0,
      canAccessAll: false,
    };
  }

  const { plan } = user.subscription;

  // =========================
  // PAID
  // =========================
  if (plan === 'pro' || plan === 'enterprise') {
    return {
      level: 'paid',
      isPaid: true,
      isTrial: false,
      trialDaysRemaining: 0,
      canAccessAll: true,
    };
  }

  // =========================
  // TRIAL (basic)
  // =========================
  if (plan === 'basic') {
    return {
      level: 'trial',
      isPaid: false,
      isTrial: true,
      trialDaysRemaining: 7, // або з backend
      canAccessAll: false,
    };
  }

  // =========================
  // FREE
  // =========================
  return {
    level: 'none',
    isPaid: false,
    isTrial: false,
    trialDaysRemaining: 0,
    canAccessAll: false,
  };
}
