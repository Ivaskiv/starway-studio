// backend/src/modules/consultation/controller.ts
/**
 * Consultation Controller
 */

/**
 * Consultation Controller - FIXED
 */

import { Request, Response, NextFunction } from 'express';
import { 
  checkConsultationTriggers, 
  createConsultation, 
  getConsultations, 
  updateConsultationStatus 
} from './service.js';

export async function checkTriggers(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const trigger = await checkConsultationTriggers(userId);
    return res.status(200).json(trigger);
  } catch (error: any) {
    console.error('[ConsultationController] checkTriggers error:', error);
    next(error);
  }
}

export async function bookConsultation(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { scheduledAt, triggerReason } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ error: 'scheduledAt is required' });
    }

    const consultation = await createConsultation(
      userId,
      new Date(scheduledAt),
      triggerReason
    );

    return res.status(200).json(consultation);
  } catch (error: any) {
    console.error('[ConsultationController] bookConsultation error:', error);
    next(error);
  }
}

export async function getMyConsultations(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const consultations = await getConsultations(userId);
    return res.status(200).json(consultations);
  } catch (error: any) {
    console.error('[ConsultationController] getMyConsultations error:', error);
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // ✅ Use string literals instead of enum
    const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const consultation = await updateConsultationStatus(id, status, notes);
    return res.status(200).json(consultation);
  } catch (error: any) {
    console.error('[ConsultationController] updateStatus error:', error);
    next(error);
  }
}