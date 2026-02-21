// backend/src/modules/streak/service.ts
/**
 * Streak Service - FIXED
 */

import { prisma } from '@/db/client.js';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastEntryDate: Date | null;
  totalDays: number;
  stabilityDays: number;
  drainDays: number;
}

export async function getStreak(userId: string): Promise<StreakData> {
  const streak = await prisma.streak.findUnique({
    where: { userId }
  });

  if (!streak) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastEntryDate: null,
      totalDays: 0,
      stabilityDays: 0,
      drainDays: 0
    };
  }

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastEntryDate: streak.lastEntryDate,
    totalDays: streak.totalDays,
    stabilityDays: streak.stabilityDays,
    drainDays: streak.drainDays
  };
}

export async function updateStreak(userId: string, choice: string): Promise<StreakData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.streak.findUnique({
    where: { userId }
  });

  if (!existing) {
    // Create new
    const newStreak = await prisma.streak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastEntryDate: today,
        totalDays: 1,
        stabilityDays: choice === 'обрала нове' ? 1 : 0,
        drainDays: choice === 'підтверджувала старе' ? 1 : 0
      }
    });

    return {
      currentStreak: newStreak.currentStreak,
      longestStreak: newStreak.longestStreak,
      lastEntryDate: newStreak.lastEntryDate,
      totalDays: newStreak.totalDays,
      stabilityDays: newStreak.stabilityDays,
      drainDays: newStreak.drainDays
    };
  }

  // Update existing
  const lastDate = existing.lastEntryDate ? new Date(existing.lastEntryDate) : null;
  const isConsecutive = lastDate
    ? Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)) === 1
    : false;

  const newStreakCount = isConsecutive ? existing.currentStreak + 1 : 1;

  const updated = await prisma.streak.update({
    where: { userId },
    data: {
      currentStreak: newStreakCount,
      longestStreak: Math.max(newStreakCount, existing.longestStreak),
      lastEntryDate: today,
      totalDays: existing.totalDays + 1,
      stabilityDays: choice === 'обрала нове' 
        ? existing.stabilityDays + 1 
        : existing.stabilityDays,
      drainDays: choice === 'підтверджувала старе' 
        ? existing.drainDays + 1 
        : existing.drainDays
    }
  });

  return {
    currentStreak: updated.currentStreak,
    longestStreak: updated.longestStreak,
    lastEntryDate: updated.lastEntryDate,
    totalDays: updated.totalDays,
    stabilityDays: updated.stabilityDays,
    drainDays: updated.drainDays
  };
}