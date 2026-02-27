import { Response } from 'express';
import type { AuthenticatedRequest } from '@/types/globalTypes.js';
import type { DailyEntryInput, UpsertDailyEntryInput } from './types.js';

import {
  getOrCreateTodayEntry,
  upsertDailyEntry,
  getMicroTasks,
  completeMicroTask,
  getDailyEntryHistory,
} from './service.js';

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

    const payload = req.body as DailyEntryInput;

    // ⚠️ service тепер приймає (entryId, input)
    // тому очікуємо entryId в body
    if (!payload.id) {
      return res.status(400).json({ error: 'Entry ID missing' });
    }

    const expertId = user.expertId ?? user.id;

    const entryInput: UpsertDailyEntryInput = {
      ...payload,
      entryId: payload.id,
      userId: user.id,
      expertId,
      date: payload.date ? new Date(payload.date) : new Date(),
    };

    const entry = await upsertDailyEntry(entryInput);

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
