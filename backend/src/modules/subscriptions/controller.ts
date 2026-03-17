// backend/src/modules/subscriptions/controller.ts
// HTTP handlers для підписок — використовує service.ts (getUserSubscriptionInfo)
// Приклад: GET /api/subscriptions/status → { subscription, cooldown }

import type {Response } from 'express';
import { getUserSubscriptionInfo, getUserSubscriptions } from './service.js';
import { AuthenticatedRequest } from '../../types/globalTypes.js';

/** GET /api/subscriptions/status — поточний стан підписки + cooldown */
export async function getSubscriptionStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const data = await getUserSubscriptionInfo(userId);
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
    return res.json({ success: true, subscriptions });
  } catch (err) {
    console.error('❌ listSubscriptions error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}