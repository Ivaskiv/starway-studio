// backend/src/modules/goals/routes.ts
/**
 * Goals Controller
 */

import { Request, Response, NextFunction } from 'express';
import { setGoals, getLatestGoals, getPrimaryGoal, checkChoiceAlignment } from './service.js';

export async function createGoals(req: Request, res: Response, next: NextFunction) {
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
    return res.status(200).json(goalsSet);
  } catch (error: any) {
    console.error('[GoalsController] createGoals error:', error);
    next(error);
  }
}

export async function getGoals(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const goalsSet = await getLatestGoals(userId);
    return res.status(200).json(goalsSet);
  } catch (error: any) {
    console.error('[GoalsController] getGoals error:', error);
    next(error);
  }
}

export async function getPrimary(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const goal = await getPrimaryGoal(userId);
    return res.status(200).json(goal);
  } catch (error: any) {
    console.error('[GoalsController] getPrimary error:', error);
    next(error);
  }
}

export async function checkAlignment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { choice } = req.body;

    if (!choice || typeof choice !== 'string') {
      return res.status(400).json({ error: 'Choice is required' });
    }

    const alignment = await checkChoiceAlignment(userId, choice);
    return res.status(200).json(alignment);
  } catch (error: any) {
    console.error('[GoalsController] checkAlignment error:', error);
    next(error);
  }
}