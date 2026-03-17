import type { Response } from 'express';
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import * as aiService from './services.js';

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
  const result = await aiService.sendMessage({ userId, message: req.body.message, context: req.body.context });
  res.json(result);
});

export const getSession = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const session = await aiService.getOrCreateSession(userId, String(req.query.sessionId || ''));
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
  res.json(context);
});

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
  res.json(await aiService.createMorningSession(userId));
});

export const eveningSession = safeHandler(async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  res.json(await aiService.createEveningSession(userId));
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

export const setupWheel = processWheel;

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
