// backend/src/modules/five-points/controller.ts
import type {  Response } from 'express';
import { fivePointsService } from './index.js';
import { fivePointsRepo } from './repo.js';
import type { AuthenticatedRequest } from '../../types/globalTypes.js';
import { trackEvent } from '../events/service.js';
import { resolveUserState } from '../telegram-mentor/handlers/start.js';

const repo = fivePointsRepo();
const service = fivePointsService(repo);

export const getEnrollmentHandler = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });

  try {
    const enrollment = await repo.getEnrollment(req.user.id);
    const state = await resolveUserState(req.user.id).catch(() => null)
    await trackEvent({
      userId: req.user.id,
      type: 'web_five_points_enrollment_viewed',
      source: 'web',
      state,
      payload: {
        enrolled: Boolean(enrollment),
      },
    })
    return res.json({ enrollment });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
};

export const enrollHandler = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });

  try {
    const existing = await repo.getEnrollment(req.user.id);
    if (existing) return res.status(409).json({ error: 'already_enrolled' });

    const enrollment = await repo.createEnrollment(req.user.id, process.env.FIVE_POINTS_MODULE_ID ?? 'default-five-points-module');
    await repo.updateProgress(enrollment.id, { completedLessons: 0, totalPoints: 0, completed: false, steps: [] });
    const state = await resolveUserState(req.user.id).catch(() => null)
    await trackEvent({
      userId: req.user.id,
      type: 'web_five_points_enrolled',
      source: 'web',
      state,
      payload: {
        enrollmentId: enrollment.id,
      },
    })

    return res.status(201).json({ enrollment, progress: enrollment.progress });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
};

export const progressHandler = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });

  try {
    const enrollment = await repo.getEnrollment(req.user.id);
    if (!enrollment) return res.status(404).json({ error: 'not_enrolled' });
    if (!enrollment.progress) return res.status(404).json({ error: 'progress_not_found' });

    const progress = await repo.updateProgress(enrollment.id, req.body);
    const state = await resolveUserState(req.user.id).catch(() => null)
    await trackEvent({
      userId: req.user.id,
      type: 'web_five_points_progress_updated',
      source: 'web',
      state,
      payload: {
        enrollmentId: enrollment.id,
      },
    })
    return res.json({ progress });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
};
