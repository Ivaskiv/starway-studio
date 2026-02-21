// backend/src/modules/daily-cycle/daily.controller.ts
import { User } from '@prisma/client';
import type { Request, Response } from 'express';
import * as dailyService from './service.js';
import { checkDailyAccess } from './subscription.js';
import type { CreateDailyEntryInput } from './types.js';

// ==========================
// GET TODAY ENTRY
// ==========================
export async function getTodayEntry(req: Request, res: Response) {
  try {
    const user = req.user as User;
    const entry = await dailyService.getTodayEntry(user.id);
    res.json(entry ?? null);
  } catch (error) {
    console.error('❌ getTodayEntry error:', error);
    res.status(500).json({ error: 'server_error' });
  }
}

// ==========================
// UPSERT DAILY ENTRY
// ==========================
export async function upsertEntry(req: Request<CreateDailyEntryInput>, res: Response) {
  try {
    const user = req.user as User;
    const access = checkDailyAccess(user);

    if (!access.canCreateEntry) {
      return res.status(403).json({ error: 'access_denied', message: 'Підписка не активна' });
    }

    const input: CreateDailyEntryInput = {
      state: req.body.state,
      drain: req.body.drain ?? null,
      choice: req.body.choice,
      dayFact: req.body.dayFact ?? '',
      answers: req.body.answers ?? [],
      microSupport: req.body.microSupport ?? [],
    };

    const entry = await dailyService.upsertDailyEntry(user.id, input);
    const aiAnalysis = await dailyService.generateAiAnalysis(entry.id);

    res.json({ entry, aiAnalysis });
  } catch (error) {
    console.error('❌ upsertEntry error:', error);
    res.status(500).json({ error: 'server_error' });
  }
}

// ==========================
// GET HISTORY
// ==========================
export async function getHistory(req: Request, res: Response) {
  try {
    const user = req.user as User;
    const access = checkDailyAccess(user);
    const limit = access.historyLimit ?? 30;

    const history = await dailyService.getHistory(user.id, limit);
    res.json({ history, limit });
  } catch (error) {
    console.error('❌ getHistory error:', error);
    res.status(500).json({ error: 'server_error' });
  }
}

// ==========================
// GET MICRO TASKS
// ==========================
export async function getMicroTasks(req: Request, res: Response) {
  try {
    const user = req.user as User;
    const tasks = await dailyService.getUserMicroTasks(user.id);
    res.json({ tasks });
  } catch (error) {
    console.error('❌ getMicroTasks error:', error);
    res.status(500).json({ error: 'server_error' });
  }
}

// ==========================
// COMPLETE MICRO TASK
// ==========================
export interface CompleteTaskParams {
  taskId: string;
}

export async function completeMicroTask(
  req: Request<undefined, CompleteTaskParams>,
  res: Response,
) {
  try {
    const user = req.user as User;
    const taskId = req.params;
    if (!taskId) return res.status(400).json({ error: 'missing_taskId' });

    const updatedTask = await dailyService.completeMicroTask(user.id, taskId);
    if (!updatedTask) return res.status(404).json({ error: 'task_not_found' });

    res.json({ task: updatedTask });
  } catch (error) {
    console.error('❌ completeMicroTask error:', error);
    res.status(500).json({ error: 'server_error' });
  }
}
