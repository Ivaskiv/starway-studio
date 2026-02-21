// backend/src/modules/ai-mentor/services/daily.ts

/**
 * Daily Service
 */

import { prisma } from '@/db/client.js';
import { openai } from '@/lib/openai.js';
import { DailyChoice, DailyDrain, DailyState } from '@prisma/client';
import { getOrCreateSession, saveMessage, updateSessionActivity } from './session.js';
import type { MentorSession } from '../types.js';

export async function dailyCycle(
  userId: string,
  payload: {
    state: DailyState;
    drain?: DailyDrain;
    choice: DailyChoice;
    dayFact: string;
    microSupport?: any;
  }
) {
  const session = await getOrCreateSession(userId);

  const dailyEntry = await prisma.dailyEntry.create({
    data: {
      userId,
      date: new Date(),
      state: payload.state,
      drain: payload.drain,
      choice: payload.choice,
      dayFact: payload.dayFact,
      microSupport: payload.microSupport || {}
    }
  });

  const aiAnalysis = await generateDailyAnalysis({
    state: payload.state,
    drain: payload.drain,
    choice: payload.choice,
    dayFact: payload.dayFact
  });

  const mentorMessage = await saveMessage({
    sessionId: session.id,
    userId,
    role: 'MENTOR',
    text: aiAnalysis,
    metadata: {
      type: 'dailyCycle',
      dailyEntryId: dailyEntry.id
    }
  });

  await updateSessionActivity(session.id);

  return { session, dailyEntry, mentorMessage, aiAnalysis };
}

export async function handleDailyCycleEntry(
  userId: string,
  session: MentorSession,
  payload: { fact: string; state: string; drain: string }
) {
  const userMessage = await saveMessage({
    sessionId: session.id,
    userId,
    role: 'USER',
    text: `Щоденний запис: ${payload.fact}`,
    metadata: {
      type: 'dailyCycle',
      state: payload.state,
      drain: payload.drain,
      fact: payload.fact
    }
  });

  const aiText = await generateDailyAnalysis({
    state: payload.state as any,
    choice: 'CHOSE_NEW' as any,
    dayFact: payload.fact
  });

  const mentorMessage = await saveMessage({
    sessionId: session.id,
    userId,
    role: 'MENTOR',
    text: aiText,
    metadata: { type: 'dailyCycleResponse' }
  });

  await updateSessionActivity(session.id);

  return { session, dailyEntry: userMessage, mentorMessage };
}

export async function getDailyEntries(userId: string, startDate: Date, endDate: Date) {
  return prisma.dailyEntry.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate }
    },
    orderBy: { date: 'desc' }
  });
}

export async function getLatestDailyEntry(userId: string) {
  return prisma.dailyEntry.findFirst({
    where: { userId },
    orderBy: { date: 'desc' }
  });
}

export async function hasTodayEntry(userId: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const entry = await prisma.dailyEntry.findFirst({
    where: {
      userId,
      date: { gte: today, lt: tomorrow }
    }
  });

  return !!entry;
}

async function generateDailyAnalysis(data: {
  state: DailyState | string;
  drain?: DailyDrain | string;
  choice: DailyChoice | string;
  dayFact: string;
}): Promise<string> {
  const prompt = `Проаналізуй щоденний запис:

Стан: ${data.state}
${data.drain ? `Витік: ${data.drain}` : ''}
Вибір: ${data.choice}
Факт: ${data.dayFact}

Дай короткий аналіз (2-3 речення) та підтримку.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 300
  });

  return response.choices[0]?.message?.content || 'Дякую за запис!';
}