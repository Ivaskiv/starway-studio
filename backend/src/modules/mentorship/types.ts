// backend/src/modules/mentorship/types.ts
/**
 * Mentorship Types - FIXED
 */

// ✅ NO ENUM! Use union type
export type MentorshipStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Mentorship {
  id: string;
  userId: string;
  mentorId: string;
  status: MentorshipStatus;
  startedAt: Date;
  endsAt?: Date;
  notes?: string;
  createdAt: Date;
}

export interface MentorshipOffer {
  id: string;
  userId: string;
  reason: string;
  stabilityDays: number;
  createdAt: Date;
}