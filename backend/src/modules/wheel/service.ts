// backend/src/modules/wheel/wheel.service.ts
import { prisma } from '@/db/client.js';
import { generateWheelAnalysis } from './ai.js';
import type { WheelAnalytics, WheelScore, WheelUserContext } from './types.js';

// ========== АНАЛІЗ ==========
export function findWeakest(scores: WheelScore[]): WheelScore {
  return scores.reduce((min, s) => (s.score < min.score ? s : min));
}

export function findFocus(scores: WheelScore[], weakest: WheelScore): WheelScore {
  const alternatives = scores.filter(s => s.categoryId !== weakest.categoryId && s.score < 7);
  return alternatives.length > 0 ? alternatives[0] : weakest;
}

export function calculateImbalance(scores: WheelScore[]): number {
  const scores_only = scores.map(s => s.score);
  return Math.max(...scores_only) - Math.min(...scores_only);
}

const resolveCooldownDays = (): number => {
  const fromEnv = Number(process.env.WHEEL_COOLDOWN_DAYS);
  if (Number.isFinite(fromEnv) && fromEnv >= 0) return fromEnv;
  // fix code_x: development must allow iterative saves without blocking UX.
  return process.env.NODE_ENV === 'production' ? 30 : 0;
};

export async function getWheelCooldown(userId: string): Promise<{ canFill: boolean; daysLeft: number }> {
  const cooldownDays = resolveCooldownDays();
  if (cooldownDays <= 0) return { canFill: true, daysLeft: 0 };

  const lastWheel = await prisma.wheelAssessment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!lastWheel) return { canFill: true, daysLeft: 0 };

  const daysSince = Math.floor((Date.now() - lastWheel.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(cooldownDays - daysSince, 0);

  return {
    canFill: daysLeft === 0,
    daysLeft,
  };
}

// ========== AI АНАЛІЗ ==========
export async function analyzeWheel(scores: WheelScore[], user: WheelUserContext): Promise<string> {
  try {
    return await generateWheelAnalysis(scores, user);
  } catch (error) {
    console.error('❌ AI analysis failed:', error);
    // Fallback аналіз
    const weakest = findWeakest(scores);
    const focus = findFocus(scores, weakest);
    const imbalance = calculateImbalance(scores);

    return `Ваша найслабша сфера: ${weakest.categoryId} (${weakest.score}/10). \nДисбаланс: ${imbalance} балів. \nРекомендуємо сфокусуватись на: ${focus.categoryId}.`;
  }
}

// ========== СТВОРЕННЯ WHEEL ==========
export async function createWheel(userId: string, scores: WheelScore[]) {
  if (scores.length !== 8) {
    throw new Error('Необхідно 8 сфер');
  }

  // Перевірка cooldown
  const cooldown = await getWheelCooldown(userId);
  if (!cooldown.canFill) {
    throw new Error(`Cooldown: ${cooldown.daysLeft} днів`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const weakest = findWeakest(scores);
  const focus = findFocus(scores, weakest);

  const userContext: WheelUserContext = {
    name: user.firstName || user.email || 'Користувач',
    email: user.email,
    phone: null,
    gender: null,
    age: null,
  };

  const analysis = await analyzeWheel(scores, userContext);

  return prisma.wheelAssessment.create({
    data: {
      userId,
      scores: scores as any, // Prisma Json type
      weakestSphere: weakest.categoryId,
      focusSphere: focus.categoryId,
      analysis,
    },
  });
}

// ========== HISTORY ==========
export async function getWheelHistory(userId: string, limit = 10) {
  return prisma.wheelAssessment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// ========== ANALYTICS ==========
export async function getWheelAnalytics(userId: string): Promise<WheelAnalytics> {
  const wheels = await prisma.wheelAssessment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (wheels.length === 0) {
    return {
      totalAssessments: 0,
      averageScores: {},
      mostCommonWeakest: '',
      mostCommonFocus: '',
      trend: 'stable',
    };
  }

  // Середні оцінки
  const averageScores: Record<string, number> = {};
  const weakestCount: Record<string, number> = {};
  const focusCount: Record<string, number> = {};

  wheels.forEach(w => {
    const scores = Array.isArray(w.scores) ? w.scores : [];
    scores.forEach((s: any) => {
      if (!averageScores[s.categoryId]) averageScores[s.categoryId] = 0;
      averageScores[s.categoryId] += s.score;
    });

    weakestCount[w.weakestSphere] = (weakestCount[w.weakestSphere] || 0) + 1;
    focusCount[w.focusSphere] = (focusCount[w.focusSphere] || 0) + 1;
  });

  Object.keys(averageScores).forEach(key => {
    averageScores[key] = Math.round(averageScores[key] / wheels.length);
  });

  const mostCommonWeakest = Object.entries(weakestCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  const mostCommonFocus = Object.entries(focusCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  // Тренд (порівняння останніх 2 оцінок)
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (wheels.length >= 2) {
    const latest = Array.isArray(wheels[0].scores) ? wheels[0].scores : [];
    const previous = Array.isArray(wheels[1].scores) ? wheels[1].scores : [];

    const latestAvg = latest.reduce((sum: number, s: any) => sum + s.score, 0) / latest.length;
    const previousAvg =
      previous.reduce((sum: number, s: any) => sum + s.score, 0) / previous.length;

    if (latestAvg > previousAvg + 0.5) trend = 'improving';
    if (latestAvg < previousAvg - 0.5) trend = 'declining';
  }

  return {
    totalAssessments: wheels.length,
    averageScores,
    mostCommonWeakest,
    mostCommonFocus,
    trend,
  };
}

// ========== MICRO TASKS ==========
export async function addWheelMicroTasks(userId: string, weakest: WheelScore) {
  const tasksMap: Record<string, string[]> = {
    money: ['Проаналізувати витрати за тиждень', 'Створити бюджет на місяць'],
    realization: ["Визначити 3 кар'єрні цілі", 'Оновити резюме'],
    relationships: ['Подзвонити близькій людині', 'Запланувати зустріч з другом'],
    energy: ['Зробити ранкову зарядку', 'Прогулятись 30 хв'],
    freedom: ['Заблокувати 1 годину для себе', 'Відмовитись від 1 зайвої справи'],
    innerSupport: ['Медитація 10 хв', 'Написати 3 досягнення за день'],
    health: ['Записатись до лікаря', 'Зробити аналізи'],
    growth: ['Прочитати 1 главу книги', 'Подивитись навчальне відео'],
  };

  const tasks = tasksMap[weakest.categoryId] || ['Попрацювати над цією сферою'];

  for (const taskTitle of tasks) {
    await prisma.microTask.create({
      data: {
        userId,
        title: taskTitle,
        description: `Автоматично створено для сфери: ${weakest.categoryId}`,
        completed: false,
      },
    });
  }
}
