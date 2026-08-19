// backend/src/modules/mentorship/controller.ts
import { Response, NextFunction } from 'express'
import {
  createMentorship,
  activateMentorship,
  pauseMentorship,
  resumeMentorship,
  completeMentorship,
  cancelMentorship,
  getActiveMentorship,
  hasActiveMentorship,
} from './service.js'
import { AuthenticatedRequest } from '../../types/globalTypes.js'
import { trackEvent } from '../events/service.js'
import { resolveUserState } from '../telegram-mentor/handlers/start.js'

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user?.id) {
    throw new Error('Unauthorized')
  }
  return req.user.id
}

/* CHECK ACCESS FLAG */
export async function checkEligibility(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = requireUserId(req)
    const hasAccess = await hasActiveMentorship(userId)
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_mentorship_access_checked',
      source: 'web',
      state,
      payload: {
        hasMentorship: hasAccess,
      },
    })
    res.status(200).json({ hasMentorship: hasAccess })
  } catch (err) {
    next(err)
  }
}

/* CREATE PENDING CONTRACT */
export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = requireUserId(req)
    const { expertId } = req.body

    if (!expertId) {
      return res.status(400).json({ error: 'expertId required' })
    }

    const mentorship = await createMentorship(userId, expertId)
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_mentorship_created',
      source: 'web',
      state,
      payload: {
        mentorshipId: mentorship.id,
        expertId,
        status: mentorship.status,
      },
    })
    res.status(201).json(mentorship)
  } catch (err) {
    next(err)
  }
}

/* ACTIVATE CONTRACT */
export async function activate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = requireUserId(req)
    const { expertId } = req.body

    if (!expertId) {
      return res.status(400).json({ error: 'expertId required' })
    }

    const mentorship = await activateMentorship(userId, expertId)
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_mentorship_activated',
      source: 'web',
      state,
      payload: {
        mentorshipId: mentorship.id,
        expertId,
        status: mentorship.status,
      },
    })
    res.status(200).json(mentorship)
  } catch (err) {
    next(err)
  }
}

/* PAUSE */
export async function pause(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params
    const mentorship = await pauseMentorship(id)
    const state = req.user?.id ? await resolveUserState(req.user.id).catch(() => null) : null
    await trackEvent({
      userId: req.user?.id ?? null,
      type: 'web_mentorship_paused',
      source: 'web',
      state,
      payload: {
        mentorshipId: mentorship.id,
        status: mentorship.status,
      },
    })
    res.status(200).json(mentorship)
  } catch (err) {
    next(err)
  }
}

/* RESUME */
export async function resume(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params
    const mentorship = await resumeMentorship(id)
    const state = req.user?.id ? await resolveUserState(req.user.id).catch(() => null) : null
    await trackEvent({
      userId: req.user?.id ?? null,
      type: 'web_mentorship_resumed',
      source: 'web',
      state,
      payload: {
        mentorshipId: mentorship.id,
        status: mentorship.status,
      },
    })
    res.status(200).json(mentorship)
  } catch (err) {
    next(err)
  }
}

/* COMPLETE */
export async function complete(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params
    const mentorship = await completeMentorship(id)
    const state = req.user?.id ? await resolveUserState(req.user.id).catch(() => null) : null
    await trackEvent({
      userId: req.user?.id ?? null,
      type: 'web_mentorship_completed',
      source: 'web',
      state,
      payload: {
        mentorshipId: mentorship.id,
        status: mentorship.status,
      },
    })
    res.status(200).json(mentorship)
  } catch (err) {
    next(err)
  }
}

/* CANCEL */
export async function cancel(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params
    const mentorship = await cancelMentorship(id)
    const state = req.user?.id ? await resolveUserState(req.user.id).catch(() => null) : null
    await trackEvent({
      userId: req.user?.id ?? null,
      type: 'web_mentorship_cancelled',
      source: 'web',
      state,
      payload: {
        mentorshipId: mentorship.id,
        status: mentorship.status,
      },
    })
    res.status(200).json(mentorship)
  } catch (err) {
    next(err)
  }
}

/* GET ACTIVE */
export async function getMyMentorship(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = requireUserId(req)
    const mentorship = await getActiveMentorship(userId)
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_mentorship_active_viewed',
      source: 'web',
      state,
      payload: {
        hasActiveMentorship: Boolean(mentorship),
        mentorshipId: mentorship?.id ?? null,
      },
    })
    res.status(200).json(mentorship)
  } catch (err) {
    next(err)
  }
}
