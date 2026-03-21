import type { Response } from 'express'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { getProfile, getStreakSummary } from './service.js'
import { trackEvent } from '../events/service.js'
import { resolveUserState } from '../telegram-mentor/handlers/start.js'

export async function getProfileHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) return res.status(401).json({ error: 'unauthorized' })
  try {
    const profile = await getProfile(req.user.id)
    const state = await resolveUserState(req.user.id).catch(() => null)
    await trackEvent({
      userId: req.user.id,
      type: 'web_gamification_profile_viewed',
      source: 'web',
      state,
      payload: {
        level: profile.level ?? null,
      },
    })
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
    const state = await resolveUserState(req.user.id).catch(() => null)
    await trackEvent({
      userId: req.user.id,
      type: 'web_gamification_streak_viewed',
      source: 'web',
      state,
      payload: {
        current: summary.currentStreak,
        best: summary.longestStreak,
      },
    })
    return res.json({ success: true, summary })
  } catch (err) {
    console.error('❌ getGamificationStreak', err)
    return res.status(500).json({ error: 'server_error' })
  }
}
