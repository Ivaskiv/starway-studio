// backend/src/modules/mentorship/controller.ts
import { Response, NextFunction } from 'express'
import type { Mentorship, MentorshipOffer } from './types.ts'
import { MentorshipStatus } from '@/db/generated/prisma/client.js'
import {
  activateMentorship,
  checkMentorshipEligibility,
  createMentorshipOffer,
  getMentorship,
  getMentorshipOffer,
  updateMentorshipStatus
} from './service.js'
import { AuthenticatedRequest } from '@/types/globalTypes.js'

// ✅ допустимі статуси для апдейту
const MENTORSHIP_STATUSES: MentorshipStatus[] = [
  MentorshipStatus.PENDING,
  MentorshipStatus.ACTIVE,
  MentorshipStatus.COMPLETED,
  MentorshipStatus.CANCELLED,
]

// ── CHECK ELIGIBILITY ───────────────────────────────────────────────
export async function checkEligibility(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const eligible = await checkMentorshipEligibility(userId)
    return res.status(200).json({ eligible })
  } catch (err) {
    next(err)
  }
}

// ── CREATE OFFER ───────────────────────────────────────────────────
export async function createOffer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { expertId, stabilityDays } = req.body
    if (!expertId || typeof stabilityDays !== 'number') {
      return res.status(400).json({ error: 'expertId and stabilityDays required' })
    }

    const offer: MentorshipOffer = await createMentorshipOffer(userId, expertId, stabilityDays)
    return res.status(201).json(offer)
  } catch (err) {
    next(err)
  }
}

// ── ACTIVATE MENTORSHIP ───────────────────────────────────────────
export async function activate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const mentorship: Mentorship = await activateMentorship(userId)
    return res.status(201).json(mentorship)
  } catch (err) {
    next(err)
  }
}

// ── GET MY MENTORSHIP ─────────────────────────────────────────────
export async function getMyMentorship(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const mentorship: Mentorship | null = await getMentorship(userId)
    return res.status(200).json(mentorship)
  } catch (err) {
    next(err)
  }
}

// ── GET MY OFFER ─────────────────────────────────────────────────
export async function getMyOffer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const offer: MentorshipOffer | null = await getMentorshipOffer(userId)
    return res.status(200).json(offer)
  } catch (err) {
    next(err)
  }
}

// ── UPDATE STATUS ────────────────────────────────────────────────
export async function updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!MENTORSHIP_STATUSES.includes(status as MentorshipStatus)) {
      return res.status(400).json({ error: 'invalid_status' })
    }

    const mentorship: Mentorship = await updateMentorshipStatus(id, status as MentorshipStatus)
    return res.status(200).json(mentorship)
  } catch (err) {
    next(err)
  }
}