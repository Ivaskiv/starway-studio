// backend/src/modules/ai-mentor/controllers/setup.ts


import { Request, Response, NextFunction } from 'express';
import {
  getSetupProgress,
  configureWheel,
  configureQuestions,
  completeSetup,
  QuestionsConfig,
  generateQuestionsVariants,
} from '../services/setup.js';
import { WheelScore } from '@/modules/wheel/types.js';

// ==========================================
// SETUP ENDPOINTS
// ==========================================

/**
 * GET /api/mentor/setup/progress
 * Get current setup progress
 */
export async function getProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const progress = await getSetupProgress(userId);

    return res.status(200).json(progress);
  } catch (error: any) {
    console.error('[SetupController] getProgress error:', error);
    next(error);
  }
}

/**
 * POST /api/mentor/setup/wheel
 * Configure wheel balance
 */
export async function setupWheel(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { scores } = req.body;

    if (!scores || !Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({ error: 'Scores are required' });
    }

    // Validate scores structure
    const validScores = scores.every((s: any) => 
      s.categoryId && 
      typeof s.score === 'number' && 
      s.score >= 1 && 
      s.score <= 10
    );

    if (!validScores) {
      return res.status(400).json({ 
        error: 'Invalid scores format. Each score must have categoryId and score (1-10)' 
      });
    }

    const result = await configureWheel(userId, scores as WheelScore[]);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[SetupController] setupWheel error:', error);
    next(error);
  }
}

/**
 * POST /api/mentor/setup/questions
 * Configure daily questions
 */
export async function setupQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { frequency, morningQuestions, eveningQuestions, dailyQuestions, customQuestions, telegramContact } = req.body;

    if (!frequency || !['morning', 'evening', 'both', 'daily'].includes(frequency)) {
      return res.status(400).json({ 
        error: 'Invalid frequency. Must be: morning, evening, both, or daily' 
      });
    }

    const config: QuestionsConfig = {
      frequency,
      morningQuestions,
      eveningQuestions,
      dailyQuestions,
      customQuestions,
      telegramContact,
    };

    const result = await configureQuestions(userId, config);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[SetupController] setupQuestions error:', error);
    next(error);
  }
}

/**
 * POST /api/mentor/setup/questions/generate
 * Generate up to 3 suggested question sets for mentor setup.
 */
export async function generateQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { frequency, goal, audience, tone } = req.body || {};
    if (!frequency || !['morning', 'evening', 'both', 'daily'].includes(frequency)) {
      return res.status(400).json({
        error: 'Invalid frequency. Must be: morning, evening, both, or daily',
      });
    }

    const variants = await generateQuestionsVariants({ frequency, goal, audience, tone });
    return res.status(200).json({ variants });
  } catch (error: any) {
    console.error('[SetupController] generateQuestions error:', error);
    next(error);
  }
}

/**
 * POST /api/mentor/setup/complete
 * Complete setup and activate mentor
 */
export async function finishSetup(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await completeSetup(userId);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[SetupController] finishSetup error:', error);
    
    if (error.message.includes('not complete')) {
      return res.status(400).json({ error: error.message });
    }
    
    next(error);
  }
}
