import { Response, NextFunction } from 'express';
import * as onboardingService from './services.js';
import type { OnboardingStage } from './types.js';
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import { trackEvent } from '../events/service.js';
import { resolveUserState } from '../telegram-mentor/handlers/start.js';
import { resolveCanonicalMessageKeyByTestEvent } from '../../core/state-machine/ctaFoundation.js';

function toJsonPayload(value: unknown): string {
  return JSON.stringify(value);
}

function stageToQuestionIndex(stage: OnboardingStage): number {
  switch (stage) {
    case 'ENTRY':
      return 1
    case 'VISION':
      return 2
    case 'GOAL':
      return 3
    case 'CHOICE':
      return 4
    case 'ACTIONS':
      return 5
    case 'COMPLETED':
      return 6
    case 'SETUP':
    default:
      return 0
  }
}

export async function getProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const progress = await onboardingService.getProgress(userId);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'TEST_OPENED',
      source: 'web',
      state: state ?? 'S0_TRAFFIC',
      payload: {
        entry_point: 'web_onboarding_progress',
        referrer: 'onboarding_progress',
        progress: toJsonPayload(progress),
      },
    })
    await trackEvent({
      userId,
      type: 'MESSAGE_OPENED',
      source: 'web',
      state: state ?? 'S0_TRAFFIC',
      payload: {
        message_key: resolveCanonicalMessageKeyByTestEvent('TEST_OPENED'),
        lifecycle_stage: state ?? 'S0_TRAFFIC',
      },
    })
    res.status(200).json(progress);
  } catch (err: any) {
    console.error('[Onboarding] getProgress error:', err);
    if (err.message === 'User not found') return res.status(404).json({ error: 'User not found' });
    next(err);
  }
}

export async function completeStage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { stage } = req.body;
    if (!stage) return res.status(400).json({ error: 'Stage is required' });

    const progress = await onboardingService.completeStage({ userId, stage });
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_onboarding_stage_completed',
      source: 'web',
      state,
      payload: {
        stage,
      },
    })
    const nextState = stage === 'COMPLETED' ? 'S3_TEST_RESULT' : 'S2_TEST_QUESTIONS'
    const questionIndex = stageToQuestionIndex(stage as OnboardingStage)
    await trackEvent({
      userId,
      type: stage === 'COMPLETED' ? 'TEST_COMPLETED' : 'QUESTION_ANSWERED',
      source: 'web',
      state: stage === 'COMPLETED' ? 'S2_TEST_QUESTIONS' : 'S1_TEST_STARTED',
      payload: {
        question_id: stage,
        question_index: questionIndex,
        answers_count: questionIndex,
        questions_total: 5,
        next_state: nextState,
      },
    })
    await trackEvent({
      userId,
      type: 'MESSAGE_OPENED',
      source: 'web',
      state: stage === 'COMPLETED' ? 'S2_TEST_QUESTIONS' : 'S1_TEST_STARTED',
      payload: {
        message_key: resolveCanonicalMessageKeyByTestEvent(stage === 'COMPLETED' ? 'TEST_COMPLETED' : 'QUESTION_ANSWERED'),
        lifecycle_stage: stage === 'COMPLETED' ? 'S2_TEST_QUESTIONS' : 'S1_TEST_STARTED',
      },
    })
    if (stage === 'COMPLETED') {
      await trackEvent({
        userId,
        type: 'RESULT_OPENED',
        source: 'web',
        state: 'S3_TEST_RESULT',
        payload: {
          result_type: 'onboarding_completion',
        },
      })
      await trackEvent({
        userId,
        type: 'MESSAGE_OPENED',
        source: 'web',
        state: 'S3_TEST_RESULT',
        payload: {
          message_key: resolveCanonicalMessageKeyByTestEvent('RESULT_OPENED'),
          lifecycle_stage: 'S3_TEST_RESULT',
        },
      })
    }
    res.status(200).json(progress);
  } catch (err: any) {
    console.error('[Onboarding] completeStage error:', err);
    if (err.message?.includes('Cannot complete stage')) return res.status(400).json({ error: err.message });
    next(err);
  }
}

export async function updateProgress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { stage } = req.body;
    if (!stage) return res.status(400).json({ error: 'Stage is required' });

    const progress = await onboardingService.updateProgress({ userId, stage });
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_onboarding_progress_updated',
      source: 'web',
      state,
      payload: {
        stage,
      },
    })
    await trackEvent({
      userId,
      type: stage === 'COMPLETED' ? 'TEST_COMPLETED' : 'QUESTION_ANSWERED',
      source: 'web',
      state: stage === 'COMPLETED' ? 'S2_TEST_QUESTIONS' : 'S1_TEST_STARTED',
      payload: {
        question_id: stage,
        question_index: stageToQuestionIndex(stage as OnboardingStage),
        updated_via: 'manual_progress_update',
      },
    })
    await trackEvent({
      userId,
      type: 'MESSAGE_OPENED',
      source: 'web',
      state: stage === 'COMPLETED' ? 'S2_TEST_QUESTIONS' : 'S1_TEST_STARTED',
      payload: {
        message_key: resolveCanonicalMessageKeyByTestEvent(stage === 'COMPLETED' ? 'TEST_COMPLETED' : 'QUESTION_ANSWERED'),
        lifecycle_stage: stage === 'COMPLETED' ? 'S2_TEST_QUESTIONS' : 'S1_TEST_STARTED',
      },
    })
    res.status(200).json(progress);
  } catch (err) {
    console.error('[Onboarding] updateProgress error:', err);
    next(err);
  }
}

export async function canAccessStage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { stage } = req.params;
    const canAccess = await onboardingService.canAccessStage(userId, stage as OnboardingStage);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_onboarding_stage_checked',
      source: 'web',
      state,
      payload: {
        stage,
        canAccess,
      },
    })
    if (!canAccess) {
      await trackEvent({
        userId,
        type: 'TEST_EXITED',
        source: 'web',
        state: 'S2_TEST_QUESTIONS',
        payload: {
          exit_stage: stage,
          exit_reason: 'access_denied',
          last_question_index: stageToQuestionIndex(stage as OnboardingStage),
        },
      })
    }
    res.status(200).json({ stage, canAccess });
  } catch (err) {
    console.error('[Onboarding] canAccessStage error:', err);
    next(err);
  }
}
