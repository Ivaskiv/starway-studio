// backend/src/modules/wheel/service.ts
// Бізнес-логіка колеса балансу — cooldown, createWheel, analytics, microtasks
// Підтримує як експертів (owners), так і клієнтів (users)
// expertId береться з user.expertId — працює для обох ролей

import type { Prisma, UserBalanceEntry } from '@/db/generated/prisma/client.js';
import { prisma } from '@/db/client.js';
import {
  FIXED_SPHERES,
  SPHERE_LABELS,
  type WheelScore,
  type WheelSphereId,
  type WheelScoresMap,
  type WheelUserContext,
  type WheelAnalytics,
} from './types.js';
import { generateWheelAnalysis } from './ai.js';

/* ───────────────────────────
 * helpers
 * ─────────────────────────── */

export function scoresToMap(scores: WheelScore[]): WheelScoresMap {
  const map = {} as WheelScoresMap;
  for (const s of scores) {
    map[s.categoryId] = s.score;
  }
  return map;
}

export function scoresFromMap(map: unknown): WheelScore[] {
  if (!map || typeof map !== 'object') return [];
  return Object.entries(map as Record<string, number>)
    .filter(([k]) => FIXED_SPHERES.includes(k as WheelSphereId))
    .map(([categoryId, score]) => ({
      categoryId: categoryId as WheelSphereId,
      score,
    }));
}

export function findWeakest(scores: WheelScore[]): WheelScore {
  return scores.reduce((min, s) => (s.score < min.score ? s : min));
}

export function findStrongest(scores: WheelScore[]): WheelScore {
  return scores.reduce((max, s) => (s.score > max.score ? s : max));
}

export function findFocus(scores: WheelScore[], weakest: WheelScore): WheelScore {
  const alternative = scores.find(
    s => s.categoryId !== weakest.categoryId && s.score < 7,
  );
  return alternative ?? weakest;
}

/* ───────────────────────────
 * create wheel
 * ─────────────────────────── */

