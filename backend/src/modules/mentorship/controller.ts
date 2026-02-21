// backend/src/modules/mentorship/controller.ts
/**
 * Mentorship Controller
 */

import { Request, Response, NextFunction } from 'express';
import {
  checkMentorshipEligibility,
  createMentorshipOffer,
  activateMentorship,
  getMentorship,
  getMentorshipOffer,
  updateMentorshipStatus as updateMentorshipStatusService 
} from './service.js';
import { MentorshipStatus } from '@/modules/mentorship/types.js';

export const MENTORSHIP_STATUSES: MentorshipStatus[] = ['pending', 'accepted', 'rejected', 'completed'];

export async function checkEligibility(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const eligible = await checkMentorshipEligibility(userId);
    return res.status(200).json({ eligible });
  } catch (error: any) {
    console.error('[MentorshipController] checkEligibility error:', error);
    next(error);
  }
}

export async function createOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { reason, stabilityDays } = req.body;

    if (!reason || typeof stabilityDays !== 'number') {
      return res.status(400).json({ error: 'reason and stabilityDays required' });
    }

    const offer = await createMentorshipOffer(userId, reason, stabilityDays);
    return res.status(200).json(offer);
  } catch (error: any) {
    console.error('[MentorshipController] createOffer error:', error);
    next(error);
  }
}

export async function activate(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { mentorId } = req.body;

    if (!mentorId) {
      return res.status(400).json({ error: 'mentorId required' });
    }

    const mentorship = await activateMentorship(userId, mentorId);
    return res.status(200).json(mentorship);
  } catch (error: any) {
    console.error('[MentorshipController] activate error:', error);
    next(error);
  }
}

export async function getMyMentorship(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const mentorship = await getMentorship(userId);
    return res.status(200).json(mentorship);
  } catch (error: any) {
    console.error('[MentorshipController] getMyMentorship error:', error);
    next(error);
  }
}

export async function getMyOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const offer = await getMentorshipOffer(userId);
    return res.status(200).json(offer);
  } catch (error: any) {
    console.error('[MentorshipController] getMyOffer error:', error);
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Перевірка статусу
    if (typeof status !== 'string' || !MENTORSHIP_STATUSES.includes(status as MentorshipStatus)) {
      return res.status(400).json({ error: 'invalid_status' });
    }

    // TS знає що це вже допустимий MentorshipStatus
    const safeStatus = status as MentorshipStatus;

    const mentorship = await updateMentorshipStatusService(id, safeStatus, notes);
    return res.status(200).json(mentorship);
  } catch (error: any) {
    console.error('[MentorshipController] updateStatus error:', error);
    next(error);
  }
}
