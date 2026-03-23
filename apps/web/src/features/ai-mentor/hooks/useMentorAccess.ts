// features/ai-mentor/hooks/useMentorAccess.ts
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api';

export type MentorAccessLevel = 'none' | 'trial' | 'paid';

export interface MentorAccess {
  level: MentorAccessLevel;
  isPaid: boolean;
  isTrial: boolean;
  trialDaysRemaining: number;
  canAccessAll: boolean;
}

export function useMentorAccess(): MentorAccess {
  const { data: trial } = useGetTrialStatusQuery()

  const level: MentorAccessLevel = trial?.isPaid
    ? 'paid'
    : trial?.isActive
      ? 'trial'
      : 'none'

  const daysLeft = trial?.daysLeft ?? 0

  return {
    level,
    isPaid: level === 'paid',
    isTrial: level === 'trial',
    trialDaysRemaining: daysLeft,
    canAccessAll: level !== 'none',
  }
}
