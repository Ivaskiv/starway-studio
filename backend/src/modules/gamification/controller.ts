import type { Response } from 'express'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { getProfile, getStreakSummary } from './service.js'

export async function getProfileHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) return res.status(401).json({ error: 'unauthorized' })
  try {
    const profile = await getProfile(req.user.id)
    return res.json({ success: true, profile })
  } catch (err) {
    console.error('❌ getGamificationProfile', err)
    return res.status(500).json({ error: 'server_error' })
  }
}

export async function getStreakSummaryHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) return res.status(401).json({ error: 'unauthorized' })
  try {
    const summary = await getStreakSummary(req.user.id)
    return res.json({ success: true, summary })
  } catch (err) {
    console.error('❌ getGamificationStreak', err)
    return res.status(500).json({ error: 'server_error' })
  }
}
