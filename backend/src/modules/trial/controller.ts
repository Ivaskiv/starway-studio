// backend/src/modules/trial/controller.ts
/**
 * Trial Controller
 */

import { Response, NextFunction } from 'express';
import { startTrial, getTrialStatus, generateTrialMirror } from './service.js';
import { AuthenticatedRequest } from '@/types/globalTypes.js';

export async function startTrialHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await startTrial(userId);
    return res.status(200).json(user);
  } catch (error: any) {
    console.error('[TrialController] startTrial error:', error);
    next(error);
  }
}

export async function getTrialStatusHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const status = await getTrialStatus(userId);
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
    return res.status(200).json({ analysis });
  } catch (error: any) {
    console.error('[TrialController] generateMirror error:', error);
    next(error);
  }
}