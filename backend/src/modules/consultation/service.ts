// backend/src/modules/consultation/service.ts
/**
 * Consultation Service
 */

import { prisma } from '@/db/client.js';
import { ConsultationStatus, Consultation } from '@prisma/client';

import { ConsultationTrigger } from './types.js';

export async function checkConsultationTriggers(userId: string): Promise<ConsultationTrigger | null> {
  // Get daily entries for last 21 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 21);

  const entries = await prisma.dailyEntry.findMany({
    where: {
      userId,
      date: { gte: startDate }
    },
    orderBy: { date: 'desc' }
  });

  if (entries.length < 14) return null;

  // Check for repeated patterns
  const states = entries.map(e => e.state);
  const drains = entries.map(e => e.drain).filter(Boolean);

  // Pattern: Same state 14+ days
  const mostCommonState = getMostCommon(states);
  const stateCount = states.filter(s => s === mostCommonState).length;

  if (stateCount >= 14) {
    return {
      userId,
      reason: `Повторюваний стан "${mostCommonState}" ${stateCount} днів`,
      patternDays: stateCount,
      severity: stateCount >= 21 ? 'high' : 'medium'
    };
  }

  // Pattern: Same drain 14+ days
  const mostCommonDrain = getMostCommon(drains);
  const drainCount = drains.filter(d => d === mostCommonDrain).length;

  if (drainCount >= 14) {
    return {
      userId,
      reason: `Повторюваний злив "${mostCommonDrain}" ${drainCount} днів`,
      patternDays: drainCount,
      severity: drainCount >= 21 ? 'high' : 'medium'
    };
  }

  // Check wheel imbalance
  const wheel = await prisma.wheelAssessment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  if (wheel) {
    const scores = wheel.scores as any[];
    const minScore = Math.min(...scores.map(s => s.score));
    const maxScore = Math.max(...scores.map(s => s.score));
    const imbalance = maxScore - minScore;

    if (imbalance >= 7) {
      return {
        userId,
        reason: `Сильний перекіс у колесі балансу (${imbalance} балів)`,
        patternDays: 0,
        severity: 'high'
      };
    }
  }

  return null;
}


export async function createConsultation(
  userId: string,
  scheduledAt: Date,
  triggerReason?: string
): Promise<Consultation> {
  return prisma.consultation.create({
    data: {
      userId,
      scheduledAt,
      status: 'PENDING',
      triggerReason,
    },
  });
}

export async function getConsultations(userId: string): Promise<Consultation[]> {
  const consultations = await prisma.consultation.findMany({
    where: { userId },
    orderBy: { scheduledAt: 'desc' }
  });

  return consultations as unknown as Consultation[];
}

export async function updateConsultationStatus(
  id: string,
  status: ConsultationStatus,
  notes?: string
): Promise<Consultation> {
  const consultation = await prisma.consultation.update({
    where: { id },
    data: { status, notes }
  });

  return consultation as unknown as Consultation;
}

function getMostCommon<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  const counts = new Map<T, number>();
  arr.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
  return Array.from(counts.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0];
}