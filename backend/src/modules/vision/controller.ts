// backend/src/modules/vision/controller.ts
/**
 * Vision Controller
 */

import { Response, NextFunction } from 'express';
import { createVisionStatement, getLatestVision, updateVisionStatement } from './service.js';
import { VisionAnswers } from './types.js';
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import { trackEvent } from '../events/service.js';
import { resolveUserState } from '../telegram-mentor/handlers/start.js';

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
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_vision_created',
      source: 'web',
      state,
      payload: {
        visionId: vision?.id ?? null,
      },
    })

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
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_vision_viewed',
      source: 'web',
      state,
      payload: {
        hasVision: Boolean(vision),
      },
    })
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
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_vision_updated',
      source: 'web',
      state,
      payload: {
        visionId: id,
      },
    })

    return res.status(200).json(vision);
  } catch (error: any) {
    console.error('[VisionController] updateVision error:', error);
    next(error);
  }
}
