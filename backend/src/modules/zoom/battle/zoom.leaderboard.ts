// backend/src/modules/zoom/zoom.leaderboard.ts
// Leaderboard: battleWins (from ZoomSession), bestStreak (Streak model), mindXP+level (GamificationProfile)

import { prisma } from '../../../db/client.js';
import type { BattleMeta } from './battle.service.js';
import { FOCUS_PRODUCT_CODE } from '@/products/focus/config/focus.constants.js';

export interface LeaderboardEntry {
  userId: string;
  battleWins: number;
  bestStreak: number;
  mindXP: number;
  level: number;
}

export async function getZoomLeaderboard(
  expertId: string,
  limit = 10,
): Promise<LeaderboardEntry[]> {
  const profiles = await prisma.gamificationProfile.findMany({
    where: {
      user: {
        expertId,
        deletedAt: null,
        productSubscriptions: {
          some: {
            status: 'ACTIVE',
            product: { code: FOCUS_PRODUCT_CODE },
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        },
      },
    },
    orderBy: { mindXP: 'desc' },
    take: limit,
    select: { userId: true, mindXP: true, level: true },
  });

  if (profiles.length === 0) return [];

  const userIds = profiles.map(p => p.userId);

  const [battleSessions, streaks] = await Promise.all([
    prisma.zoomSession.findMany({
      where: { expertId, status: 'COMPLETED' },
      select: { requests: true },
    }),
    prisma.streak.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, longest: true },
    }),
  ]);

  const winCounts = new Map<string, number>();
  for (const s of battleSessions) {
    const m = s.requests as unknown as BattleMeta;
    if (m?.type === 'battle_review' && m.winnerId && userIds.includes(m.winnerId)) {
      winCounts.set(m.winnerId, (winCounts.get(m.winnerId) ?? 0) + 1);
    }
  }

  const streakMap = new Map<string, number>();
  for (const s of streaks) {
    const cur = streakMap.get(s.userId) ?? 0;
    if (s.longest > cur) streakMap.set(s.userId, s.longest);
  }

  return profiles.map(p => ({
    userId: p.userId,
    battleWins: winCounts.get(p.userId) ?? 0,
    bestStreak: streakMap.get(p.userId) ?? 0,
    mindXP: p.mindXP,
    level: p.level,
  }));
}
