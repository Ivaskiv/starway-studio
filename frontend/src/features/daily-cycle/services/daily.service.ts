// backend/src/modules/daily/daily.service.ts
import { prisma } from '../../prisma';
import { DailyEntry, DailyEntryDTO, DailyStats } from './daily.types';

export class DailyService {
  // === Створити запис дня ===
  static async createEntry(userId: string, dto: DailyEntryDTO): Promise<DailyEntry> {
    return prisma.dailyEntry.create({
      data: {
        userId,
        state: dto.state,
        drain: dto.drain ?? null,
        goal: dto.goal ?? null,
        goalCompleted: dto.goalCompleted ?? false,
        choiceType: dto.choice.type,
        choiceDescription: dto.choice.description,
        decision: dto.decision ?? null,
        decisionReason: dto.decisionReason ?? null,
        action: dto.action ?? null,
        dayFact: dto.dayFact ?? null,
        microSupport: dto.microSupport ?? null,
      },
    });
  }

  // === Отримати всі записи користувача ===
  static async getMyEntries(userId: string): Promise<DailyEntry[]> {
    return prisma.dailyEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // === Отримати статистику по користувачу ===
  static async getStats(userId: string): Promise<DailyStats> {
    const entries = await prisma.dailyEntry.findMany({ where: { userId } });
    if (!entries.length) return { totalDays: 0, stabilityRate: 0, topDrain: null };

    const stabilityDays = entries.filter(
      e => e.state === 'stability' || e.state === 'innerSupport',
    ).length;

    const drainCount: Record<string, number> = {};
    entries.forEach(e => {
      if (e.drain) drainCount[e.drain] = (drainCount[e.drain] || 0) + 1;
    });
    const topDrain = Object.entries(drainCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      totalDays: entries.length,
      stabilityRate: Math.round((stabilityDays / entries.length) * 100),
      topDrain,
    };
  }

  // === Отримати останній запис дня ===
  static async getLastEntry(userId: string): Promise<DailyEntry | null> {
    return prisma.dailyEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
