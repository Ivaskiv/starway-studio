// backend/src/modules/subscriptions/controller.ts
// HTTP handlers для підписок — використовує service.ts (getUserSubscriptionInfo)
// Приклад: GET /api/subscriptions/status → { subscription, cooldown }

import type {Response } from 'express';
import { trackEvent } from '../events/service.js';
import { resolveUserState } from '../telegram-mentor/handlers/start.js';
import { buildPaymentRequest } from './payments/wayforpay.js';
import { getUserSubscriptionInfo, getUserSubscriptions } from './service.js';
import { AuthenticatedRequest } from '../../types/globalTypes.js';
import { prisma } from '../../db/client.js';
import { syncLifecycleForUser } from '../flow-control/service.js';
import { invalidateFunnelStage } from '../../lib/funnel/getUserFunnelStage.js';

const SUBSCRIPTION_PAYMENT_CATALOG: Record<string, { amount: number; label: string }> = {
  monthly: { amount: 299, label: 'Starway Monthly' },
  yearly: { amount: 199, label: 'Starway Yearly' },
  yearly_plus: { amount: 499, label: 'Starway Yearly Plus' },
}

/** GET /api/subscriptions/status — поточний стан підписки + cooldown */
export async function getSubscriptionStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const data = await getUserSubscriptionInfo(userId);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_subscription_status_viewed',
      source: 'web',
      state,
      payload: {
        status: data.subscription?.status ?? null,
      },
    })
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('❌ getSubscriptionStatus error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/** GET /api/subscriptions — всі підписки юзера */
export async function listSubscriptions(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const subscriptions = await getUserSubscriptions(userId);
    const state = await resolveUserState(userId).catch(() => null)
    await trackEvent({
      userId,
      type: 'web_subscriptions_list_viewed',
      source: 'web',
      state,
      payload: {
        count: subscriptions.length,
      },
    })
    return res.json({ success: true, subscriptions });
  } catch (err) {
    console.error('❌ listSubscriptions error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

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

export async function initiateSubscriptionPaymentHandler(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'unauthorized' })

    const planCode = typeof req.body?.planCode === 'string' ? req.body.planCode.trim() : ''
    const plan = SUBSCRIPTION_PAYMENT_CATALOG[planCode]
    if (!plan) return res.status(400).json({ error: 'invalid_plan' })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    const payRef = `subscription_${planCode}_${userId}_${Date.now()}`
    const payment = buildPaymentRequest({
      userId,
      productId: planCode,
      amount: plan.amount,
      currency: 'EUR',
      payRef,
      product_name: [plan.label],
    })

    await trackEvent({
      userId,
      type: 'subscription_payment_initiated',
      source: 'miniapp',
      state: await resolveUserState(userId).catch(() => null),
      payload: {
        planCode,
        amount: plan.amount,
        payRef,
        hasEmail: Boolean(user?.email),
      },
    })

    return res.json({
      ok: true,
      planCode,
      amount: plan.amount,
      paymentUrl: 'https://secure.wayforpay.com/pay',
      payment,
    })
  } catch (err) {
    console.error('❌ initiateSubscriptionPaymentHandler error', err)
    return res.status(500).json({ error: 'server_error' })
  }
}
