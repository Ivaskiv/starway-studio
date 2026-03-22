import type { Response } from 'express';
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import * as aiService from './services.js';
import { trackEvent, trackQuestionEvent } from '../events/service.js';
import { resolveUserState } from '../telegram-mentor/handlers/start.js';
import { createWheelAssessment } from '../wheel/controller.js';
import type { StreamChatMessage } from './types.js';

const requireUser = (req: AuthenticatedRequest, res: Response): string | null => {
  if (!req.user?.id) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  return req.user.id;
};

const safeHandler = (fn: (req: AuthenticatedRequest, res: Response) => Promise<void>) =>
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      console.error('[AI Mentor]', error);
      res.status(500).json({ error: 'server_error', message: (error as Error).message });
    }
  };

export const sendMessage = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const state = await resolveUserState(userId).catch(() => null)
  await trackQuestionEvent({
    userId,
    source: 'web',
    state,
    text: String(req.body.message ?? ''),
    detectedIntent: 'general',
    productContext: state?.startsWith('lm_') ? 'lead_magnet' : state === 'in_trial' ? 'trial' : state === 'subscribed' ? 'subscription' : 'general',
    category: 'general',
  })
  const result = await aiService.sendMessage({ userId, message: req.body.message, context: req.body.context });
  await trackEvent({
    userId,
    type: 'web_ai_mentor_chat_completed',
    source: 'web',
    state,
    payload: {
      replyLength: result.mentorMessage.content.length,
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
    const userId = String(req.body.userId ?? '')
    if (!userId) {
      res.status(400).json({ error: 'user_id_required' })
      return
    }

    const message = String(req.body.message ?? '')
    const history = (Array.isArray(req.body.history) ? req.body.history : []) as StreamChatMessage[]
    const context = req.body.context as import('./types.js').MentorExtendedContext | undefined
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

    const stream = await aiService.createMentorChatStream({
      userId,
      message,
      history,
      context,
    })

    let aborted = false
    let replyLength = 0

    req.on('close', () => {
      aborted = true
    })

    for await (const chunk of stream) {
      if (aborted) {
        break
      }

      const token = chunk.choices[0]?.delta?.content || ''
      if (token) {
        replyLength += token.length
        res.write(`data: ${JSON.stringify({ token })}\n\n`)
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
      },
    })

    if (!aborted) {
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
  res.json(report);
});