export async function createWheelEntry(params: {
  userId: string;
  balanceConfigId: string;
  scores: WheelScore[];
}): Promise<UserBalanceEntry> {
  const { userId, balanceConfigId, scores } = params;

  if (scores.length !== FIXED_SPHERES.length) {
    throw new Error('wheel_invalid_spheres_count');
  }

  const ids = new Set(scores.map(s => s.categoryId));
  for (const id of FIXED_SPHERES) {
    if (!ids.has(id)) throw new Error('wheel_invalid_spheres_set');
  }

  const cooldown = await canFillWheel(userId);
  if (!cooldown.canFill) {
    throw new Error(`wheel_cooldown_${cooldown.daysLeft}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      email: true,
      expertId: true,
    },
  });

  if (!user || !user.expertId) {
    throw new Error('user_or_expert_not_found');
  }

  const weakest = findWeakest(scores);
  const focus = findFocus(scores, weakest);

  const userContext: WheelUserContext = {
    name: user.firstName ?? user.email ?? 'Користувач',
    email: user.email,
    phone: null,
    age: null,
  };

  let analysis = '';
  try {
    analysis = await generateWheelAnalysis(scores, userContext);
  } catch {
    analysis = `Фокус: ${SPHERE_LABELS[focus.categoryId]}`;
  }

  return prisma.userBalanceEntry.create({
    data: {
      userId,
      expertId: user.expertId,
      balanceConfigId,
      scores: scoresToMap(scores) as Prisma.InputJsonValue,
      note: analysis,
    },
  });
}

/* ───────────────────────────
 * read
 * ─────────────────────────── */

export function getLatestWheel(userId: string) {
  return prisma.userBalanceEntry.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export function getWheelHistory(userId: string, limit = 10) {
  return prisma.userBalanceEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/* ───────────────────────────
 * analytics
 * ─────────────────────────── */

export async function getWheelAnalytics(userId: string): Promise<WheelAnalytics> {
  const entries = await getWheelHistory(userId, 100);

  if (!entries.length) {
    return {
      totalAssessments: 0,
      averageScores: {} as Record<WheelSphereId, number>,
      mostCommonWeakest: '',
      mostCommonFocus: '',
      trend: 'stable',
    };
  }

  const avg: Record<WheelSphereId, number> = {} as any;
  const weakestCount: Record<WheelSphereId, number> = {} as any;

  for (const entry of entries) {
    const scores = scoresFromMap(entry.scores);
    for (const s of scores) {
      avg[s.categoryId] = (avg[s.categoryId] ?? 0) + s.score;
    }
    const weakest = findWeakest(scores);
    weakestCount[weakest.categoryId] = (weakestCount[weakest.categoryId] ?? 0) + 1;
  }

  for (const key of Object.keys(avg) as WheelSphereId[]) {
    avg[key] = Math.round((avg[key] / entries.length) * 10) / 10;
  }

  const mostCommonWeakest =
    (Object.entries(weakestCount).sort((a, b) => b[1] - a[1])[0]?.[0] as WheelSphereId) || '';

  let trend: WheelAnalytics['trend'] = 'stable';
  if (entries.length >= 2) {
    const a = scoresFromMap(entries[0].scores);
    const b = scoresFromMap(entries[1].scores);
    const avgScore = (x: WheelScore[]) => x.reduce((s, i) => s + i.score, 0) / x.length;
    const diff = avgScore(a) - avgScore(b);
    if (diff > 0.5) trend = 'improving';
    if (diff < -0.5) trend = 'declining';
  }

  return {
    totalAssessments: entries.length,
    averageScores: avg,
    mostCommonWeakest,
    mostCommonFocus: mostCommonWeakest,
    trend,
  };
}

/**
 * Додає мікрозавдання користувачу для найслабшої сфери колеса
 */
export async function addWheelMicroTasks(userId: string, weakest: WheelScore) {
  if (!weakest) return;

  // приклад: кожна сфера може мати шаблон мікрозавдань
  const tasksMap: Record<WheelSphereId, string[]> = {
    money: ['Придумати 3 способи економії', 'Зробити бюджет на тиждень'],
    realization: ['Скласти план проєкту', 'Визначити 1 ціль на тиждень'],
    relationships: ['Написати комплімент другу', 'Запланувати зустріч з колегою'],
    energy_body: ['Сходити на прогулянку 30 хв', 'Виконати розтяжку'],
    freedom_time: ['Запланувати 1 годину на хобі', 'Вимкнути телефон на годину'],
    inner_support: ['Написати 3 позитивні аффірмації', 'Зробити медитацію 10 хв'],
    environment: ['Протерти робоче місце', 'Поставити квітку'],
    meaning_direction: ['Скласти список цілей на місяць', 'Написати 3 речі, що важливі'],
  };

  const titles = tasksMap[weakest.categoryId] ?? [];

  const microTasks = titles.map(title => ({
    userId,
    title,
    description: `Мікрозавдання для сфери "${weakest.categoryId}"`,
    status: 'ACTIVE' as const,
    createdAt: new Date(),
  }));

  // зберігаємо у БД
  await prisma.microTask.createMany({
    data: microTasks,
  });
}

/* ───────────────────────────
 * cooldown
 * ─────────────────────────── */
/**
 * Перевіряє, чи користувач може заповнити колесо цього місяця
 * @param userId — ID користувача
 * @returns { canFill: boolean, daysLeft: number } 
 */
export async function canFillWheel(userId: string): Promise<{ canFill: boolean; daysLeft: number }> {
  const lastEntry = await prisma.userBalanceEntry.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  if (!lastEntry) return { canFill: true, daysLeft: 0 };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  if (lastEntry.createdAt < monthStart) {
    return { canFill: true, daysLeft: 0 };
  }

  const daysLeft = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { canFill: false, daysLeft };
}

export function calculateImbalance(scores: WheelScore[]): number {
  if (scores.length === 0) return 0;
  const values = scores.map(s => s.score);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}