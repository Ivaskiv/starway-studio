// backend/src/modules/consultation/service.ts
import { prisma } from '@/db/client.js';
import type { ConsultationTrigger } from './types.js';


type ConsultationRow = {
  id:            string
  userId:        string
  scheduledAt:   Date
  status:        string
  triggerReason: string | null
  notes:         string | null
  createdAt:     Date
}

export async function checkConsultationTriggers(userId: string): Promise<ConsultationTrigger | null> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 21);

  const entries = await prisma.dailyEntry.findMany({
    where:   { userId, date: { gte: startDate } },
    orderBy: { date: 'desc' },
    select:  { content: true },
  });

  if (entries.length < 14) return null;

  // fix4: state/drain беремо з content (Json поле)
  const states = entries.map(e => (e.content as any)?.state).filter(Boolean) as string[];
  const drains = entries.map(e => (e.content as any)?.drain).filter(Boolean) as string[];

  const mostCommonState = getMostCommon(states);
  const stateCount = states.filter(s => s === mostCommonState).length;
  if (stateCount >= 14) {
    return {
      userId,
      reason:      `Повторюваний стан "${mostCommonState}" ${stateCount} днів`,
      patternDays: stateCount,
      severity:    stateCount >= 21 ? 'high' : 'medium',
    };
  }

  const mostCommonDrain = getMostCommon(drains);
  const drainCount = drains.filter(d => d === mostCommonDrain).length;
  if (drainCount >= 14) {
    return {
      userId,
      reason:      `Повторюваний злив "${mostCommonDrain}" ${drainCount} днів`,
      patternDays: drainCount,
      severity:    drainCount >= 21 ? 'high' : 'medium',
    };
  }

  // fix5: wheelAssessment → userBalanceEntry
  const balanceEntry = await prisma.userBalanceEntry.findFirst({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    select:  { scores: true },
  });

  if (balanceEntry) {
    const scoresMap = balanceEntry.scores as Record<string, number>;
    const values = Object.values(scoresMap).filter(v => typeof v === 'number');
    if (values.length > 0) {
      const imbalance = Math.max(...values) - Math.min(...values);
      if (imbalance >= 7) {
        return {
          userId,
          reason:      `Сильний перекіс у колесі балансу (${imbalance} балів)`,
          patternDays: 0,
          severity:    'high',
        };
      }
    }
  }

  return null;
}

// fix6: Consultation немає в схемі — зберігаємо як Notification (або raw query)
// Використовуємо Notification з templateKey='consultation'
export async function createConsultation(
  expertId: string,
  userId:   string,
  scheduledAt:   Date,
  triggerReason?: string,
): Promise<ConsultationRow> {
  const note = await prisma.notification.create({
    data: {
      expertId,
      userId,
      channel:     'IN_APP',
      templateKey: 'consultation',
      payload:     { scheduledAt: scheduledAt.toISOString(), triggerReason: triggerReason ?? null },
      status:      'PENDING',
      scheduledAt,
    },
  });

  return {
    id:            note.id,
    userId:        note.userId,
    scheduledAt,
    status:        'PENDING',
    triggerReason: triggerReason ?? null,
    notes:         null,
    createdAt:     note.createdAt,
  };
}

export async function getConsultations(userId: string): Promise<ConsultationRow[]> {
  const notes = await prisma.notification.findMany({
    where:   { userId, templateKey: 'consultation' },
    orderBy: { scheduledAt: 'desc' },
  });

  return notes.map(n => ({
    id:            n.id,
    userId:        n.userId,
    scheduledAt:   (n.payload as any)?.scheduledAt ? new Date((n.payload as any).scheduledAt) : n.createdAt,
    status:        n.status,
    triggerReason: (n.payload as any)?.triggerReason ?? null,
    notes:         n.failureReason ?? null,
    createdAt:     n.createdAt,
  }));
}

export async function updateConsultationStatus(
  id:     string,
  status: string,
  notes?: string,
): Promise<ConsultationRow> {
  const note = await prisma.notification.update({
    where: { id },
    data:  { status: status as any, failureReason: notes },
  });

  return {
    id:            note.id,
    userId:        note.userId,
    scheduledAt:   (note.payload as any)?.scheduledAt ? new Date((note.payload as any).scheduledAt) : note.createdAt,
    status:        note.status,
    triggerReason: (note.payload as any)?.triggerReason ?? null,
    notes:         note.failureReason ?? null,
    createdAt:     note.createdAt,
  };
}

function getMostCommon<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  const counts = new Map<T, number>();
  arr.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
  return Array.from(counts.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0];
}