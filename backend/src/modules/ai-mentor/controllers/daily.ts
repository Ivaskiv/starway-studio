// backend/src/modules/ai-mentor/controller/daily.controller.ts
import { prisma } from '@/db/client.js';
import { DailyChoice, DailyDrain, DailyState, Prisma } from '@/db/generated/prisma/client.js';
import { NextFunction, Request, Response } from 'express';
import {
  getDailyEntries,
  getLatestDailyEntry,
  handleDailyCycleEntry,
  hasTodayEntry,
} from '../services/daily.js';
import { getOrCreateSession } from '../services/session.js';
import { AuthenticatedRequest } from '@/types/globalTypes.js';

// ==========================================
// HANDLERS
// ==========================================
export async function submitDailyCycle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { expertId: true },
    });

    if (!user?.expertId) {
      return res.status(400).json({ error: 'User has no expertId' });
    }
    const dailyEntry = await prisma.dailyEntry.create({
      data: {
        userId,
        state,
        drain,
        choice,
        dayFact,
        microSupport: microSupport ?? {},
        expertId: user.expertId,
        date: new Date(), 
      },
    });

    return res.status(200).json(dailyEntry);
  } catch (error: any) {
    console.error('[DailyController] submitDailyCycle error:', error);
    next(error);
  }
}

export async function submitDailyEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

export async function getDailyEntriesHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

export async function getLatestDailyEntryHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

export async function checkTodayEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
