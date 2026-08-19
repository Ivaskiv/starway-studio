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
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import { trackEvent } from '../events/service.js';
import { resolveUserState } from '../telegram-mentor/handlers/start.js';

export async function checkTriggers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const trigger = await checkConsultationTriggers(userId);
    const state = await resolveUserState(userId).catch(() => null);
    await trackEvent({
      userId,
      type: 'web_consultation_triggers_checked',
      source: 'web',
      state,
      payload: {
        hasTrigger: Boolean(trigger),
        severity: trigger?.severity ?? null,
      },
    });
    return res.status(200).json(trigger);
  } catch (error: unknown) {
    console.error('[ConsultationController] checkTriggers error:', error);
    next(error);
  }
}

export async function bookConsultation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { scheduledAt, triggerReason } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ error: 'scheduledAt is required' });
    }

    const consultation = await createConsultation(
      userId,
      userId,
      new Date(scheduledAt),
      triggerReason
    );
    const state = await resolveUserState(userId).catch(() => null);
    await trackEvent({
      userId,
      type: 'web_consultation_booked',
      source: 'web',
      state,
      payload: {
        consultationId: consultation.id,
        scheduledAt: consultation.scheduledAt.toISOString(),
        triggerReason: consultation.triggerReason,
      },
    });

    return res.status(200).json(consultation);
  } catch (error: unknown) {
    console.error('[ConsultationController] bookConsultation error:', error);
    next(error);
  }
}

export async function getMyConsultations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const consultations = await getConsultations(userId);
    const state = await resolveUserState(userId).catch(() => null);
    await trackEvent({
      userId,
      type: 'web_consultation_list_viewed',
      source: 'web',
      state,
      payload: {
        count: consultations.length,
      },
    });
    return res.status(200).json(consultations);
  } catch (error: unknown) {
    console.error('[ConsultationController] getMyConsultations error:', error);
    next(error);
  }
}

export async function updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id ?? null;
    const { id } = req.params;
    const { status, notes } = req.body;

    // ✅ Use string literals instead of enum
    const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const consultation = await updateConsultationStatus(id, status, notes);
    const state = userId ? await resolveUserState(userId).catch(() => null) : null;
    await trackEvent({
      userId,
      type: 'web_consultation_status_updated',
      source: 'web',
      state,
      payload: {
        consultationId: consultation.id,
        status: consultation.status,
      },
    });
    return res.status(200).json(consultation);
  } catch (error: unknown) {
    console.error('[ConsultationController] updateStatus error:', error);
    next(error);
  }
}
