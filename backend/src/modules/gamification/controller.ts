import type { Response } from 'express'
import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import { getProfile, getStreakSummary, getSummary, handleGamificationEvent } from './index.js'
import { trackEvent } from '../events/service.js'
import { resolveUserState } from '../telegram-mentor/handlers/start.js'
import type { GamificationEventType } from './types.js'

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

export async function getSummaryHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) return res.status(401).json({ error: 'unauthorized' })
  try {
    const summary = await getSummary(req.user.id)
    const state = await resolveUserState(req.user.id).catch(() => null)
    await trackEvent({
      userId: req.user.id,
      type: 'web_gamification_summary_viewed',
      source: 'web',
      state,
      payload: {
        level: summary.xp.level,
        current: summary.streak.current,
      },
    })
    return res.json({ success: true, summary })
  } catch (err) {
    console.error('❌ getGamificationSummary', err)
    return res.status(500).json({ error: 'server_error' })
  }
}

export async function postEventHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) return res.status(401).json({ error: 'unauthorized' })

  const event = req.body?.event as GamificationEventType | undefined
  if (!event || !['DAILY_COMPLETED', 'AI_MESSAGE_SENT', 'TASK_COMPLETED'].includes(event)) {
    return res.status(400).json({ error: 'invalid_event' })
  }

  try {
    const summary = await handleGamificationEvent(req.user.id, event)
    const state = await resolveUserState(req.user.id).catch(() => null)
    await trackEvent({
      userId: req.user.id,
      type: 'web_gamification_event_recorded',
      source: typeof req.body?.source === 'string' ? req.body.source : 'web',
      state,
      payload: { event },
    })

    return res.json({ success: true, summary })
  } catch (err) {
    console.error('❌ postGamificationEvent', err)
    return res.status(500).json({ error: 'server_error' })
  }
}
