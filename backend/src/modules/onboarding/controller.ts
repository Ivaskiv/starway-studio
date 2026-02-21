import { Request, Response, NextFunction } from 'express';
import * as onboardingService from './services.js';
import type { OnboardingStage } from './types.js';

export async function getProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const progress = await onboardingService.getProgress(userId);
    res.status(200).json(progress);
  } catch (err: any) {
    console.error('[Onboarding] getProgress error:', err);
    if (err.message === 'User not found') return res.status(404).json({ error: 'User not found' });
    next(err);
  }
}

export async function completeStage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { stage } = req.body;
    if (!stage) return res.status(400).json({ error: 'Stage is required' });

    const progress = await onboardingService.completeStage({ userId, stage });
    res.status(200).json(progress);
  } catch (err: any) {
    console.error('[Onboarding] completeStage error:', err);
    if (err.message?.includes('Cannot complete stage')) return res.status(400).json({ error: err.message });
    next(err);
  }
}

export async function updateProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { stage } = req.body;
    if (!stage) return res.status(400).json({ error: 'Stage is required' });

    const progress = await onboardingService.updateProgress({ userId, stage });
    res.status(200).json(progress);
  } catch (err) {
    console.error('[Onboarding] updateProgress error:', err);
    next(err);
  }
}

export async function canAccessStage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { stage } = req.params;
    const canAccess = await onboardingService.canAccessStage(userId, stage as OnboardingStage);
    res.status(200).json({ stage, canAccess });
  } catch (err) {
    console.error('[Onboarding] canAccessStage error:', err);
    next(err);
  }
}
