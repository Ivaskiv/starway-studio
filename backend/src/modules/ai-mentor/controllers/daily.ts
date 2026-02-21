// backend/src/modules/ai-mentor/controller/daily.controller.ts
import { prisma } from '@/db/client.js';
import { DailyChoice, DailyDrain, DailyState } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import {
  getDailyEntries,
  getLatestDailyEntry,
  handleDailyCycleEntry,
  hasTodayEntry,
} from '../services/daily.js';
import { getOrCreateSession } from '../services/session.js';

// ==========================================
// HANDLERS
// ==========================================
type CreateDailyEntryPayload = {
  state: DailyState;
  drain?: DailyDrain;
  choice: DailyChoice;
  dayFact: string;
  microSupport: any; // або Prisma.JsonValue
};
export async function submitDailyCycle(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { state, drain, choice, dayFact, microSupport } = req.body;

    if (!state || !choice || !dayFact) {
      return res.status(400).json({
        error: 'Missing required fields: state, choice, dayFact',
      });
    }

    const dailyEntry = await prisma.dailyEntry.create({
      data: {
        userId,
        state,
        drain,
        choice,
        dayFact,
        microSupport: microSupport ?? {}, // 🔥 важливо
      },
    });

    return res.status(200).json(dailyEntry);
  } catch (error: any) {
    console.error('[DailyController] submitDailyCycle error:', error);
    next(error);
  }
}

export async function submitDailyEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { fact, state, drain, sessionId } = req.body;
    if (!fact || !state)
      return res.status(400).json({ error: 'Missing required fields: fact, state' });

    const session = await getOrCreateSession(userId, sessionId);
    const result = await handleDailyCycleEntry(userId, session, {
      fact,
      state,
      drain: drain || '',
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[DailyController] submitDailyEntry error:', error);
    next(error);
  }
}

export async function getDailyEntriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { startDate, endDate } = req.query;
    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const entries = await getDailyEntries(userId, start, end);
    return res.status(200).json(entries);
  } catch (error: any) {
    console.error('[DailyController] getDailyEntriesHandler error:', error);
    next(error);
  }
}

export async function getLatestDailyEntryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const entry = await getLatestDailyEntry(userId);
    return res.status(200).json(entry || null);
  } catch (error: any) {
    console.error('[DailyController] getLatestDailyEntryHandler error:', error);
    next(error);
  }
}

export async function checkTodayEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const hasEntry = await hasTodayEntry(userId);
    return res.status(200).json({ hasEntry });
  } catch (error: any) {
    console.error('[DailyController] checkTodayEntry error:', error);
    next(error);
  }
}
