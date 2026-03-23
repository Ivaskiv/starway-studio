import { Response } from 'express';
import type { AuthenticatedRequest } from '../../types/globalTypes.js';
import type { DailyEntryInput, UpsertDailyEntryInput } from './types.js';

import {
  getOrCreateTodayEntry,
  upsertDailyEntry,
  saveDailySession,
  getMicroTasks,
  completeMicroTask,
  getDailyEntryHistory,
} from './service.js';
import { rewardEngine } from '../gamification/reward.engine.js';

function isDailySessionPayload(
  payload: DailyEntryInput | { session?: 'morning' | 'evening'; answers?: unknown; date?: unknown },
): payload is { session: 'morning' | 'evening'; answers: Record<string, string>; date: string } {
  const session = 'session' in payload ? payload.session : undefined
  const date = 'date' in payload ? payload.date : undefined
  const answers = 'answers' in payload ? payload.answers : undefined

  return (
    (session === 'morning' || session === 'evening')
    && typeof date === 'string'
    && typeof answers === 'object'
    && answers !== null
    && !Array.isArray(answers)
  )
}

// =====================================================
// GET TODAY'S ENTRY
// =====================================================
export async function getToday(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // ⚠️ service очікує userId + expertId
    // якщо в тебе немає окремого expertId — тимчасово передаємо user.id
    const expertId = user.expertId ?? user.id;
    const entry = await getOrCreateTodayEntry(user.id, expertId);

    res.json(entry);
  } catch (err) {
    console.error('getToday error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// =====================================================
// UPSERT DAILY ENTRY
// =====================================================
export async function upsertEntry(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = req.body as
      | DailyEntryInput
      | {
        session?: 'morning' | 'evening'
        answers?: Record<string, string>
        date?: string
      };

    if (isDailySessionPayload(payload)) {
      const entry = await saveDailySession(user.id, {
        session: payload.session,
        answers: payload.answers,
        date: payload.date,
      })
      await rewardEngine.onDailyEntryCreated(user.id);
      res.json(entry);
      return;
    }

    const entryPayload = payload as DailyEntryInput;

    if (!entryPayload.id) {
      return res.status(400).json({ error: 'Entry ID missing' });
    }

    const expertId = user.expertId ?? user.id;

    const entryInput: UpsertDailyEntryInput = {
      ...entryPayload,
      entryId: entryPayload.id,
      userId: user.id,
      expertId,
      date: entryPayload.date ? new Date(entryPayload.date) : new Date(),
    };

    const entry = await upsertDailyEntry(entryInput);
    await rewardEngine.onDailyEntryCreated(user.id);

    res.json(entry);
  } catch (err) {
    console.error('upsertEntry error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// =====================================================
// GET MICRO TASKS
// =====================================================
export async function getTasks(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // ⚠️ тепер micro tasks прив’язані до entryId
    const entryId = req.query.entryId as string;

    if (!entryId) {
      return res.status(400).json({ error: 'Entry ID missing' });
    }

    const tasks = await getMicroTasks(entryId);

    res.json(tasks);
  } catch (err) {
    console.error('getTasks error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// =====================================================
// COMPLETE MICRO TASK
// =====================================================
export async function completeTask(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const entryId = req.query.entryId as string;
    const taskId = req.params.taskId;

    if (!entryId) {
      return res.status(400).json({ error: 'Entry ID missing' });
    }

    if (!taskId) {
      return res.status(400).json({ error: 'Task ID missing' });
    }

    const updated = await completeMicroTask(entryId, taskId);

    if (!updated) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('completeTask error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// ============================================
// HISTORY
// ============================================

export async function getHistoryController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const history = await getDailyEntryHistory(user.id);
    res.json(history);
  } catch (err) {
    console.error('getHistoryController error', err);
    res.status(500).json({ error: 'Server error' });
  }
}
