import { Response, NextFunction } from 'express';
import * as onboardingService from './services.js';
import type { OnboardingStage } from './types.js';
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import { trackEvent } from '../events/service.js';
import { resolveUserState } from '../telegram-mentor/handlers/start.js';

function toJsonPayload(value: unknown): string {
  return JSON.stringify(value);
}

export async function getProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const progress = await onboardingService.getProgress(userId);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_onboarding_progress_viewed',
      source: 'web',
      state,
      payload: toJsonPayload(progress),
    })
    res.status(200).json(progress);
  } catch (err: any) {
    console.error('[Onboarding] getProgress error:', err);
    if (err.message === 'User not found') return res.status(404).json({ error: 'User not found' });
    next(err);
  }
}

export async function completeStage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { stage } = req.body;
    if (!stage) return res.status(400).json({ error: 'Stage is required' });

    const progress = await onboardingService.completeStage({ userId, stage });
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_onboarding_stage_completed',
      source: 'web',
      state,
      payload: {
        stage,
      },
    })
    res.status(200).json(progress);
  } catch (err: any) {
    console.error('[Onboarding] completeStage error:', err);
    if (err.message?.includes('Cannot complete stage')) return res.status(400).json({ error: err.message });
    next(err);
  }
}

export async function updateProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { stage } = req.body;
    if (!stage) return res.status(400).json({ error: 'Stage is required' });

    const progress = await onboardingService.updateProgress({ userId, stage });
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_onboarding_progress_updated',
      source: 'web',
      state,
      payload: {
        stage,
      },
    })
    res.status(200).json(progress);
  } catch (err) {
    console.error('[Onboarding] updateProgress error:', err);
    next(err);
  }
}

export async function canAccessStage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { stage } = req.params;
    const canAccess = await onboardingService.canAccessStage(userId, stage as OnboardingStage);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_onboarding_stage_checked',
      source: 'web',
      state,
      payload: {
        stage,
        canAccess,
      },
    })
    res.status(200).json({ stage, canAccess });
  } catch (err) {
    console.error('[Onboarding] canAccessStage error:', err);
    next(err);
  }
}
