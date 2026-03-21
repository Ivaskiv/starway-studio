// backend/src/modules/progress/progress.controller.ts
import type { Response } from 'express';
import { getProgress, updateProgress, incrementPoints } from './service.js';
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import { trackEvent } from '../events/service.js';
import { resolveUserState } from '../telegram-mentor/handlers/start.js';

export async function getMyProgress(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const progress = await getProgress(userId);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_progress_viewed',
      source: 'web',
      state,
      payload: {
        level: progress.level ?? null,
        totalPoints: progress.totalPoints ?? 0,
      },
    })
    res.json(progress);
  } catch (error) {
    console.error('❌ Get progress error:', error);
    res.status(500).json({ error: 'server_error' });
  }
}

export async function getUserProgress(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = req.params;
    const progress = await getProgress(userId);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_progress_viewed_by_admin',
      source: 'web',
      state,
      payload: {
        level: progress.level ?? null,
        totalPoints: progress.totalPoints ?? 0,
      },
    })
    res.json(progress);
  } catch (error: any) {
    console.error('❌ Get user progress error:', error);
    if (error?.message === 'user_not_found' || error?.code === 'P2025') {
      return res.status(404).json({ error: 'user_not_found' });
    }
    res.status(500).json({ error: 'server_error' });
  }
}

export async function updateMyProgress(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const progress = await updateProgress(userId, req.body);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_progress_updated',
      source: 'web',
      state,
      payload: {
        level: progress.level ?? null,
        totalPoints: progress.totalPoints ?? 0,
      },
    })
    res.json(progress);
  } catch (error) {
    console.error('❌ Update progress error:', error);
    res.status(500).json({ error: 'server_error' });
  }
}

export async function addPoints(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { points } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({ error: 'invalid_points' });
    }

    const progress = await incrementPoints(userId, points);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_points_added',
      source: 'web',
      state,
      payload: {
        points,
        totalPoints: progress.totalPoints ?? 0,
      },
    })
    res.json(progress);
  } catch (error) {
    console.error('❌ Add points error:', error);
    res.status(500).json({ error: 'server_error' });
  }
}
