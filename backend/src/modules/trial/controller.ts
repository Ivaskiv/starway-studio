// backend/src/modules/trial/controller.ts
/**
 * Trial Controller
 */

import { Response, NextFunction } from 'express';
import { startTrial, getTrialStatus, generateTrialMirror } from './service.js';
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import { trackEvent } from '../events/service.js';
import { resolveUserState } from '../telegram-mentor/handlers/start.js';

export async function startTrialHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await startTrial(userId);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_trial_started',
      source: 'web',
      state,
      payload: {
        currentState: user.currentState ?? null,
        currentStep: user.currentStep ?? null,
      },
    })
    return res.status(200).json(user);
  } catch (error: any) {
    if (error instanceof Error && error.message === 'SUBSCRIPTION_REQUIRED') {
      return res.status(403).json({ error: 'Потрібна активна підписка для запуску тріалу' });
    }
    if (error instanceof Error && error.message === 'TRIAL_ALREADY_USED') {
      return res.status(409).json({ error: 'Тріал вже був використаний' });
    }
    console.error('[TrialController] startTrial error:', error);
    next(error);
  }
}

export async function getTrialStatusHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const status = await getTrialStatus(userId);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_trial_status_viewed',
      source: 'web',
      state,
      payload: {
        active: status.isActive,
        daysLeft: status.daysLeft,
      },
    })
    return res.status(200).json(status);
  } catch (error: any) {
    console.error('[TrialController] getStatus error:', error);
    next(error);
  }
}

export async function generateMirrorHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { day } = req.body;
    if (!day || ![4, 7].includes(day)) {
      return res.status(400).json({ error: 'Day must be 4 or 7' });
    }

    const analysis = await generateTrialMirror(userId, day);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_trial_mirror_generated',
      source: 'web',
      state,
      payload: {
        day,
      },
    })
    return res.status(200).json({ analysis });
  } catch (error: any) {
    console.error('[TrialController] generateMirror error:', error);
    next(error);
  }
}
