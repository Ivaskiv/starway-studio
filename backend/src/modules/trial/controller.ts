// backend/src/modules/trial/controller.ts
/**
 * Trial Controller
 */

import { Response, NextFunction } from 'express';
import { startTrial, generateTrialMirror, getTrialStatus } from './service.js';
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import { trackEvent } from '../events/service.js';
import { getContentAttributionEventPayload } from '../events/contentAttribution.service.js';
import { resolveUserState } from '../telegram-mentor/handlers/start.js';
import { prisma } from '../../db/client.js'

export async function startTrialHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await startTrial(userId);
    const state = await resolveUserState(userId).catch(() => null)
    const attributionPayload = await getContentAttributionEventPayload(userId)
    await trackEvent({
      userId,
      type: 'web_trial_started',
      source: 'web',
      state,
      payload: {
        currentState: user.currentState ?? null,
        currentStep: user.currentStep ?? null,
        ...(attributionPayload ?? {}),
      },
    })
    return res.status(200).json(user);
  } catch (error: any) {
    if (error instanceof Error && error.message === 'EMAIL_REQUIRED') {
      return res.status(400).json({ error: 'EMAIL_REQUIRED' });
    }
    if (error instanceof Error && error.message === 'SUBSCRIPTION_REQUIRED') {
      return res.status(403).json({ error: 'Потрібна активна підписка для запуску тріалу' });
    }
    if (error instanceof Error && error.message === 'TRIAL_ALREADY_USED') {
      return res.status(409).json({ error: 'Тріал вже був використаний' });
    }
    console.error('[TrialController] startTrial error:', error);
    next(error);
  }
}

export async function getTrialStatusHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const status = await getTrialStatus(userId)

    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_trial_status_viewed',
      source: 'web',
      state,
      payload: {
        active: status.isActive,
        daysLeft: status.daysLeft,
        onboardingCompleted: status.onboardingCompleted,
        dailyCycleStarted: status.dailyCycleStarted,
      },
    })
    return res.status(200).json({
      isActive: status.isActive,
      daysUsed: status.daysUsed,
      daysTotal: status.daysTotal,
      onboardingCompleted: status.onboardingCompleted,
      dailyCycleStarted: status.dailyCycleStarted,
      userId: status.userId,
      isPaid: status.isPaid,
      startedAt: status.startedAt ? status.startedAt.toISOString() : null,
      endsAt: status.endsAt ? status.endsAt.toISOString() : null,
      daysLeft: status.daysLeft,
      currentDay: status.currentDay,
      totalDays: status.daysTotal,
      onboardingDay: status.daysUsed,
      progress: status.progress,
      status: status.status,
      hasDay4Mirror: status.hasDay4Mirror,
      hasDay7Mirror: status.hasDay7Mirror,
    });
  } catch (error: any) {
    console.error('[TrialController] getStatus error:', error);
    next(error);
  }
}

export async function generateMirrorHandler(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { day } = req.body;
    if (!day || ![4, 7].includes(day)) {
      return res.status(400).json({ error: 'Day must be 4 or 7' });
    }

    const analysis = await generateTrialMirror(userId, day);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_trial_mirror_generated',
      source: 'web',
      state,
      payload: {
        day,
      },
    })
    return res.status(200).json({ analysis });
  } catch (error: any) {
    console.error('[TrialController] generateMirror error:', error);
    next(error);
  }
}
