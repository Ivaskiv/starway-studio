// backend/src/modules/five-points/controller.ts
import type {  Response } from 'express';
import { fivePointsService } from './service.js';
import { fivePointsRepo } from './repo.js';
import type { AuthenticatedRequest } from '../../types/globalTypes.js';

const repo = fivePointsRepo();
const service = fivePointsService(repo);

export const getEnrollmentHandler = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });

  try {
    const enrollment = await repo.getEnrollment(req.user.id);
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
    return res.json({ progress });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
};