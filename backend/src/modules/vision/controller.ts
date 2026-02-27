// backend/src/modules/vision/controller.ts
/**
 * Vision Controller
 */

import { Response, NextFunction } from 'express';
import { createVisionStatement, getLatestVision, updateVisionStatement } from './service.js';
import { VisionAnswers } from './types.js';
import { AuthenticatedRequest } from '@/types/globalTypes.js';

export async function createVision(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { idealLife, noLongerNormal, pointB } = req.body;

    if (!idealLife || !noLongerNormal || !pointB) {
      return res.status(400).json({ 
        error: 'Missing required fields: idealLife, noLongerNormal, pointB' 
      });
    }

    const answers: VisionAnswers = { idealLife, noLongerNormal, pointB };
    const vision = await createVisionStatement(userId, answers);

    return res.status(200).json(vision);
  } catch (error: any) {
    console.error('[VisionController] createVision error:', error);
    next(error);
  }
}

export async function getVision(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const vision = await getLatestVision(userId);
    return res.status(200).json(vision);
  } catch (error: any) {
    console.error('[VisionController] getVision error:', error);
    next(error);
  }
}

export async function updateVision(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id, idealLife, noLongerNormal, pointB } = req.body;

    if (!id || !idealLife || !noLongerNormal || !pointB) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const answers: VisionAnswers = { idealLife, noLongerNormal, pointB };
    const vision = await updateVisionStatement(id, answers);

    return res.status(200).json(vision);
  } catch (error: any) {
    console.error('[VisionController] updateVision error:', error);
    next(error);
  }
}