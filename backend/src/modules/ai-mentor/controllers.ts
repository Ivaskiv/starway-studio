import type { Response } from 'express';
import { prisma } from '../../db/client.js';
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import * as aiService from './services.js';
import { trackEvent, trackQuestionEvent } from '../events/service.js';
import { resolveUserState } from '../telegram-mentor/handlers/start.js';
import { assistantChat } from '../assistant/service.js';
import { createWheelAssessment } from '../wheel/controller.js';
import type { StreamChatMessage } from './types.js';
import { detectStateInstability, sendStateCourseOffer } from '@/products/ab-system/telegram/service.js';
import {
  completeMicroTask as completeRichMicroTask,
  createMicroTask,
  deleteMicroTask,
  listMicroTasksForUser,
  skipMicroTask as skipRichMicroTask,
  updateMicroTaskProgress,
  updateMicroTaskStep,
} from '../microTask/service.js';

const requireUser = (req: AuthenticatedRequest, res: Response): string | null => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  return req.user.id;
};

const resolveRequestId = (req: AuthenticatedRequest, platform: 'website' | 'web' = 'website') => {
  const headerValue = req.headers['x-request-id']
  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim()
  }
  return `${platform}:${req.user?.id ?? 'anonymous'}:${Date.now()}`
}

const safeHandler = (fn: (req: AuthenticatedRequest, res: Response) => Promise<void>) =>
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      console.error('[ABsystem]', error);
      res.status(500).json({ error: 'server_error', message: (error as Error).message });
    }
  };

export const sendMessage = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const message = String(req.body.message ?? '')
  const state = await resolveUserState(userId).catch(() => null)
  await trackQuestionEvent({
    userId,
    source: 'web',
    state,
    text: message,
    detectedIntent: 'general',
    productContext: state?.startsWith('lm_') ? 'lead_magnet' : state === 'in_trial' ? 'trial' : state === 'subscribed' ? 'subscription' : 'general',
    category: 'general',
  })
  const result = await assistantChat(userId, message, {
    platform: 'website',
    requestId: resolveRequestId(req),
  });
  await trackEvent({
    userId,
    type: 'web_ai_mentor_chat_completed',
    source: 'web',
    state,
    payload: {
      replyLength: result.message.length,
    },
  })
  res.json(result);
});

export const getSession = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const session = await aiService.getOrCreateSession(userId, String(req.query.sessionId || ''));
  const state = await resolveUserState(userId).catch(() => null)
  await trackEvent({
    userId,
    type: 'web_ai_mentor_session_opened',
    source: 'web',
    state,
    payload: {
      sessionId: session.id,
    },
  })
  res.json(session);
});

export const getHistory = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const history = await aiService.getChatHistory(userId);
  res.json(history);
});

export const getContext = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const context = await aiService.getMentorContext(userId);
  const state = await resolveUserState(userId).catch(() => null)
  await trackEvent({
    userId,
    type: 'web_ai_mentor_context_viewed',
    source: 'web',
    state,
    payload: {
      hasPrimaryGoal: Boolean(context.primaryGoal),
      lastState: context.lastState,
      streakDays: context.streakDays,
    },
  })
  res.json(context);
});

export const getInstantInsight = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const insight = await aiService.getInstantInsight(userId);
  res.json(insight);
});

export const getContextByUserId = safeHandler(async (req, res) => {
  const userId = String(req.params.userId ?? '')
  if (!userId) {
    res.status(400).json({ error: 'user_id_required' })
    return
  }

  const context = await aiService.getMentorExtendedContext(userId)
  await trackEvent({
    userId,
    type: 'web_ai_mentor_context_by_user_viewed',
    source: 'web',
    state: await resolveUserState(userId).catch(() => null),
    payload: {
      hasPrimaryGoal: Boolean(context.primaryGoal),
      streakDays: context.streakDays,
    },
  })
  res.json(context)
})

export const getOnboardingStage = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const stage = await aiService.advanceOnboarding(userId);
  res.json({ stage });
});

export const submitDailyCycle = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const payload = { userId, ...req.body };
  const saved = await aiService.submitDailyCycle(payload);
  res.json(saved);
});

export const listDailyEntries = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const entries = await aiService.listDailyEntries(userId, Number(req.query.limit) || 30);
  res.json(entries);
});

export const latestDailyEntry = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const latest = await aiService.getLatestDailyEntry(userId);
  res.json(latest);
});

export const todayEntry = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const hasEntry = await aiService.hasTodayEntry(userId);
  res.json({ hasEntry });
});

export const processWheel = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const result = await aiService.processWheel(userId, req.body.scores);
  res.json(result);
});

export const getTrialStatus = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  res.json(await aiService.getTrialStatus(userId));
});

