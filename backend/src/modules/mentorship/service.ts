// backend/src/modules/mentorship/service.ts
import { prisma } from '@/db/client.js';
import type { Mentorship, MentorshipOffer } from './types.ts';
import { MentorshipStatus } from '@/db/generated/prisma/client.js';

// ── CREATE MENTORSHIP OFFER ─────────────────────────────────────────────
export async function createMentorshipOffer(
  userId: string,
  expertId: string,
  stabilityDays: number
): Promise<MentorshipOffer> {
  const offer = await prisma.mentorshipOffer.create({
    data: {
      userId,
      expertId,
      status: MentorshipStatus.PENDING,
      offerDetails: { stabilityDays },
    },
  });

  return {
    id: offer.id,
    userId: offer.userId,
    expertId: offer.expertId,
    status: offer.status,
    offerDetails: offer.offerDetails,
    createdAt: offer.createdAt,
  };
}

// ── ACTIVATE MENTORSHIP ────────────────────────────────────────────────
export async function activateMentorship(userId: string): Promise<Mentorship> {
  const mentorship = await prisma.mentorship.findFirst({
    where: { userId, status: MentorshipStatus.PENDING },
  });

  if (!mentorship) throw new Error('No pending mentorship found');

  const updated = await prisma.mentorship.update({
    where: { id: mentorship.id },
    data: { status: MentorshipStatus.ACTIVE, startsAt: new Date() },
  });

  return {
    id: updated.id,
    userId: updated.userId,
    mentorId: updated.mentorId,
    status: updated.status,
    startsAt: updated.startsAt,
  };
}

// ── CHECK ELIGIBILITY ─────────────────────────────────────────────────
export async function checkMentorshipEligibility(userId: string): Promise<boolean> {
  const activeMentorship = await prisma.mentorship.findFirst({
    where: { userId, status: MentorshipStatus.ACTIVE },
  });
  return !activeMentorship;
}

// ── GET MY MENTORSHIP ────────────────────────────────────────────────
export async function getMentorship(userId: string): Promise<Mentorship | null> {
  const mentorship = await prisma.mentorship.findFirst({ where: { userId } });
  if (!mentorship) return null;

  return {
    id: mentorship.id,
    userId: mentorship.userId,
    mentorId: mentorship.mentorId,
    status: mentorship.status,
    startsAt: mentorship.startsAt,
  };
}

// ── GET MY OFFER ─────────────────────────────────────────────────────
export async function getMentorshipOffer(userId: string): Promise<MentorshipOffer | null> {
  const offer = await prisma.mentorshipOffer.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  if (!offer) return null;

  return {
    id: offer.id,
    userId: offer.userId,
    expertId: offer.expertId,
    status: offer.status,
    offerDetails: offer.offerDetails,
    createdAt: offer.createdAt,
  };
}

// ── UPDATE MENTORSHIP STATUS ─────────────────────────────────────────
export async function updateMentorshipStatus(
  id: string,
  status: MentorshipStatus
): Promise<Mentorship> {
  const updated = await prisma.mentorship.update({
    where: { id },
    data: { status },
  });

  return {
    id: updated.id,
    userId: updated.userId,
    mentorId: updated.mentorId,
    status: updated.status,
    startsAt: updated.startsAt,
  };
}