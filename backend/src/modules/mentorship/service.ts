// backend/src/modules/mentorship/service.ts
/**
 * Mentorship Service
 */

import { prisma } from '@/db/client.js';
import { MentorshipStatus, Mentorship, MentorshipOffer } from './types.js';

/**
 * Check if user qualifies for mentorship (30+ days stability)
 */
export async function checkMentorshipEligibility(userId: string): Promise<boolean> {
  const streak = await prisma.streak.findUnique({
    where: { userId },
    select: { stabilityDays: true },
  });

  return (streak?.stabilityDays || 0) >= 30;
}

/**
 * Create mentorship offer
 */
export async function createMentorshipOffer(
  userId: string,
  reason: string,
  stabilityDays: number
): Promise<MentorshipOffer> {
  const offer = await prisma.mentorshipOffer.create({
    data: {
      userId,
      reason,
      stabilityDays,
      createdAt: new Date(),
    },
  });

  return offer as MentorshipOffer;
}

/**
 * Activate mentorship
 * Статус при активації ставимо 'accepted' (бо 'ACTIVE' немає)
 */
export async function activateMentorship(
  userId: string,
  mentorId: string
): Promise<Mentorship> {
  const mentorship = await prisma.mentorship.create({
    data: {
      userId,
      mentorId,
      status: 'accepted', // тут тільки допустимі статуси
      startedAt: new Date(),
      createdAt: new Date(),
    },
  });

  return mentorship as Mentorship;
}

/**
 * Get user's mentorship
 */
export async function getMentorship(userId: string): Promise<Mentorship | null> {
  const mentorship = await prisma.mentorship.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return mentorship as Mentorship | null;
}

/**
 * Get mentorship offer
 */
export async function getMentorshipOffer(userId: string): Promise<MentorshipOffer | null> {
  const offer = await prisma.mentorshipOffer.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return offer as MentorshipOffer | null;
}

/**
 * Update mentorship status
 */
export async function updateMentorshipStatus(
  id: string,
  status: MentorshipStatus,
  notes?: string
): Promise<Mentorship> {
  const mentorship = await prisma.mentorship.update({
    where: { id },
    data: {
      status,
      notes,
      ...(status === 'completed' && { endsAt: new Date() }),
    },
  });

  return mentorship as Mentorship;
}