export const getPaidStatus = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  res.json(await aiService.getPaidAccessStatus(userId));
});

export const getMicroTasks = safeHandler(async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const tasks = await listMicroTasksForUser(userId, 'all')
  res.json(tasks)
})

export const createManualMicroTask = safeHandler(async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const title = String(req.body.title ?? '').trim()
  const description = String(req.body.description ?? '').trim()
  if (!title) {
    res.status(400).json({ error: 'title_required' })
    return
  }

  const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : new Date()
  if (Number.isNaN(dueDate.getTime())) {
    res.status(400).json({ error: 'invalid_due_date' })
    return
  }

  const replaceExisting = Boolean(req.body.replaceExisting)
  const replaceDateKey = typeof req.body.date === 'string' ? req.body.date.trim() : ''

  if (replaceExisting && replaceDateKey) {
    const dayStart = new Date(`${replaceDateKey}T00:00:00.000Z`)
    if (!Number.isNaN(dayStart.getTime())) {
      const nextDay = new Date(dayStart)
      nextDay.setUTCDate(nextDay.getUTCDate() + 1)

      await prisma.microTask.deleteMany({
        where: {
          userId,
          status: { in: ['active', 'manual', 'skipped', 'expired'] },
          createdAt: {
            gte: dayStart,
            lt: nextDay,
          },
        },
      })
    }
  }

  const created = await createMicroTask({
    userId,
    expertId: req.user?.expertId ?? null,
    title,
    description: description || undefined,
    why: String(req.body.why ?? 'Створено вручну на сьогодні').trim() || 'Створено вручну на сьогодні',
    steps: Array.isArray(req.body.steps) ? req.body.steps.filter((step: unknown): step is string => typeof step === 'string') : [],
    sphere: 'manual',
    priority: 'medium',
    status: 'manual',
    xpReward: 10,
    daysToComplete: 1,
    dueDate,
    aiContext: JSON.stringify({
      source: 'manual',
      createdAt: new Date().toISOString(),
    }),
  })

  res.json(created)
})

export const replaceManualMicroTasks = safeHandler(async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const dateKey = typeof req.body.date === 'string' ? req.body.date.trim() : ''
  const rawTasks = Array.isArray(req.body.tasks)
    ? req.body.tasks.filter((task: unknown): task is string => typeof task === 'string')
    : []
  const tasks = rawTasks
    .map((task: string) => task.trim())
    .filter((task: string) => task.length > 0)
    .slice(0, 7)

  if (!dateKey) {
    res.status(400).json({ error: 'date_required' })
    return
  }

  if (!tasks.length) {
    res.status(400).json({ error: 'tasks_required' })
    return
  }

  const dayStart = new Date(`${dateKey}T00:00:00.000Z`)
  if (Number.isNaN(dayStart.getTime())) {
    res.status(400).json({ error: 'invalid_date' })
    return
  }

  const nextDay = new Date(dayStart)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const dueDate = new Date(`${dateKey}T23:59:00.000Z`)

  await prisma.microTask.deleteMany({
    where: {
      userId,
      status: { in: ['active', 'manual', 'skipped', 'expired'] },
      createdAt: {
        gte: dayStart,
        lt: nextDay,
      },
    },
  })

  const created = await Promise.all(tasks.map((taskTitle: string) => (
    createMicroTask({
      userId,
      expertId: req.user?.expertId ?? null,
      title: taskTitle,
      description: taskTitle,
      why: 'Оновлено вручну на сьогодні',
      steps: [],
      sphere: 'manual',
      priority: 'medium',
      status: 'manual',
      xpReward: 10,
      daysToComplete: 1,
      dueDate,
      aiContext: JSON.stringify({
        source: 'manual_replace',
        createdAt: new Date().toISOString(),
        dateKey,
      }),
    })
  )))

  res.json(created)
})

export const completeMicroTask = safeHandler(async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const { id } = req.params
  await completeRichMicroTask(id, userId)

  res.json({ ok: true })
})

export const skipMicroTask = safeHandler(async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const { id } = req.params
  await skipRichMicroTask(id, userId)

  res.json({ ok: true })
})

export const updateMicroTaskProgressController = safeHandler(async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const { id } = req.params
  const progressPercent = Number(req.body.progressPercent)

  const updated = await updateMicroTaskProgress(id, userId, progressPercent)
  if (!updated) {
    res.status(404).json({ error: 'task_not_found' })
    return
  }

  res.json({ ok: true })
})

export const deleteMicroTaskController = safeHandler(async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const { id } = req.params
  const deleted = await deleteMicroTask(id, userId)
  if (!deleted) {
    res.status(404).json({ error: 'task_not_found' })
    return
  }

  res.json({ ok: true })
})

