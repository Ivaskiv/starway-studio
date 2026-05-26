import { prisma } from '../../../db/client.js';
import { isOnboardingStage, stageIndex } from '../../../modules/onboarding/onboarding.utils.js';
import type { OnboardingStage } from '../../../modules/onboarding/types.js';
import { AuthenticatedRequest } from '../../../types/globalTypes.js';
import type { NextFunction, Response } from 'express';

export function requireOnboardingStage(stage: OnboardingStage) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { currentStep: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentStage: OnboardingStage =
        isOnboardingStage(user.currentStep)
          ? user.currentStep
          : 'ENTRY';

      if (stageIndex(currentStage) < stageIndex(stage)) {
        return res.status(403).json({
          error: `You must complete the ${stage} stage to access this resource`,
        });
      }

      next();
    } catch (err) {
      console.error('[Onboarding Middleware]', err);
      next(err);
    }
  };
}
