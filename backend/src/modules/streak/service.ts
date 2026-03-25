// backend/src/modules/streak/service.ts
// Управління streak: create / update / break
// Без класів, тільки функції
// ЦЕ РІШЕННЯ ТОП
// ✅ динамічне — правила можна міняти
// ✅ модульне — streak не знає, ХТО його тригерить
// ✅ швидке — UI не рахує нічого
// ✅ версійне — ruleVer дозволяє міграції без болю
// ✅ telegram-ready — current / longest готові

// backend/src/modules/streak/service.ts
// Вся бізнес-логіка streak (ядро)

import { prisma } from '../../db/client.js';
import { STREAK_RULES, type StreakInfo, type StreakRuleKey } from './types.js';
import { rewardEngine } from '../gamification/reward.engine.js';
import { onStreakBroken, onStreakUpdate } from '../gamification/triggers.js';

function diffDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

/**
 * Реєстрація активності у streak
 * Викликається з wheel / daily / tasks / telegram
 */
export async function registerStreakActivity(
  userId: string,
  expertId: string,
  ruleKey: StreakRuleKey,
  at: Date = new Date(),
) {
  const rule = STREAK_RULES[ruleKey];
  if (!rule) throw new Error('streak_rule_not_found');

  const streak = await prisma.streak.findUnique({
    where: {
      userId_ruleKey: { userId, ruleKey }, // ✅ працює ТІЛЬКИ бо є ../..../..unique
    },
  });

  // ── NEW ────────────────────────────────
  if (!streak) {
    const created = await prisma.streak.create({
      data: {
        userId,
        expertId,
        ruleKey,
        ruleVer: rule.version,
        startAt: at,
        lastAt: at,
        current: 1,
        longest: 1,
        totalDays: 1,
      },
    });
    if (created.current === 7) {
      await rewardEngine.onSevenDayStreak(userId);
    }
    return created;
  }

  const gap = diffDays(at, streak.lastAt);

  // ── SAME DAY ───────────────────────────
  if (gap === 0) return streak;

  // ── CONTINUE ───────────────────────────
  if (gap <= rule.maxGapDays) {
    const current = streak.current + gap;

    const updated = await prisma.streak.update({
      where: { id: streak.id },
      data: {
        lastAt: at,
        current,
        longest: Math.max(streak.longest, current),
        totalDays: streak.totalDays + gap,
      },
    });
    if (updated.current === 7) {
      await rewardEngine.onSevenDayStreak(userId);
    }
    await onStreakUpdate({ userId, current: updated.current })
    return updated;
  }

  // ── BREAK ──────────────────────────────
  await prisma.streak.update({
    where: { id: streak.id },
    data: { endAt: at },
  });
  await onStreakBroken({ userId })

  return prisma.streak.create({
    data: {
      userId,
      expertId,
      ruleKey,
      ruleVer: rule.version,
      startAt: at,
      lastAt: at,
      current: 1,
      longest: streak.longest,
      totalDays: streak.totalDays + 1,
    },
  });
}

/**
 * Отримати streak info для UI
 */
export async function getUserStreaks(
  userId: string,
): Promise<StreakInfo[]> {
  const streaks = await prisma.streak.findMany({
    where: { userId, endAt: null },
  });

  return streaks.map(s => ({
    ruleKey: s.ruleKey as StreakRuleKey,
    current: s.current,
    longest: s.longest,
    totalDays: s.totalDays,
    lastAt: s.lastAt.toISOString(),
    isActive: true,
  }));
}
