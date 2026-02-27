// backend/src/modules/trial/service.ts
/**
 * Trial Service - COMPLETE
 */

import { prisma } from '@/db/client.js';
import { TrialStatus } from './types.js';

export async function startTrial(userId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      trialStartsAt: new Date(),
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  return user;
}

export async function getTrialStatus(userId: string): Promise<TrialStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      trialStartsAt: true,
      trialEndsAt: true
    }
  });

  if (!user || !user.trialStartsAt) {
    return {
      userId,
      isActive: false,
      startedAt: null,
      endsAt: null,
      daysLeft: 0,
      currentDay: 0,
      hasDay4Mirror: false,
      hasDay7Mirror: false
    };
  }

  const now = new Date();
  const isActive = user.trialEndsAt ? user.trialEndsAt > now : false;
  const daysLeft = user.trialEndsAt
    ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const currentDay = Math.floor(
    (now.getTime() - user.trialStartsAt.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  // Check mirrors
  const mirrors = await prisma.$queryRaw<any[]>`
    SELECT day FROM trial_mirrors WHERE user_id = ${userId}
  `;

  const hasDay4Mirror = mirrors.some(m => m.day === 4);
  const hasDay7Mirror = mirrors.some(m => m.day === 7);

  return {
    userId,
    isActive,
    startedAt: user.trialStartsAt,
    endsAt: user.trialEndsAt,
    daysLeft,
    currentDay,
    hasDay4Mirror,
    hasDay7Mirror
  };
}

export async function generateTrialMirror(userId: string, day: number) {
  const entries = await prisma.dailyEntry.findMany({
    where: {
      userId,
      date: {
        gte: day === 4
          ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    }
  });

  const analysis = 'AI analysis placeholder'; // TODO: Add AI

  return analysis;
}
