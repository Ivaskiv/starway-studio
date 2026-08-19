import type { Response } from "express"
import type { AuthenticatedRequest } from "../../../types/globalTypes.js"
import { prisma } from "../../../db/client.js"
import { invalidateFunnelStage } from "../../../lib/funnel/getUserFunnelStage.js"
import { trackEvent } from "../../events/service.js"
import { syncLifecycleForUser } from "../../flow-control/service.js"
import { resolveUserState } from "../../telegram-mentor/handlers/start.js"

export async function startSuperadminTrialTestHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const role = String(req.user?.role ?? '').toUpperCase();
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (role !== 'SUPERADMIN') return res.status(403).json({ error: 'forbidden' });

    const now = new Date();
    const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          trialStartsAt: now,
          trialEndsAt: endsAt,
        },
      }),
      prisma.subscription.create({
        data: {
          userId,
          status: 'TRIAL',
          planCode: 'trial',
          startsAt: now,
          trialEndsAt: endsAt,
          autoRenew: false,
        },
      }),
    ]);
    await syncLifecycleForUser(userId);
    await invalidateFunnelStage(userId);

    await trackEvent({
      userId,
      type: 'superadmin_trial_test_started',
      source: 'web',
      state: await resolveUserState(userId).catch(() => null),
      payload: {
        endsAt: endsAt.toISOString(),
      },
    });

    return res.json({ ok: true, trialEndsAt: endsAt.toISOString() });
  } catch (err) {
    console.error('❌ startSuperadminTrialTestHandler error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

export async function activateSuperadminPaymentTestHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const role = String(req.user?.role ?? '').toUpperCase();
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (role !== 'SUPERADMIN') return res.status(403).json({ error: 'forbidden' });

    const planCode = typeof req.body?.planCode === 'string' && req.body.planCode.trim()
      ? req.body.planCode.trim()
      : 'monthly';
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.subscription.create({
      data: {
        userId,
        status: 'ACTIVE',
        planCode,
        startsAt: now,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
      },
    });
    await syncLifecycleForUser(userId);
    await invalidateFunnelStage(userId);

    await trackEvent({
      userId,
      type: 'superadmin_payment_test_activated',
      source: 'web',
      state: await resolveUserState(userId).catch(() => null),
      payload: {
        planCode,
        currentPeriodEnd: periodEnd.toISOString(),
      },
    });

    return res.json({ ok: true, planCode, currentPeriodEnd: periodEnd.toISOString() });
  } catch (err) {
    console.error('❌ activateSuperadminPaymentTestHandler error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
