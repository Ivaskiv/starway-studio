import type { Response } from 'express'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import {
  createWebMapFromAI,
  getDailyAlignmentQuestion,
  getWebMap,
  runMonthlyAnalysis,
  updateGoalProgress,
} from './web-map.service.js'

export async function getWebMapHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    const map = await getWebMap(userId)
    return res.status(200).json({ map })
  } catch (error) {
    console.error('[web-map] getWebMapHandler', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'unknown_error' })
  }
}

export async function generateWebMapHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    const wheelScores = req.body?.wheelScores
    if (!wheelScores || typeof wheelScores !== 'object' || Array.isArray(wheelScores)) {
      return res.status(400).json({ error: 'invalid_wheel_scores' })
    }

    const map = await createWebMapFromAI(userId, wheelScores as Record<string, number>)
    return res.status(201).json({ map })
  } catch (error) {
    console.error('[web-map] generateWebMapHandler', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'unknown_error' })
  }
}

export async function updateGoalProgressHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    const goalId = req.params.id
    const progress = Number(req.body?.progress)
    const status = typeof req.body?.status === 'string' ? req.body.status : undefined

    if (!goalId || Number.isNaN(progress)) {
      return res.status(400).json({ error: 'invalid_goal_update' })
    }

    const goal = await updateGoalProgress(goalId, progress, status)
    return res.status(200).json({ goal })
  } catch (error) {
    console.error('[web-map] updateGoalProgressHandler', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'unknown_error' })
  }
}

export async function runMonthlyAnalysisHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    const monthPlan = await runMonthlyAnalysis(userId)
    return res.status(200).json({ monthPlan })
  } catch (error) {
    console.error('[web-map] runMonthlyAnalysisHandler', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'unknown_error' })
  }
}

export async function getDailyQuestionHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    const question = await getDailyAlignmentQuestion(userId)
    return res.status(200).json({ question })
  } catch (error) {
    console.error('[web-map] getDailyQuestionHandler', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'unknown_error' })
  }
}
