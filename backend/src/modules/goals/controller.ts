// backend/src/modules/goals/routes.ts
/**
 * Goals Controller
 */

import {Response, NextFunction } from 'express';
import { setGoals, getLatestGoals, getPrimaryGoal, checkChoiceAlignment } from './index.js';
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import { trackEvent } from '../events/service.js';
import { resolveUserState } from '../telegram-mentor/handlers/start.js';

export async function createGoals(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { goals, primaryIndex } = req.body;

    if (!goals || !Array.isArray(goals) || goals.length < 3) {
      return res.status(400).json({ error: 'Minimum 3 goals required' });
    }

    if (typeof primaryIndex !== 'number' || primaryIndex < 0 || primaryIndex >= goals.length) {
      return res.status(400).json({ error: 'Invalid primaryIndex' });
    }

    const goalsSet = await setGoals(userId, goals, primaryIndex);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_goals_created',
      source: 'web',
      state,
      payload: {
        goalsCount: goals.length,
        primaryIndex,
      },
    })
    return res.status(200).json(goalsSet);
  } catch (error: any) {
    console.error('[GoalsController] createGoals error:', error);
    next(error);
  }
}

export async function getGoals(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const goalsSet = await getLatestGoals(userId);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_goals_viewed',
      source: 'web',
      state,
      payload: {
        hasGoals: Boolean(goalsSet),
      },
    })
    return res.status(200).json(goalsSet);
  } catch (error: any) {
    console.error('[GoalsController] getGoals error:', error);
    next(error);
  }
}

export async function getPrimary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const goal = await getPrimaryGoal(userId);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_primary_goal_viewed',
      source: 'web',
      state,
      payload: {
        hasGoal: Boolean(goal),
      },
    })
    return res.status(200).json(goal);
  } catch (error: any) {
    console.error('[GoalsController] getPrimary error:', error);
    next(error);
  }
}

export async function checkAlignment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { choice } = req.body;

    if (!choice || typeof choice !== 'string') {
      return res.status(400).json({ error: 'Choice is required' });
    }

    const alignment = await checkChoiceAlignment(userId, choice);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_goal_alignment_checked',
      source: 'web',
      state,
      payload: {
        choice,
      },
    })
    return res.status(200).json(alignment);
  } catch (error: any) {
    console.error('[GoalsController] checkAlignment error:', error);
    next(error);
  }
}