export const updateMicroTaskStepController = safeHandler(async (req, res) => {
  const userId = requireUser(req, res)
  if (!userId) return

  const { id } = req.params
  const stepIndex = Number(req.body.stepIndex)
  const done = Boolean(req.body.done)

  const updated = await updateMicroTaskStep(id, userId, stepIndex, done)
  if (!updated) {
    res.status(404).json({ error: 'task_not_found' })
    return
  }

  res.json({ ok: true })
})

export const completeOnboardingStage = safeHandler(async (req, res) => {
  await aiService.completeStage(req.body);
  res.json({ success: true });
});

export const updateOnboardingProgress = safeHandler(async (req, res) => {
  await aiService.updateProgress(req.body);
  res.json({ success: true });
});

export const generateAffirmation = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const result = await aiService.generateAffirmation(req.body.type || 'morning');
  res.json(result);
});

export const morningSession = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const result = await aiService.createMorningSession(userId)
  const state = await resolveUserState(userId).catch(() => null)
  await trackEvent({
    userId,
    type: 'web_ai_mentor_morning_started',
    source: 'web',
    state,
    payload: {
      hasSession: Boolean(result),
    },
  })
  res.json(result);
});

export const streamChat = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = requireUser(req, res)
    if (!userId) {
      return
    }

    const message = String(req.body.message ?? '')
    const history = (Array.isArray(req.body.history) ? req.body.history : []) as StreamChatMessage[]
    const state = await resolveUserState(userId).catch(() => null)

    await trackQuestionEvent({
      userId,
      source: 'web',
      state,
      text: message,
      detectedIntent: 'general',
      productContext: state?.startsWith('lm_') ? 'lead_magnet' : state === 'in_trial' ? 'trial' : state === 'subscribed' ? 'subscription' : 'general',
      category: 'general',
    })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const result = await assistantChat(userId, message, {
      platform: 'website',
      requestId: resolveRequestId(req),
    })

    let aborted = false
    let replyLength = 0

    req.on('close', () => {
      aborted = true
    })

    const tokens = result.message.match(/.{1,80}/g) ?? ['']

    for (const token of tokens) {
      if (aborted) {
        break
      }

      if (token) {
        replyLength += token.length
        res.write(`data: ${JSON.stringify({ delta: token, token })}\n\n`)
      }
    }

    await trackEvent({
      userId,
      type: 'web_ai_mentor_stream_completed',
      source: 'web',
      state,
      payload: {
        replyLength,
        historySize: history.length,
        scenario: result.meta.scenario,
        fallbackActivated: result.meta.fallbackActivated,
      },
    })

    if (!aborted) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    }
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'server_error', message: (error as Error).message })
      return
    }

    res.write('data: [DONE]\n\n')
    res.end()
  }
}

export const eveningSession = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const result = await aiService.createEveningSession(userId)
  const state = await resolveUserState(userId).catch(() => null)
  await trackEvent({
    userId,
    type: 'web_ai_mentor_evening_started',
    source: 'web',
    state,
    payload: {
      hasSession: Boolean(result),
    },
  })
  res.json(result);
});

export const weeklySession = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const response = await aiService.generatePayload({
    userId,
    type: 'weekly',
    productId: req.body.productId,
    params: req.body.params,
  });
  res.json(response);
});

export const pdfReport = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const response = await aiService.generatePayload({
    userId,
    type: 'pdf',
    productId: req.body.productId,
    params: req.body.params,
  });
  res.json(response);
});

export const generate = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const intention = req.body.intent as import('./types.js').GenerationIntent;
  const response = await aiService.generatePayload({
    userId,
    type: intention,
    productId: req.body.productId,
    params: req.body.params,
  });
  res.json(response);
});

export const setupWheel = createWheelAssessment;

export const generateQuestions = safeHandler(async (req, res) => {
  const prompt = `Генерація запитань: ${JSON.stringify(req.body)}`;
  const generation = await aiService.aiGenerate({ prompt });
  res.json({ variants: generation.text.split('\n') });
});

export const submitQuestions = safeHandler(async (req, res) => {
  res.status(204).send();
});

export const completeSetup = safeHandler(async (req, res) => {
  await aiService.updateProgress({ userId: req.user?.id ?? '', stage: 'COMPLETED' });
  res.json({ success: true });
});

// ── weeklyReportHandler  ─────────────────────────────────────────────
/**
 * GET /api/mentor/weekly-report?productId=...
 * Повертає тижневий звіт з метриками, Hero варіантами та рекламними текстами
 */
export const weeklyReportHandler = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const productId = typeof req.query.productId === 'string'
    ? req.query.productId
    : undefined;

  const report = await aiService.generateWeeklyReport(userId, productId)
  if (await detectStateInstability(userId).catch(() => false)) {
    await sendStateCourseOffer(userId).catch(() => undefined)
  }
  res.json(report);
});
