import { Response } from 'express';
import type { AuthenticatedRequest } from '../../types/globalTypes.js';
import type { DailyEntryInput, SaveDailyAnswerInput, SkipDailyEntryInput, UpsertDailyEntryInput } from './types.js';
import { getCachedTodayEntry } from '../../lib/db/dailyCache.js';

import {
  getDailyEntryForDate,
  getOrCreateTodayEntry,
  upsertDailyEntry,
  saveDailySession,
  saveDailyAnswer,
  skipDailyEntry,
  queueMorningMicroTaskGeneration,
  regenerateMorningMicroTaskGeneration,
  resolveEveningMicroTasks,
  getMicroTasks,
  completeMicroTask,
  getDailyEntryHistory,
} from './service.js';
import { getRecoveryPolicy } from './recoveryPolicy.js';
import { rewardEngine } from '../gamification/reward.engine.js';
import { ensureUserExpertId } from '../ai-mentor/helpers.js';

function isDailySessionPayload(
  payload: DailyEntryInput | { session?: 'morning' | 'evening'; answers?: unknown; date?: unknown; regenerateMicroTasks?: unknown; finalize?: unknown; channel?: unknown },
): payload is {
  session: 'morning' | 'evening'
  answers: Record<string, string>
  date: string
  regenerateMicroTasks?: boolean
  finalize?: boolean
  channel?: 'tg' | 'miniapp' | 'web'
} {
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

    const rawDate = typeof req.query.date === 'string' ? req.query.date.trim() : ''
    if (rawDate) {
      const entry = await getDailyEntryForDate(user.id, rawDate)
      return res.json(entry)
    }

    const expertId = user.expertId ?? await ensureUserExpertId(user.id);
    const cached = await getCachedTodayEntry(user.id)
    const entry = cached ?? await getOrCreateTodayEntry(user.id, expertId);

    res.json(entry);
  } catch (err) {
    if (err instanceof Error && err.message === 'daily_recovery_forbidden') {
      return res.status(403).json({ error: 'daily_recovery_forbidden' })
    }
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
        regenerateMicroTasks?: boolean
        finalize?: boolean
        channel?: 'tg' | 'miniapp' | 'web'
      };

    if (isDailySessionPayload(payload)) {
      const isFinalize = Boolean(payload.finalize)
      console.info('[DailyCycle] upsertEntry payload', {
        userId: user.id,
        session: payload.session,
        date: payload.date,
        finalize: isFinalize,
        regenerateMicroTasks: Boolean(payload.regenerateMicroTasks),
      })
      const entry = await saveDailySession(user.id, {
        session: payload.session,
        answers: payload.answers,
        date: payload.date,
        finalize: payload.finalize,
        channel: payload.channel,
      })
      const regenerateMicroTasks = Boolean(payload.regenerateMicroTasks)
      const recoveryPolicy = getRecoveryPolicy(payload.date)
      const shouldGenerateMorningTasks = payload.session === 'morning' && !recoveryPolicy.isYesterday
      if (!isFinalize && !regenerateMicroTasks) {
        await rewardEngine.onDailyEntryCreated(user.id);
      }
      if (isFinalize && shouldGenerateMorningTasks) {
        void queueMorningMicroTaskGeneration(user.id, entry.id)
      }
      if (isFinalize && payload.session === 'evening') {
        console.info('[DailyCycle] finalize evening requested, resolving microtasks before response', {
          userId: user.id,
          date: payload.date,
          entryId: entry.id,
        })
        await resolveEveningMicroTasks(user.id, payload.date)
      }
      if (isFinalize) {
        res.json(entry);
        return;
      }
      if (payload.session === 'morning') {
        if (regenerateMicroTasks && shouldGenerateMorningTasks) {
          await regenerateMorningMicroTaskGeneration(user.id, entry.id)
        } else if (shouldGenerateMorningTasks) {
          queueMorningMicroTaskGeneration(user.id, entry.id)
        }
      } else {
        console.info('[DailyCycle] evening session saved, resolving microtasks', {
          userId: user.id,
          date: payload.date,
          entryId: entry.id,
        })
        await resolveEveningMicroTasks(user.id, payload.date)
      }
      res.json(entry);
      return;
    }

    const entryPayload = payload as DailyEntryInput;

    if (!entryPayload.id) {
      return res.status(400).json({ error: 'Entry ID missing' });
    }

    const expertId = user.expertId ?? await ensureUserExpertId(user.id);

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
    if (err instanceof Error && err.message === 'daily_recovery_forbidden') {
      return res.status(403).json({ error: 'daily_recovery_forbidden' })
    }
    if (err instanceof Error && err.message === 'microtasks_regeneration_limit_reached') {
      return res.status(409).json({ error: 'microtasks_regeneration_limit_reached' })
    }
    console.error('upsertEntry error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// =====================================================
// SAVE MORNING ANSWER (autosave)
// =====================================================
export async function saveMorningAnswer(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const payload = req.body as { date?: string; answers?: Record<string, string> }
    if (typeof payload.date !== 'string' || !payload.answers || typeof payload.answers !== 'object' || Array.isArray(payload.answers)) {
      return res.status(400).json({ error: 'Invalid payload' })
    }

    const entry = await saveDailySession(user.id, {
      session: 'morning',
      answers: payload.answers,
      date: payload.date,
    })

    res.json(entry)
  } catch (error) {
    if (error instanceof Error && error.message === 'daily_recovery_forbidden') {
      return res.status(403).json({ error: 'daily_recovery_forbidden' })
    }
    console.error('saveMorningAnswer error', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function saveSessionAnswer(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const payload = req.body as Partial<SaveDailyAnswerInput>
    if (
      (payload.session !== 'morning' && payload.session !== 'evening')
      || typeof payload.questionId !== 'string'
      || typeof payload.answer !== 'string'
      || typeof payload.date !== 'string'
      || typeof payload.lastQuestionIndex !== 'number'
      || (payload.channel != null && payload.channel !== 'tg' && payload.channel !== 'miniapp' && payload.channel !== 'web')
    ) {
      return res.status(400).json({ error: 'Invalid payload' })
    }

    const entry = await saveDailyAnswer(user.id, {
      entryId: req.params.entryId,
      session: payload.session,
      questionId: payload.questionId,
      answer: payload.answer,
      date: payload.date,
      lastQuestionIndex: payload.lastQuestionIndex,
      channel: payload.channel,
    })

    res.json(entry)
  } catch (error) {
    if (error instanceof Error && error.message === 'daily_recovery_forbidden') {
      return res.status(403).json({ error: 'daily_recovery_forbidden' })
    }
    console.error('saveSessionAnswer error', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export async function skipPreviousDay(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const payload = req.body as Partial<SkipDailyEntryInput>
    if (typeof payload.date !== 'string') {
      return res.status(400).json({ error: 'Invalid payload' })
    }

    const entry = await skipDailyEntry(user.id, payload.date)
    res.json(entry)
  } catch (error) {
    if (error instanceof Error && error.message === 'daily_recovery_forbidden') {
      return res.status(403).json({ error: 'daily_recovery_forbidden' })
    }
    console.error('skipPreviousDay error', error)
    res.status(500).json({ error: 'Server error' })
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
